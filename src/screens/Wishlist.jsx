import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search as SearchIcon, ExternalLink } from 'lucide-react'
import { useAuth } from '../App'
import { supabase } from '../lib/supabase'
import './Wishlist.css'

const PRIORITY_FILTERS = ['All', 'high', 'medium', 'low']
const PRIORITY_LABEL = { high: 'High', medium: 'Medium', low: 'Low' }
const PRIORITY_CLASS = { high: 'verdict-concern', medium: 'tag-accent', low: 'tag-neutral' }

function amazonSearchUrl(item) {
  return item.isbn
    ? `https://www.amazon.com/s?k=${encodeURIComponent(item.isbn.trim())}&i=stripbooks`
    : `https://www.amazon.com/s?k=${encodeURIComponent([item.title, item.author].filter(Boolean).join(' '))}&i=stripbooks`
}

export default function Wishlist() {
  const user = useAuth()
  const [items, setItems] = useState(null) // null = loading
  const [query, setQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('All')
  const [movingId, setMovingId] = useState(null)
  const [sort, setSort] = useState('priority')
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')

  async function load() {
    setError('')
    const { data, error } = await supabase.from('wishlist').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    if (error) { setError(error.message); return }
    setItems(data || [])
  }

  useEffect(() => {
    load()
  }, [user.id])

  const filtered = useMemo(() => {
    if (!items) return []
    let list = items
    if (priorityFilter !== 'All') list = list.filter((i) => (i.priority || 'medium') === priorityFilter)
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter((i) => [i.title, i.author, i.isbn, i.notes].some(value => value?.toLowerCase().includes(q)))
    }
    return [...list].sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title) : (sort === 'priority' ? PRIORITY_FILTERS.indexOf(a.priority || 'medium') - PRIORITY_FILTERS.indexOf(b.priority || 'medium') : 0) || new Date(b.created_at) - new Date(a.created_at))
  }, [items, priorityFilter, query, sort])

  async function saveEdit(event) {
    event.preventDefault()
    setMovingId(editing.id)
    try {
      const changes = { priority: editing.priority, notes: editing.notes.trim() || null }
      const result = await supabase.from('wishlist').update(changes).eq('id', editing.id).eq('user_id', user.id).select('id').single()
      if (result.error) throw result.error
      setItems(prev => prev.map(item => item.id === editing.id ? { ...item, ...changes } : item))
      setEditing(null)
    } catch (err) { alert('Could not save: ' + err.message) }
    finally { setMovingId(null) }
  }

  async function handleOwnIt(item) {
    setMovingId(item.id)
    try {
      const { error } = await supabase.from('books').insert({
        user_id: user.id,
        isbn: item.isbn,
        title: item.title,
        author: item.author,
        cover_url: item.cover_url,
        pages: item.pages,
        pub_date: item.pub_date,
        publisher: item.publisher,
        description: item.description,
        notes: item.notes,
        tags: [],
        reading_status: 'unread',
      })
      if (error) throw error
      const removed = await supabase.from('wishlist').delete().eq('id', item.id).eq('user_id', user.id)
      if (removed.error) { alert('The book was added to your Library, but could not be removed from your wishlist. Use Remove to finish.'); return }
      setItems((prev) => prev.filter((i) => i.id !== item.id))
    } catch (err) {
      alert('Error moving to library: ' + err.message)
    } finally {
      setMovingId(null)
    }
  }

  async function handleRemove(item) {
    if (!confirm(`Remove "${item.title}" from your wishlist?`)) return
    const { error } = await supabase.from('wishlist').delete().eq('id', item.id).eq('user_id', user.id)
    if (error) {
      alert('Error removing: ' + error.message)
      return
    }
    setItems((prev) => prev.filter((i) => i.id !== item.id))
  }

  return (
    <div className="max-w-[1100px] mx-auto page wishlist-page">
      <div className="card-meta mb-2">
        <Link to="/shelf" className="hover:underline">
          ← My Library
        </Link>
      </div>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <div className="card-kicker mb-1">{items ? `${items.length} books` : ' '}</div>
          <h2 className="!mb-0">Wishlist</h2>
          <p className="wishlist-subtitle">Good books for the next chapter of your study.</p>
        </div>
        <Link to="/shelf/wishlist/add" className="btn btn-primary">
          + Add a book
        </Link>
      </div>

      <div className="wishlist-intro">Save a book, choose what’s next, and move it into your Library when you own it.<small>Amazon links search by ISBN, or title and author. Purchases happen on Amazon.</small></div>
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <div className="relative wishlist-search">
          <SearchIcon size={15} strokeWidth={2.75} className="absolute top-1/2 -translate-y-1/2" style={{ left: 14, opacity: 0.5 }} />
          <input
            className="input"
            style={{ paddingLeft: 36 }}
            placeholder="Search title, author, ISBN, or notes…"
            aria-label="Search wishlist"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="seg">
          {PRIORITY_FILTERS.map((p) => (
            <button
              key={p}
              type="button"
              className="seg-opt"
              style={priorityFilter === p ? { background: 'var(--color-accent)', color: 'var(--color-bg)' } : undefined}
              onClick={() => setPriorityFilter(p)}
            >
              {p === 'All' ? 'All' : PRIORITY_LABEL[p]}
            </button>
          ))}
        </div>
        <select className="input wishlist-sort" aria-label="Sort wishlist" value={sort} onChange={event => setSort(event.target.value)}><option value="priority">Priority first</option><option value="newest">Recently added</option><option value="title">Title A–Z</option></select>
      </div>

      {error && <div className="card p-4" role="alert">Could not load your wishlist: {error} <button className="btn btn-secondary" onClick={load}>Retry</button></div>}

      {items === null ? (
        <div className="text-center py-24" style={{ opacity: 0.5 }}>
          {error ? 'Your wishlist is temporarily unavailable.' : 'Loading…'}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-24" style={{ opacity: 0.5 }}>
          Nothing on the wishlist yet — scan a book in the store to save it here for later.
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24" style={{ opacity: 0.5 }}>
          No books match that search. <button className="btn btn-secondary" onClick={() => { setQuery(''); setPriorityFilter('All') }}>Clear filters</button>
        </div>
      ) : (
        <div className="wishlist-grid">
          {filtered.map((item) => (
            <div key={item.id} className="card" style={{ padding: '14px 16px' }}>
              <div className="flex gap-3">
                <div className="rounded-sm shrink-0 overflow-hidden bg-neutral-200" style={{ width: 48, height: 72 }}>
                  {item.cover_url && <img src={item.cover_url} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="card-title !text-[15px]">{item.title}</div>
                    <span className={`tag ${PRIORITY_CLASS[item.priority] || 'tag-neutral'} shrink-0`}>
                      {PRIORITY_LABEL[item.priority] || 'Medium'}
                    </span>
                  </div>
                  {item.author && <div className="card-meta">{item.author}</div>}
                  {item.notes && <p className="card-body mt-1">{item.notes}</p>}
                </div>
              </div>
              {editing?.id === item.id && <form className="wishlist-edit" onSubmit={saveEdit}><label>Priority<select className="input" value={editing.priority} onChange={event => setEditing({ ...editing, priority: event.target.value })}>{Object.entries(PRIORITY_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Notes<textarea className="input" rows={3} value={editing.notes} onChange={event => setEditing({ ...editing, notes: event.target.value })} /></label><div><button className="btn btn-primary" disabled={!!movingId}>Save changes</button> <button type="button" className="btn btn-secondary" disabled={!!movingId} onClick={() => setEditing(null)}>Cancel</button></div></form>}
              <div className="wishlist-actions flex gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--color-divider)' }}>
                <a href={amazonSearchUrl(item)} target="_blank" rel="noopener noreferrer" className="btn btn-ghost !px-2">
                  <ExternalLink size={13} strokeWidth={2.75} />
                  Find on Amazon
                </a>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ marginLeft: 'auto' }}
                  onClick={() => handleOwnIt(item)}
                  disabled={!!movingId || editing?.id === item.id}
                >
                  {movingId === item.id ? 'Working…' : 'I own it → Library'}
                </button>
                <button type="button" className="btn btn-ghost" disabled={!!movingId} onClick={() => setEditing({ id: item.id, priority: item.priority || 'medium', notes: item.notes || '' })}>Edit</button>
                <button type="button" className="btn btn-ghost" disabled={!!movingId} style={{ color: 'var(--color-accent-700)' }} onClick={() => handleRemove(item)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
