import {BookOpen,ArrowRight,Search,NotebookPen,LibraryBig} from 'lucide-react'
import './Reading.css'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../App'
import { supabase } from '../lib/supabase'
import { createEntry, listEntriesForBook, formatEntryNum } from '../lib/entries'
import { stanceClass } from '../lib/stance'
import DigitalBookReader from '../components/DigitalBookReader'

const statusLabel = value => ({'in-progress':'Reading',read:'Completed',unread:'To Read',reference:'Reference',paused:'Paused'}[value] || 'To Read')
function Cover({book}) { return <div className="reading-cover">{book.cover_url ? <img src={book.cover_url} alt="" loading="lazy"/> : <><BookOpen aria-hidden="true"/><span>{book.title}</span></>}</div> }

const STANCES = [
  { value: '', label: 'No stance' },
  { value: 'agree', label: 'Agree' },
  { value: 'disagree', label: 'Disagree' },
  { value: 'unsure', label: 'Unsure' },
]

export default function Reading() {
  const user = useAuth()
  const navigate = useNavigate()
  const { bookId } = useParams()

  const [candidates, setCandidates] = useState(null)
  const [book, setBook] = useState(null) // null = loading, false = not found
  const [notes, setNotes] = useState(null)

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [ref, setRef] = useState('')
  const [stance, setStance] = useState('')
  const [saving, setSaving] = useState(false)
  const [query,setQuery] = useState('')
  const [filter,setFilter] = useState('all')

  useEffect(() => {
    if (bookId) return
    supabase
      .from('books')
      .select('id, title, author, cover_url, reading_status')
      .eq('user_id', user.id)
      .order('title')
      .then(({ data }) => setCandidates(data || []))
  }, [bookId, user.id])

  useEffect(() => {
    if (!bookId) return
    let cancelled = false
    setBook(null)
    setNotes(null)
    supabase
      .from('books')
      .select('*')
      .eq('id', bookId)
      .single()
      .then(async ({ data }) => {
        if (cancelled) return
        // Opening a session on a book directly (e.g. from Book Detail) should
        // mark it in-progress the same way starting one from the picker does.
        if (data && data.reading_status !== 'in-progress') {
          await supabase.from('books').update({ reading_status: 'in-progress' }).eq('id', bookId)
          data.reading_status = 'in-progress'
        }
        if (!cancelled) setBook(data || false)
      })
    listEntriesForBook(user.id, bookId).then((rows) => {
      if (!cancelled) setNotes(rows)
    })
    return () => {
      cancelled = true
    }
  }, [bookId, user.id])

  async function handleStart(b) {
    if (b.reading_status !== 'in-progress') {
      await supabase.from('books').update({ reading_status: 'in-progress' }).eq('id', b.id)
    }
    navigate(`/reading/${b.id}`)
  }

  async function handleMarkRead() {
    const { error } = await supabase.from('books').update({ reading_status: 'read' }).eq('id', book.id)
    if (!error) setBook({ ...book, reading_status: 'read' })
  }

  async function handleAddNote(e) {
    e.preventDefault()
    if (!body.trim()) return
    setSaving(true)
    try {
      const entry = await createEntry(user.id, {
        title: title.trim() || null,
        body: body.trim(),
        ref: ref.trim() || null,
        tags: [],
        shelf_book_id: book.id,
        stance: stance || null,
      })
      setNotes((prev) => [entry, ...(prev || [])])
      setTitle('')
      setBody('')
      setRef('')
      setStance('')
    } catch (err) {
      alert('Error saving note: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // Keep the existing session and note flows; the dashboard helps choose a book.
  if (!bookId) {
    const all=candidates || []
    const inProgress=all.filter(b=>b.reading_status==='in-progress')
    const matching=all.filter(b=>(filter==='all'||statusLabel(b.reading_status)===filter)&&`${b.title} ${b.author||''}`.toLowerCase().includes(query.trim().toLowerCase()))
    return <div className="page reading-page">
      <header className="reading-heading"><div><p className="reading-eyebrow">Your reading life</p><h1>Reading Now</h1><p>Read thoughtfully. Capture insight. Grow in understanding.</p></div><Link to="/shelf" className="btn btn-secondary"><LibraryBig size={17}/>My Library</Link></header>
      <section className="reading-banner"><div><BookOpen aria-hidden="true" size={32}/><h2>Make room for a good book.</h2><p>Pick up where you left off, with a place to gather your thoughts as you read.</p></div><div className="reading-counts"><div><strong>{candidates===null?'—':inProgress.length}</strong><span>Currently reading</span></div><div><strong>{candidates===null?'—':all.filter(b=>b.reading_status==='read').length}</strong><span>Completed</span></div></div></section>
      {candidates===null?<p role="status" className="card">Loading your reading list…</p>:!all.length?<section className="card reading-empty"><LibraryBig size={32}/><h2>Your next chapter starts here</h2><p>Add a book to your Library to begin reading and collecting notes.</p><Link to="/shelf/add" className="btn btn-primary">Add your first book</Link></section>:<>
      <section className="reading-continue"><div className="reading-section-title"><h2>Continue reading</h2><span>{inProgress.length} {inProgress.length===1?'book':'books'}</span></div>{inProgress.length?<div className="reading-book-grid">{inProgress.map(b=><article className="card reading-book-card" key={b.id}><Cover book={b}/><div><span className="reading-status">Reading</span><h3>{b.title}</h3><p>{b.author}</p><button className="btn btn-primary" onClick={()=>handleStart(b)}>Continue <ArrowRight size={16}/></button><Link className="reading-details" to={`/shelf/${b.id}`}>Book details</Link></div></article>)}</div>:<div className="card reading-empty"><BookOpen size={28}/><h3>Choose something to read</h3><p>Start a session from your Library below. Your current books will appear here.</p></div>}</section>
      <section className="reading-browse"><div className="reading-section-title"><h2>Find your next read</h2><Link to="/shelf/add">Add books →</Link></div><div className="reading-toolbar"><label className="reading-search"><Search size={18} aria-hidden="true"/><input type="search" aria-label="Search reading list" placeholder="Search by title or author…" value={query} onChange={e=>setQuery(e.target.value)}/></label><label>Show<select className="input" value={filter} onChange={e=>setFilter(e.target.value)}>{['all','Reading','To Read','Completed','Reference','Paused'].map(v=><option key={v} value={v}>{v==='all'?'All books':v}</option>)}</select></label></div><p className="card-meta" role="status">{matching.length} {matching.length===1?'book':'books'}</p><div className="reading-library-list">{matching.map(b=><article key={b.id} className="reading-library-row"><Cover book={b}/><div><h3><Link to={`/shelf/${b.id}`}>{b.title}</Link></h3><p>{b.author}</p><span className="reading-status">{statusLabel(b.reading_status)}</span></div><button className="btn btn-secondary" onClick={()=>handleStart(b)}>{b.reading_status==='in-progress'?'Continue':'Start reading'}<ArrowRight size={16}/></button></article>)}</div>{!matching.length&&<div className="card reading-empty"><h3>No matching books</h3><p>Try a different title, author, or reading status.</p><button className="btn btn-secondary" onClick={()=>{setQuery('');setFilter('all')}}>Clear filters</button></div>}</section>
      </>}
    </div>
  }

  if (book === null) {
    return (
      <div className="max-w-[1180px] mx-auto text-center py-24 page" style={{ opacity: 0.5 }}>
        Loading…
      </div>
    )
  }
  if (book === false) {
    return (
      <div className="page reading-page reading-session">
        <p>Book not found.</p>
        <Link to="/reading" className="btn btn-secondary">
          ← Reading now
        </Link>
      </div>
    )
  }

  return (
    <div className="page reading-page reading-session">
      <div className="card-meta mb-3">
        <Link to="/reading" className="hover:underline">
          Reading now
        </Link>{' '}
        / {book.title}
      </div>

      <DigitalBookReader key={book.id} bookId={book.id} userId={user.id}/>
      <div className="reading-session-grid">
        {/* Book */}
        <aside className="card reading-session-book">
          <Cover book={book}/>
          <h3 className="mt-3 !mb-1">{book.title}</h3>
          <div className="card-meta mb-3">{book.author}</div>
          <div className="flex gap-1.5 flex-wrap mb-4">
            <span className="tag tag-neutral">{statusLabel(book.reading_status)}</span>
            {book.tradition && <span className="tag tag-neutral">{book.tradition}</span>}
          </div>
          <div className="flex flex-col gap-2 items-start">
            {book.reading_status !== 'read' && (
              <button type="button" className="btn btn-secondary" onClick={handleMarkRead}>
                Mark as read
              </button>
            )}
            <Link to={`/shelf/${book.id}`} className="btn btn-ghost !px-0">
              Full book details →
            </Link>
          </div>
        </aside>

        {/* Note stream */}
        <div>
          <header className="reading-session-title"><NotebookPen size={25}/><div><h1>Reading notes</h1><p>Capture a thought, a question, or a passage to revisit.</p></div></header>

          <form id="reading-note" onSubmit={handleAddNote} className="card mb-5" style={{ padding: '16px 18px' }}>
            <textarea
              className="input !border-none !bg-transparent !px-0"
              style={{ fontSize: 15.5, lineHeight: 1.6, minHeight: 80 }}
              aria-label="Reading note"
              placeholder="What are you noticing as you read?"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
            />
            <div className="flex gap-2 flex-wrap items-end mt-2">
              <div className="field" style={{ minWidth: 160 }}>
                <label htmlFor="rd-title">Title (optional)</label>
                <input id="rd-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="field" style={{ minWidth: 140 }}>
                <label htmlFor="rd-ref">Scripture ref</label>
                <input id="rd-ref" className="input" value={ref} onChange={(e) => setRef(e.target.value)} />
              </div>
              <div className="field" style={{ minWidth: 130 }}>
                <label htmlFor="rd-stance">Stance</label>
                <select id="rd-stance" className="input" value={stance} onChange={(e) => setStance(e.target.value)}>
                  {STANCES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving || !body.trim()}>
                {saving ? 'Adding…' : 'Add note'}
              </button>
            </div>
          </form>

          <div className="reading-section-title"><h2>Your note stream</h2><span>{notes ? `${notes.length} notes` : ''}</span></div>
          {notes === null ? (
            <div className="text-center py-12" style={{ opacity: 0.5 }}>
              Loading…
            </div>
          ) : notes.length === 0 ? (
            <p style={{ opacity: 0.5 }}>No notes yet — jot the first one above.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {notes.map((n) => (
                <Link key={n.id} to={`/notebook/${n.id}`} className="card hover:shadow-sm" style={{ padding: '14px 16px' }}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="card-meta">
                      no. {formatEntryNum(n.number)} · {new Date(n.created_at).toLocaleString()}
                    </div>
                    {n.stance && <span className={`tag ${stanceClass(n.stance)}`}>{n.stance}</span>}
                  </div>
                  {n.title && <div className="card-title !text-[14px] mb-0.5">{n.title}</div>}
                  {n.ref && <div className="card-meta mb-1">{n.ref}</div>}
                  <p className="card-body">{n.body}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
