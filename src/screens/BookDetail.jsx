import { CreationAssessment } from '../components/DoctrineChrome'
import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AssessmentBadge from '../components/AssessmentBadge'
import BookCover from '../components/BookCover'
import { primaryCategory, readingStatus } from '../lib/libraryPresentation'
import { parseReference } from '../lib/bsb'
import { assessSubject, checksInsert, mapAssessmentToRow } from '../lib/theologyCheck'
import ChangeCoverDialog from '../components/ChangeCoverDialog'

const STATUSES = ['unread', 'in-progress', 'read']

const TABS = [['overview','Overview'],['notes','My Notes'],['highlights','Highlights'],['scripture','Related Scripture'],['doctrine','Doctrine Check'],['details','Details']]

function scriptureUrl(reference) {
  const parsed = parseReference(reference)
  if (!parsed) return null
  const query = new URLSearchParams({book:parsed.book,chapter:String(parsed.chapter)})
  if (parsed.verseStart) query.set('verse',String(parsed.verseStart))
  if (parsed.verseEnd) query.set('verseEnd',String(parsed.verseEnd))
  return `/bible?${query}`
}

export default function BookDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const tab = TABS.some(([key]) => key === params.get('tab')) ? params.get('tab') : 'overview'
  const libraryFrom = typeof location.state?.libraryFrom === 'string' && /^\/shelf(?:\?|$)/.test(location.state.libraryFrom) ? location.state.libraryFrom : '/shelf'
  function chooseTab(key) { const next = new URLSearchParams(params); next.set('tab',key); setParams(next,{replace:true,state:location.state}) }


  const [book, setBook] = useState(null) // null = loading, false = not found
  const [check, setCheck] = useState(null) // null = not loaded/none
  const [notes, setNotes] = useState([])
  const [loadError, setLoadError] = useState('')
  const [contextError, setContextError] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [checking, setChecking] = useState(false)
  const [showCoverPicker, setShowCoverPicker] = useState(false)

  const load = useCallback(async () => {
    setLoadError('')
    const { data, error } = await supabase.from('books').select('*').eq('id', id).single()
    if (error) { setLoadError('This book could not be loaded. Please try again.'); return }
    setBook(data || false)
    if (data) {
      setForm({
        title: data.title || '',
        author: data.author || '',
        isbn: data.isbn || '',
        publisher: data.publisher || '',
        pub_date: data.pub_date || '',
        pages: data.pages != null ? String(data.pages) : '',
        cover_url: data.cover_url || '',
        description: data.description || '',
        rating: data.rating != null ? String(data.rating) : '',
        tradition: data.tradition || '',
        reading_status: data.reading_status || 'unread',
        location: data.location || '',
        notes: data.notes || '',
        tags: (data.tags || []).join(', '),
      })
      const [checkResult, noteResult] = await Promise.all([
        data.isbn ? supabase.from('theology_checks').select('*').eq('isbn',data.isbn).eq('kind','book').order('created_at',{ascending:false}).limit(1).maybeSingle() : Promise.resolve({data:null}),
        supabase.from('entries').select('id, title, body, ref, created_at').eq('shelf_book_id',id).order('created_at',{ascending:false}),
      ])
      setContextError(!!(checkResult.error || noteResult.error))
      setCheck(checkResult.data || null)
      setNotes(noteResult.data || [])
    }
  },[id])

  useEffect(() => { void load() },[load])

  async function handleQuickStatus(status) {
    const { error } = await supabase.from('books').update({ reading_status: status }).eq('id', id)
    if (error) alert('Error saving status: ' + error.message)
    else setBook((prev) => ({ ...prev, reading_status: status }))
  }

  async function handleSave() {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('books')
        .update({
          title: form.title.trim(),
          author: form.author.trim() || null,
          isbn: form.isbn.trim() || null,
          publisher: form.publisher.trim() || null,
          pub_date: form.pub_date.trim() || null,
          pages: form.pages.trim() ? parseInt(form.pages, 10) : null,
          cover_url: form.cover_url.trim() || null,
          description: form.description.trim() || null,
          rating: form.rating ? parseInt(form.rating, 10) : null,
          tradition: form.tradition.trim() || null,
          reading_status: form.reading_status,
          location: form.location.trim() || null,
          notes: form.notes.trim() || null,
          tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        })
        .eq('id', id)
      if (error) throw error
      await load()
      setEditing(false)
    } catch (err) {
      alert('Error saving: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`Remove "${book.title}" from your shelf?`)) return
    const { error } = await supabase.from('books').delete().eq('id', id)
    if (error) {
      alert('Error deleting: ' + error.message)
      return
    }
    navigate(libraryFrom)
  }

  async function handleCheck() {
    setChecking(true)
    try {
      const assessment = await assessSubject({ kind: 'book', title: book.title, authors: book.author, isbn: book.isbn })
      const checkId = crypto.randomUUID()
      const { error } = await checksInsert({
        id: checkId,
        kind: 'book',
        isbn: book.isbn,
        title: book.title,
        authors: book.author,
        cover_url: book.cover_url,
        tags: [],
        is_wishlist: false,
        followups: [],
        confession_comparisons: {},
        created_at: new Date().toISOString(),
        ...mapAssessmentToRow(assessment),
      })
      if (error) throw new Error(error)
      navigate(`/checks/${checkId}`)
    } catch (err) {
      alert('Could not run check: ' + err.message)
    } finally {
      setChecking(false)
    }
  }

  if (loadError) return <div className="page"><div className="card" role="alert"><p>{loadError}</p><button className="btn btn-secondary self-start" onClick={load}>Retry</button><Link to={libraryFrom}>Back to Library</Link></div></div>
  if (book === null) {
    return (
      <div className="max-w-[1080px] mx-auto text-center py-24 page" style={{ opacity: 0.5 }}>
        Loading…
      </div>
    )
  }
  if (book === false) {
    return (
      <div className="max-w-[1080px] mx-auto page">
        <p>Book not found.</p>
        <Link to="/shelf" className="btn btn-secondary">
          ← My Library
        </Link>
      </div>
    )
  }


  return (
    <div className="page book-detail-page">
      <nav aria-label="Breadcrumb" className="font-ui text-sm mb-6"><Link to={libraryFrom} className="underline">Library</Link><span aria-hidden="true"> / </span><span>{book.title}</span></nav>
      <header className="book-identity mb-6">
        <BookCover book={book} />
        <div className="min-w-0">
          <p className="card-kicker">{primaryCategory(book)}</p>
          <h1>{book.title}</h1>
          <p className="text-muted">{book.author || 'Unknown author'}</p>
          <div className="mb-3">{contextError ? <p className="card-meta">Assessment information unavailable</p> : <AssessmentBadge assessment={check} title={book.title} unassessedTo={`/shelf/${book.id}?tab=doctrine`} state={location.state} />}</div>
          <p className="font-ui text-sm text-muted">{readingStatus(book)} · Progress <span aria-label="Progress not recorded">—</span></p>
          <div className="flex gap-2 flex-wrap">
            <Link to={`/reading/${book.id}`} className="btn btn-primary">{book.reading_status === 'in-progress' ? 'Continue reading session' : 'Start reading session'}</Link>
            <Link to={`/reading/${book.id}#reading-note`} className="btn btn-secondary">Add note</Link>
            {!editing && <button className="btn btn-secondary" onClick={()=>setEditing(true)}>Edit metadata</button>}
          </div>
        </div>
      </header>
      {contextError && <div className="card mb-4" role="alert"><p>Some notes or assessment information could not be loaded.</p><button className="btn btn-secondary self-start" onClick={load}>Retry</button></div>}
      {editing ? (
            <div className="card mb-5" style={{ padding: '18px 20px' }}>
              <input
                className="input !border-none !bg-transparent !text-[23px] font-heading !px-0 mb-1"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                aria-label="Title"
                placeholder="Title"
                required
              />
              <input
                className="input !border-none !bg-transparent !px-0 mb-3"
                value={form.author}
                onChange={(e) => setForm({ ...form, author: e.target.value })}
                aria-label="Author"
                placeholder="Author"
              />

              <div className="flex gap-3 flex-wrap mb-3">
                <div className="field" style={{ minWidth: 160 }}>
                  <label htmlFor="book-isbn">ISBN</label>
                  <input id="book-isbn" className="input" value={form.isbn} onChange={(e) => setForm({ ...form, isbn: e.target.value })} />
                </div>
                <div className="field" style={{ minWidth: 180 }}>
                  <label htmlFor="book-publisher">Publisher</label>
                  <input id="book-publisher" className="input" value={form.publisher} onChange={(e) => setForm({ ...form, publisher: e.target.value })} />
                </div>
                <div className="field" style={{ minWidth: 130 }}>
                  <label htmlFor="book-published">Published</label>
                  <input id="book-published" className="input" value={form.pub_date} onChange={(e) => setForm({ ...form, pub_date: e.target.value })} />
                </div>
                <div className="field" style={{ minWidth: 90 }}>
                  <label htmlFor="book-pages">Pages</label>
                  <input id="book-pages"
                    className="input"
                    type="number"
                    min="0"
                    value={form.pages}
                    onChange={(e) => setForm({ ...form, pages: e.target.value })}
                  />
                </div>
              </div>

              <div className="field mb-3">
                <label htmlFor="book-cover-image-url">Cover image URL</label>
                <div className="flex gap-2 flex-wrap">
                  <input id="book-cover-image-url"
                    className="input flex-1"
                    value={form.cover_url}
                    onChange={(e) => setForm({ ...form, cover_url: e.target.value })}
                    placeholder="https://…"
                  />
                  <button type="button" className="btn btn-secondary shrink-0" onClick={() => setShowCoverPicker(true)}>
                    Change cover
                  </button>
                </div>
              </div>

              <div className="field mb-3">
                <label htmlFor="book-summary">Summary</label>
                <textarea id="book-summary" className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>

              <div className="flex gap-3 flex-wrap mb-3">
                <div className="field" style={{ minWidth: 180 }}>
                  <label htmlFor="book-tradition">Tradition</label>
                  <input id="book-tradition" className="input" value={form.tradition} onChange={(e) => setForm({ ...form, tradition: e.target.value })} />
                </div>
                <div className="field" style={{ minWidth: 160 }}>
                  <label htmlFor="book-status">Status</label>
                  <select id="book-status" className="input" value={form.reading_status} onChange={(e) => setForm({ ...form, reading_status: e.target.value })}>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {readingStatus({reading_status:s})}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field" style={{ minWidth: 160 }}>
                  <label htmlFor="book-location">Location</label>
                  <input id="book-location" className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                </div>
                <div className="field" style={{ minWidth: 130 }}>
                  <label htmlFor="book-rating">Rating</label>
                  <select id="book-rating" className="input" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })}>
                    <option value="">No rating</option>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n} star{n === 1 ? '' : 's'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field" style={{ minWidth: 200 }}>
                  <label htmlFor="book-tags">Tags</label>
                  <input id="book-tags" className="input" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
                </div>
              </div>

              <div className="field mb-3">
                <label htmlFor="book-your-notes">Your notes</label>
                <textarea id="book-your-notes" className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>

              <div className="flex gap-2 flex-wrap">
                <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving || !form.title.trim()}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => { setEditing(false); void load() }}>
                  Cancel
                </button>
              </div>
            </div>
      ) : <>
        <nav className="book-tabs" aria-label="Book sections">{TABS.map(([key,label])=><button type="button" key={key} aria-current={tab===key ? 'page':undefined} onClick={()=>chooseTab(key)}>{label}</button>)}</nav>
        <section className="card book-section" aria-label={TABS.find(([key])=>key===tab)[1]}>
          {tab==='overview' && <><h2>Overview</h2><p className="whitespace-pre-wrap reading-prose">{book.description || 'No summary has been added for this book.'}</p><div className="flex gap-2 flex-wrap">{(book.tags || []).map(tag=><span className="tag tag-neutral" key={tag}>{tag}</span>)}</div><div className="flex gap-2 flex-wrap mt-4">{book.reading_status!=='in-progress' && <button className="btn btn-secondary" onClick={()=>handleQuickStatus('in-progress')}>Mark as Reading</button>}{book.reading_status==='in-progress' && <button className="btn btn-secondary" onClick={()=>handleQuickStatus('read')}>Mark as Completed</button>}</div></>}
          {tab==='notes' && <><h2>My Notes</h2>{book.notes && <p className="reading-prose whitespace-pre-wrap">{book.notes}</p>}{notes.map(note=><Link key={note.id} to={`/notebook/${note.id}`} className="card"><h3 className="card-title">{note.title || 'Untitled note'}</h3><p className="card-body">{note.body?.slice(0,240)}</p></Link>)}{!notes.length && !book.notes && <p>No notes linked to this book yet.</p>}<Link to={`/reading/${book.id}#reading-note`} className="btn btn-secondary self-start">Add a reading note</Link></>}
          {tab==='highlights' && <><h2>Highlights</h2><p>Dedicated highlights are not available yet. You can save an excerpt in a reading note.</p><Link to={`/reading/${book.id}#reading-note`} className="btn btn-secondary self-start">Save an excerpt as a note</Link></>}
          {tab==='scripture' && <><h2>Related Scripture</h2><p className="text-muted">References from your linked reading notes.</p>{notes.filter(note=>note.ref).map(note=><div key={note.id} className="flex flex-col gap-2 py-3">{scriptureUrl(note.ref) ? <Link to={scriptureUrl(note.ref)} className="underline">{note.ref}</Link> : <span>{note.ref}</span>}<Link to={`/notebook/${note.id}`} className="font-ui text-sm underline">From {note.title || 'Untitled note'}</Link></div>)}{!notes.some(note=>note.ref) && <p>No Scripture references have been linked through your notes yet.</p>}</>}
          {tab==='doctrine' && <><h2>Doctrine Check</h2><p className="reading-prose">This is an AI-generated assessment. Scripture and the leading of the Holy Spirit are the final authority.</p>{check ? <><AssessmentBadge assessment={check} title={book.title} state={location.state} /><p className="reading-prose">{check.summary}</p><CreationAssessment value={check.creation_view}/><Link to={`/checks/${check.id}`} className="btn btn-secondary self-start">Read the full assessment</Link>{check.created_at && <p className="card-meta">Assessed {new Date(check.created_at).toLocaleDateString()}</p>}</> : contextError ? <p>Retry loading assessment information before running another check.</p> : <><p>This book has not been assessed.</p><button className="btn btn-secondary self-start" onClick={handleCheck} disabled={checking}>{checking ? 'Checking…':'Check this book'}</button></>}</>}
          {tab==='details' && <><h2>Details</h2><dl className="book-facts">{[['Publisher',book.publisher],['Published',book.pub_date],['ISBN',book.isbn],['Pages',book.pages],['Category',primaryCategory(book)],['Tradition',book.tradition],['Location',book.location],['Date Added',book.created_at ? new Date(book.created_at).toLocaleDateString() : null]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value ?? '—'}</dd></div>)}</dl><button className="btn btn-secondary self-start mt-4" onClick={()=>setEditing(true)}>Edit metadata</button><button className="btn btn-ghost self-start" onClick={handleDelete}>Remove from Library</button></>}
        </section>
      </>}
      {showCoverPicker && <ChangeCoverDialog isbn={form.isbn.trim()} currentUrl={form.cover_url} onSelect={url=>{setForm({...form,cover_url:url});setShowCoverPicker(false)}} onClose={()=>setShowCoverPicker(false)} />}
    </div>
  )
}
