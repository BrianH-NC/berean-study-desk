import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../App'
import { supabase } from '../lib/supabase'
import { createEntry, listEntriesForBook, formatEntryNum } from '../lib/entries'
import { stanceClass } from '../lib/stance'

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

  // Picker: no book chosen yet
  if (!bookId) {
    const inProgress = (candidates || []).filter((b) => b.reading_status === 'in-progress')
    const others = (candidates || []).filter((b) => b.reading_status !== 'in-progress')

    return (
      <div className="max-w-[900px] mx-auto page">
        <h2 className="!mb-1">Reading now</h2>
        <p className="card-meta mb-5">Pick a book to start a focused session — a running note stream sits right beside it.</p>

        {candidates === null ? (
          <div className="text-center py-16" style={{ opacity: 0.5 }}>
            Loading…
          </div>
        ) : candidates.length === 0 ? (
          <div className="text-center py-16" style={{ opacity: 0.5 }}>
            No books in your library yet.{' '}
            <Link to="/shelf/add" className="hover:underline">
              Add one
            </Link>{' '}
            to start a reading session.
          </div>
        ) : (
          <>
            {inProgress.length > 0 && (
              <div className="mb-6">
                <div className="card-kicker mb-2">Continue reading</div>
                <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
                  {inProgress.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      className="card !flex-row items-center gap-3 text-left hover:shadow-sm"
                      style={{ padding: '12px 16px' }}
                      onClick={() => handleStart(b)}
                    >
                      <div className="rounded-sm shrink-0 overflow-hidden bg-neutral-200" style={{ width: 40, height: 60 }}>
                        {b.cover_url && <img src={b.cover_url} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div>
                        <div className="card-title !text-[14px]">{b.title}</div>
                        <div className="card-meta">{b.author}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="card-kicker mb-2">Or start something else</div>
              <div className="flex flex-col">
                {others.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    className="flex items-center gap-2.5 py-2 w-full text-left hover:bg-black/[0.02]"
                    style={{ borderBottom: '1px solid var(--color-divider)' }}
                    onClick={() => handleStart(b)}
                  >
                    <div className="rounded-sm shrink-0 overflow-hidden bg-neutral-200" style={{ width: 26, height: 39 }}>
                      {b.cover_url && <img src={b.cover_url} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1">
                      <div className="card-title !text-[14px]">{b.title}</div>
                      <div className="card-meta">{b.author}</div>
                    </div>
                    <span style={{ opacity: 0.4, fontSize: 12 }}>{b.reading_status}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    )
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
      <div className="max-w-[1180px] mx-auto page">
        <p>Book not found.</p>
        <Link to="/reading" className="btn btn-secondary">
          ← Reading now
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-[1180px] mx-auto page">
      <div className="card-meta mb-3">
        <Link to="/reading" className="hover:underline">
          Reading now
        </Link>{' '}
        / {book.title}
      </div>

      <div className="grid gap-6 md:gap-9 grid-cols-1 md:grid-cols-[220px_1fr]">
        {/* Book */}
        <div>
          <div className="rounded-sm overflow-hidden bg-neutral-200" style={{ width: '100%', maxWidth: 220, aspectRatio: '2/3' }}>
            {book.cover_url && <img src={book.cover_url} alt="" className="w-full h-full object-cover" />}
          </div>
          <h3 className="mt-3 !mb-1">{book.title}</h3>
          <div className="card-meta mb-3">{book.author}</div>
          <div className="flex gap-1.5 flex-wrap mb-4">
            <span className="tag tag-neutral">{book.reading_status}</span>
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
        </div>

        {/* Note stream */}
        <div>
          <div className="card-kicker mb-2">Note stream{notes ? ` · ${notes.length}` : ''}</div>

          <form id="reading-note" onSubmit={handleAddNote} className="card mb-5" style={{ padding: '16px 18px' }}>
            <textarea
              className="input !border-none !bg-transparent !px-0"
              style={{ fontSize: 15.5, lineHeight: 1.6, minHeight: 80 }}
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
