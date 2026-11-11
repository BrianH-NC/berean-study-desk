import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../App'
import { ownedRows } from '../lib/dailyStudyData'
import { overlaps } from '../lib/dailyStudyModel'
import { findReferences } from '../lib/scriptureTagger'
import NoteWorkspaceEditor from './NoteWorkspaceEditor'
import '../screens/Notes.css'
import '../screens/DailyStudy.css'

const COLUMNS = {
  sermons: 'id,title,speaker,primary_ref,detected_refs',
  books: 'id,title,author,tags',
  prayer_requests: 'id,title,body,ref,answered_at',
  book_quotations: 'id,book_id,quote,reflection,page',
  topic_links: 'id,topic_key,entity_type,entity_id,label',
}
const TABLES = ['entries', 'sermons', 'study_sessions', 'books', 'prayer_requests', 'book_quotations', 'topic_links']

const mentions = (texts, passage) => texts.some((text) => findReferences(text || '').some((r) => overlaps(r, passage)))
const excerpt = (text, max = 110) => (text.length > max ? `${text.slice(0, max).trim()}…` : text)
// Topic keys look like "system:grace" or a bare id; show something readable.
const topicName = (key) => {
  const name = String(key).replace(/^system:/, '').replace(/[-_]+/g, ' ')
  return name.charAt(0).toUpperCase() + name.slice(1)
}

export function usePassageConnections(userId, book, chapter, verseRange) {
  const [data, setData] = useState({}), [errors, setErrors] = useState([]), [loading, setLoading] = useState(true), [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    Promise.allSettled(TABLES.map((t) => ownedRows(t, userId, COLUMNS[t] || '*'))).then((results) => {
      if (!active) return
      setData(Object.fromEntries(results.map((r, i) => [TABLES[i], r.status === 'fulfilled' ? r.value : []])))
      setErrors(results.flatMap((r, i) => (r.status === 'rejected' ? [TABLES[i]] : [])))
      setLoading(false)
    })
    return () => { active = false }
  }, [userId, retry])

  const parsedNotes = useMemo(() => (data.entries || []).map((note) => ({ note, refs: findReferences(note.ref || '') })), [data.entries])
  const start = verseRange?.start, end = verseRange?.end
  // Scanning every note/quotation body for citations is the costly part, so
  // it only reruns when the loaded data or the passage actually changes.
  const derived = useMemo(() => {
    const passage = { book, chapter, verseStart: start, verseEnd: end }
    const notes = parsedNotes.filter((n) => n.refs.some((r) => overlaps(r, passage))).map((n) => n.note)
    const noteIds = new Set(notes.map((n) => n.id))
    // Notes whose Scripture field is something else but whose text cites the passage.
    const mentionedNotes = (data.entries || []).filter((n) => !noteIds.has(n.id) && mentions([n.body, n.title], passage))
    const sermons = (data.sermons || []).filter((s) => [s.primary_ref, ...(s.detected_refs || [])].some((r) => overlaps(r, passage)))
    const sessions = (data.study_sessions || []).filter((s) => overlaps({ ...s.state, verseStart: s.state?.verseRange?.start, verseEnd: s.state?.verseRange?.end }, passage))
    const linkedBooks = new Set(notes.map((n) => n.shelf_book_id).filter(Boolean))
    const books = (data.books || []).filter((b) => linkedBooks.has(b.id) || b.tags?.some((tag) => tag.toLowerCase() === book.toLowerCase()))
    const prayers = (data.prayer_requests || []).filter((p) => mentions([p.ref, p.body, p.title], passage))
    const booksById = new Map((data.books || []).map((b) => [b.id, b]))
    const quotations = (data.book_quotations || [])
      .filter((q) => mentions([q.quote, q.reflection], passage))
      .map((q) => ({ ...q, bookTitle: booksById.get(q.book_id)?.title }))
    const topics = [...new Set((data.topic_links || []).filter((l) => l.entity_type === 'scripture' && mentions([l.entity_id], passage)).map((l) => l.topic_key))]
    return { notes, mentionedNotes, sermons, sessions, books, prayers, quotations, topics }
  }, [data, parsedNotes, book, chapter, start, end])
  const notesAtVerse = (verse) => parsedNotes.filter((n) => n.refs.some((r) => r.verseStart && overlaps(r, { book, chapter, verseStart: verse, verseEnd: verse }))).map((n) => n.note)
  return { ...derived, allBooks: data.books || [], notesAtVerse, loading, errors, reload: () => { setLoading(true); setRetry((n) => n + 1) } }
}

export default function PassageConnections({ connections, passageRef, onOpen }) {
  const { notes, mentionedNotes, sermons, sessions, books, prayers, quotations, topics, loading, errors, reload } = connections
  const total = notes.length + mentionedNotes.length + sermons.length + sessions.length + books.length + prayers.length + quotations.length + topics.length
  return (
    <section className="card passage-connections">
      <header>
        <h2>Connected to {passageRef}</h2>
        <button className="btn btn-ghost" onClick={reload}>Refresh connections</button>
      </header>
      {loading ? <p role="status">Finding your passage material…</p> : (
        <>
          {errors.length > 0 && <p role="alert">Some material could not load ({errors.join(', ')}). <button onClick={reload}>Retry</button></p>}
          <p className="bible-muted">{total ? `${total} item${total === 1 ? '' : 's'} across your study connect to this passage.` : 'Nothing in your study connects to this passage yet.'}</p>
          <div className="passage-connection-grid">
            <section>
              <h3>Notes ({notes.length + mentionedNotes.length})</h3>
              {notes.length > 0 && <ul>{notes.map((n) => <li key={n.id}><button onClick={() => onOpen(n)}>{n.title || 'Untitled note'}</button><small className="block">{n.ref}</small></li>)}</ul>}
              {mentionedNotes.length > 0 && (
                <>
                  <p className="bible-muted">Cited in the text of:</p>
                  <ul>{mentionedNotes.map((n) => <li key={n.id}><Link to={`/notebook/${n.id}`}>{n.title || 'Untitled note'}</Link></li>)}</ul>
                </>
              )}
              {!notes.length && !mentionedNotes.length && <p>No linked notes.</p>}
              <Link to="/notebook/new" state={{ ref: passageRef, note_type: 'scripture' }}>Add a passage note →</Link>
            </section>
            <section>
              <h3>Sermons ({sermons.length})</h3>
              {sermons.length ? <ul>{sermons.map((s) => <li key={s.id}><Link to={`/sermons/${s.id}`}>{s.title || 'Untitled sermon'}</Link><small className="block">{s.speaker}</small></li>)}</ul> : <p>No sermons reference this passage.</p>}
            </section>
            <section>
              <h3>Prayers ({prayers.length})</h3>
              {prayers.length ? <ul>{prayers.map((p) => <li key={p.id}><Link to="/prayer">{p.title}</Link>{p.answered_at && <small className="block">Answered</small>}</li>)}</ul> : <p>No prayer requests cite this passage.</p>}
            </section>
            <section>
              <h3>Quotations ({quotations.length})</h3>
              {quotations.length ? <ul>{quotations.map((q) => <li key={q.id}><Link to="/quotations">{excerpt(q.quote)}</Link>{q.bookTitle && <small className="block">{q.bookTitle}{q.page ? `, p. ${q.page}` : ''}</small>}</li>)}</ul> : <p>No book quotations cite this passage.</p>}
            </section>
            <section>
              <h3>Topics ({topics.length})</h3>
              {topics.length ? <ul>{topics.map((key) => <li key={key}><Link to={`/topics/${encodeURIComponent(key)}`}>{topicName(key)}</Link></li>)}</ul> : <p>No topics link this passage.</p>}
            </section>
            <section>
              <h3>Study sessions ({sessions.length})</h3>
              {sessions.length ? <ul>{sessions.map((s) => <li key={s.id}><Link to={`/bible?session=${s.id}`}>{s.title}</Link></li>)}</ul> : <p>No saved sessions for this passage.</p>}
            </section>
            <section>
              <h3>Library resources ({books.length})</h3>
              <p className="bible-muted">Linked through your notes or tagged with this Bible book.</p>
              {books.length ? <ul>{books.map((b) => <li key={b.id}><Link to={`/shelf/${b.id}`}>{b.title}</Link></li>)}</ul> : <p>No linked books yet.</p>}
            </section>
          </div>
        </>
      )}
    </section>
  )
}

export function PassageNoteDialog({ note, onClose, onSaved, books }) {
  const user = useAuth(), dialog = useRef(null), saveRef = useRef(null), [busy, setBusy] = useState(false), [error, setError] = useState('')
  useEffect(() => { dialog.current.showModal() }, [])
  async function close() { setBusy(true); try { await saveRef.current?.flush(); dialog.current.close(); onClose() } catch (e) { setError(e.message) } finally { setBusy(false) } }
  return <dialog ref={dialog} className="passage-note-dialog" aria-label="Edit verse note" onCancel={(e) => { e.preventDefault(); void close() }}><header><h2>Verse note</h2><button className="btn btn-secondary" disabled={busy} onClick={close}>Save &amp; return to passage</button></header>{error && <p role="alert">{error}</p>}<NoteWorkspaceEditor note={note} userId={user.id} notes={[note]} books={books} checks={[]} onSaved={onSaved} onOpen={() => {}} saveRef={saveRef} sessionMode /></dialog>
}
