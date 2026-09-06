import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search as SearchIcon, ExternalLink } from 'lucide-react'
import { useAuth } from '../App'
import { supabase } from '../lib/supabase'

const PRIORITY_FILTERS = ['All', 'high', 'medium', 'low']
const PRIORITY_LABEL = { high: 'High', medium: 'Medium', low: 'Low' }
const PRIORITY_CLASS = { high: 'verdict-concern', medium: 'tag-accent', low: 'tag-neutral' }

function amazonSearchUrl(item) {
  return item.isbn
    ? `https://www.amazon.com/s?k=${item.isbn}&i=stripbooks`
    : `https://www.amazon.com/s?k=${encodeURIComponent([item.title, item.author].filter(Boolean).join(' '))}&i=stripbooks`
}

export default function Wishlist() {
  const user = useAuth()
  const [items, setItems] = useState(null) // null = loading
  const [query, setQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('All')
  const [movingId, setMovingId] = useState(null)

  async function load() {
    const { data } = await supabase.from('wishlist').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setItems(data || [])
  }

  useEffect(() => {
    load()
  }, [user.id])

  const filtered = useMemo(() => {
    if (!items) return []
    let list = items
    if (priorityFilter !== 'All') list = list.filter((i) => i.priority === priorityFilter)
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter((i) => i.title?.toLowerCase().includes(q) || i.author?.toLowerCase().includes(q))
    }
    return list
  }, [items, priorityFilter, query])

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
      await supabase.from('wishlist').delete().eq('id', item.id)
      setItems((prev) => prev.filter((i) => i.id !== item.id))
    } catch (err) {
      alert('Error moving to library: ' + err.message)
    } finally {
      setMovingId(null)
    }
  }

  async function handleRemove(item) {
    if (!confirm(`Remove "${item.title}" from your wishlist?`)) return
    const { error } = await supabase.from('wishlist').delete().eq('id', item.id)
    if (error) {
      alert('Error removing: ' + error.message)
      return
    }
    setItems((prev) => prev.filter((i) => i.id !== item.id))
  }

  return (
    <div className="max-w-[900px] mx-auto page">
      <div className="card-meta mb-2">
        <Link to="/shelf" className="hover:underline">
          ← My Library
        </Link>
      </div>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <div className="card-kicker mb-1">{items ? `${items.length} books` : ' '}</div>
          <h2 className="!mb-0">Wishlist</h2>
        </div>
        <Link to="/shelf/wishlist/add" className="btn btn-primary">
          + Add
        </Link>
      </div>

      <div className="flex items-center gap-3 flex-wrap mb-4">
        <div className="relative" style={{ width: 260 }}>
          <SearchIcon size={15} strokeWidth={2.75} className="absolute top-1/2 -translate-y-1/2" style={{ left: 14, opacity: 0.5 }} />
          <input
            className="input"
            style={{ paddingLeft: 36 }}
            placeholder="Search title or author…"
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
      </div>

      {items === null ? (
        <div className="text-center py-24" style={{ opacity: 0.5 }}>
          Loading…
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-24" style={{ opacity: 0.5 }}>
          Nothing on the wishlist yet — scan a book in the store to save it here for later.
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24" style={{ opacity: 0.5 }}>
          No books match that search.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
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
              <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--color-divider)' }}>
                <a href={amazonSearchUrl(item)} target="_blank" rel="noopener noreferrer" className="btn btn-ghost !px-2">
                  <ExternalLink size={13} strokeWidth={2.75} />
                  Find it
                </a>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ marginLeft: 'auto' }}
                  onClick={() => handleOwnIt(item)}
                  disabled={movingId === item.id}
                >
                  {movingId === item.id ? 'Moving…' : 'Own it → move to library'}
                </button>
                <button type="button" className="btn btn-ghost" style={{ color: 'var(--color-accent-700)' }} onClick={() => handleRemove(item)}>
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
