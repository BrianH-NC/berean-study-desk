import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, NotebookPen } from 'lucide-react'
import { useAuth } from '../App'
import { supabase } from '../lib/supabase'
import { parseReference } from '../lib/bsb'
import StudySection from './StudySection'
import { dailyHero } from '../lib/dailyHero'

async function loadOwned(table, userId) {
  const rows = []
  for (let start = 0; ; start += 500) {
    const { data, error } = await supabase.from(table).select('*').eq('user_id', userId).order('id').range(start, start + 499)
    if (error) throw new Error(error.message)
    rows.push(...data)
    if (data.length < 500) return rows
  }
}

export default function StudyPersonalSidebar({ book, chapter, passageRef }) {
  const user = useAuth()
  const [data, setData] = useState({ notes: [], books: [], loading: true, error: false })
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let cancelled = false
    setData({ notes: [], books: [], loading: true, error: false })
    Promise.all([loadOwned('entries', user.id), loadOwned('books', user.id)]).then(([notes, books]) => {
      if (!cancelled) setData({ notes, books, loading: false, error: false })
    }).catch(() => { if (!cancelled) setData({ notes: [], books: [], loading: false, error: true }) })
    return () => { cancelled = true }
  }, [user.id, retry])
  const notes = data.notes.filter(note => {
    const ref = parseReference(note.ref || '')
    return ref?.book === book && ref.chapter === chapter
  }).sort((a, b) => (Date.parse(b.created_at) || 0) - (Date.parse(a.created_at) || 0))
  const linked = new Set(notes.map(note => note.shelf_book_id).filter(Boolean))
  const books = data.books.filter(item => linked.has(item.id) || item.tags?.some(tag => tag.toLowerCase() === book.toLowerCase()))
  return <aside className="bible-personal" aria-label="Your passage notes and resources">
    <StudySection title="My Study Notes">
      <Link className="bible-see-all" to="/notebook">See all notes →</Link>
      {data.loading ? <p role="status">Loading your notes…</p> : data.error ? <p>Could not load your notes. <button onClick={() => setRetry(n => n + 1)}>Retry</button></p> : notes.length ? notes.slice(0, 4).map(note => <Link className="bible-related-item" key={note.id} to={`/notebook/${note.id}`}><NotebookPen size={20}/><span><strong>{note.ref}</strong>{note.title || 'Untitled note'}<small>{new Date(note.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</small></span></Link>) : <p className="bible-muted">No notes linked to {book} {chapter} yet.</p>}
      <Link className="btn btn-ghost" to="/notebook/new" state={{ ref: passageRef, body: '' }}>Create a study note →</Link>
    </StudySection>
    <StudySection title="Related Resources"><Link className="bible-see-all" to="/shelf">Your library →</Link>
      {data.loading ? <p>Loading your library…</p> : data.error ? <p>Your library could not be loaded.</p> : books.length ? books.slice(0, 4).map(item => <Link className="bible-related-item" key={item.id} to={`/shelf/${item.id}`}>{item.cover_url ? <img src={item.cover_url} alt=""/> : <BookOpen size={24}/>}<span><strong>{item.title}</strong><small>{item.author}</small></span></Link>) : <p className="bible-muted">Books linked through your notes or tagged “{book}” appear here.</p>}
    </StudySection>
    <blockquote className="bible-image-quote" style={{ backgroundImage: `linear-gradient(#0f3d2e55,#0f3d2ecc),url(${dailyHero()})` }}>“Your word is a lamp to my feet and a light to my path.”<cite>Psalm 119:105 · BSB</cite></blockquote>
  </aside>
}
