import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { verdictClass, verdictIcon } from '../lib/verdict'
import { assessSubject, checksInsert, mapAssessmentToRow } from '../lib/theologyCheck'

const STATUSES = ['unread', 'in-progress', 'read']

export default function BookDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [book, setBook] = useState(null) // null = loading, false = not found
  const [check, setCheck] = useState(null) // null = not loaded/none
  const [noteCount, setNoteCount] = useState(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [checking, setChecking] = useState(false)

  async function load() {
    const { data } = await supabase.from('books').select('*').eq('id', id).single()
    setBook(data || false)
    if (data) {
      setForm({
        tradition: data.tradition || '',
        reading_status: data.reading_status || 'unread',
        location: data.location || '',
        notes: data.notes || '',
        tags: (data.tags || []).join(', '),
      })
      if (data.isbn) {
        const { data: c } = await supabase.from('theology_checks').select('*').eq('isbn', data.isbn).eq('kind', 'book').maybeSingle()
        setCheck(c || null)
      }
      const { count } = await supabase.from('entries').select('id', { count: 'exact', head: true }).eq('shelf_book_id', id)
      setNoteCount(count ?? 0)
    }
  }

  useEffect(() => {
    load()
  }, [id])

  async function handleSave() {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('books')
        .update({
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
    navigate('/shelf')
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
          ← Shelf
        </Link>
      </div>
    )
  }

  const VerdictIcon = check ? verdictIcon(check.verdict) : null

  return (
    <div className="max-w-[1080px] mx-auto page">
      <div className="flex items-center justify-between mb-4">
        <div className="card-meta">
          <Link to="/shelf" className="hover:underline">
            Shelf
          </Link>{' '}
          / {book.title}
        </div>
        <div className="flex gap-2">
          {!editing && (
            <button type="button" className="btn btn-secondary" onClick={() => setEditing(true)}>
              Edit
            </button>
          )}
          <button type="button" className="btn btn-ghost" style={{ color: 'var(--color-accent-700)' }} onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:gap-9 grid-cols-1 md:grid-cols-[160px_1fr]">
        <div className="rounded-sm overflow-hidden bg-neutral-200 shrink-0" style={{ width: 160, aspectRatio: '2/3' }}>
          {book.cover_url && <img src={book.cover_url} alt="" className="w-full h-full object-cover" />}
        </div>

        <div>
          <h2 className="!mb-1">{book.title}</h2>
          <div className="card-meta mb-1">{book.author}</div>
          <div className="card-meta mb-4">
            {[book.publisher, book.pub_date, book.pages ? `${book.pages} pages` : null, book.isbn].filter(Boolean).join(' · ')}
          </div>

          {editing ? (
            <div className="card" style={{ padding: '18px 20px' }}>
              <div className="flex gap-3 flex-wrap mb-3">
                <div className="field" style={{ minWidth: 180 }}>
                  <label>Tradition</label>
                  <input className="input" value={form.tradition} onChange={(e) => setForm({ ...form, tradition: e.target.value })} />
                </div>
                <div className="field" style={{ minWidth: 160 }}>
                  <label>Status</label>
                  <select className="input" value={form.reading_status} onChange={(e) => setForm({ ...form, reading_status: e.target.value })}>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field" style={{ minWidth: 160 }}>
                  <label>Location</label>
                  <input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                </div>
                <div className="field" style={{ minWidth: 200 }}>
                  <label>Tags</label>
                  <input className="input" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
                </div>
              </div>
              <div className="field mb-3">
                <label>Notes</label>
                <textarea className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex gap-2 flex-wrap mb-3">
                {book.tradition && <span className="tag tag-neutral">{book.tradition}</span>}
                <span className="tag tag-neutral">{book.reading_status || 'unread'}</span>
                {book.location && <span className="tag tag-neutral">{book.location}</span>}
                {(book.tags || []).map((t) => (
                  <span key={t} className="tag tag-neutral">
                    {t}
                  </span>
                ))}
              </div>
              {book.notes && <p style={{ fontSize: 15, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{book.notes}</p>}
            </>
          )}

          <div className="card mt-5" style={{ padding: '18px 20px' }}>
            <div className="card-kicker mb-2">Reading</div>
            <div className="flex items-center gap-3 flex-wrap">
              <Link to={`/reading/${book.id}`} className="btn btn-secondary">
                {book.reading_status === 'unread' ? 'Start reading session →' : 'Continue reading session →'}
              </Link>
              {noteCount > 0 && (
                <span className="card-meta">
                  {noteCount} note{noteCount === 1 ? '' : 's'} so far
                </span>
              )}
            </div>
          </div>

          <div className="card mt-5" style={{ padding: '18px 20px' }}>
            <div className="card-kicker mb-2">Doctrine Check</div>
            {check ? (
              <Link to={`/checks/${check.id}`} className="flex items-center gap-2">
                <span className={`tag ${verdictClass(check.verdict)} flex items-center gap-1 w-fit`}>
                  <VerdictIcon size={12} strokeWidth={2.75} />
                  {check.verdict || 'Unable to Assess'}
                </span>
                <span className="text-sm hover:underline">Full report →</span>
              </Link>
            ) : (
              <button type="button" className="btn btn-secondary" onClick={handleCheck} disabled={checking}>
                {checking ? 'Checking…' : 'Check this book'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
