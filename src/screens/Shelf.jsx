import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search as SearchIcon } from 'lucide-react'
import { useAuth } from '../App'
import { supabase } from '../lib/supabase'
import { verdictClass, verdictIcon } from '../lib/verdict'

const STATUS_FILTERS = ['All', 'Reading', 'Unread', 'Read']
const SORTS = [
  { value: 'title', label: 'Title A–Z' },
  { value: 'author', label: 'Author A–Z' },
  { value: 'recent', label: 'Recently added' },
]

export default function Shelf() {
  const user = useAuth()
  const navigate = useNavigate()

  const [books, setBooks] = useState(null) // null = loading
  const [checksByIsbn, setChecksByIsbn] = useState({})
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [tradition, setTradition] = useState(null)
  const [sort, setSort] = useState('title')

  useEffect(() => {
    let cancelled = false

    async function load() {
      const [{ data: bookRows }, { data: checkRows }] = await Promise.all([
        supabase.from('books').select('*').eq('user_id', user.id).order('title'),
        supabase.from('theology_checks').select('isbn, verdict').eq('kind', 'book').not('isbn', 'is', null),
      ])
      if (cancelled) return

      setBooks(bookRows || [])

      const map = {}
      ;(checkRows || []).forEach((c) => {
        if (c.isbn) map[c.isbn] = c.verdict
      })
      setChecksByIsbn(map)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user.id])

  const traditions = useMemo(() => {
    if (!books) return []
    const counts = {}
    books.forEach((b) => {
      if (b.tradition) counts[b.tradition] = (counts[b.tradition] || 0) + 1
    })
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [books])

  const filtered = useMemo(() => {
    if (!books) return []
    let list = books

    if (statusFilter === 'Reading') list = list.filter((b) => b.reading_status === 'in-progress')
    else if (statusFilter === 'Unread') list = list.filter((b) => b.reading_status === 'unread')
    else if (statusFilter === 'Read') list = list.filter((b) => b.reading_status === 'read')

    if (tradition) list = list.filter((b) => b.tradition === tradition)

    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter(
        (b) => b.title?.toLowerCase().includes(q) || b.author?.toLowerCase().includes(q)
      )
    }

    const sorted = [...list]
    if (sort === 'title') sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
    else if (sort === 'author') sorted.sort((a, b) => (a.author || '').localeCompare(b.author || ''))
    else if (sort === 'recent') sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    return sorted
  }, [books, statusFilter, tradition, query, sort])

  function handleExport() {
    const blob = new Blob([JSON.stringify(books, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'berean-study-desk-shelf.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const checkedCount = books ? books.filter((b) => b.isbn && checksByIsbn[b.isbn]).length : 0

  return (
    <div className="max-w-[1180px] mx-auto page">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <div className="card-kicker mb-1">
            {books ? `${books.length} books · ${checkedCount} checked` : ' '}
          </div>
          <h2 className="!mb-0">The shelf</h2>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn btn-primary" onClick={() => navigate('/shelf/add')}>
            Add books
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleExport} disabled={!books?.length}>
            Export
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap mb-3">
        <div className="relative" style={{ width: 280 }}>
          <SearchIcon
            size={15}
            strokeWidth={2.75}
            className="absolute top-1/2 -translate-y-1/2"
            style={{ left: 14, opacity: 0.5 }}
          />
          <input
            className="input"
            style={{ paddingLeft: 36 }}
            placeholder="Search title or author…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="seg">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              className="seg-opt"
              style={statusFilter === s ? { background: 'var(--color-accent)', color: 'var(--color-bg)' } : undefined}
              onClick={() => setStatusFilter(s)}
            >
              {s}
            </button>
          ))}
        </div>

        <select className="input ml-auto" style={{ width: 'auto' }} value={sort} onChange={(e) => setSort(e.target.value)}>
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {traditions.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap mb-4">
          {traditions.map(([name, count]) => (
            <button
              key={name}
              type="button"
              className={`tag ${tradition === name ? 'tag-accent' : 'tag-outline'}`}
              onClick={() => setTradition(tradition === name ? null : name)}
            >
              {name} · {count}
            </button>
          ))}
          {tradition && (
            <button type="button" className="tag" onClick={() => setTradition(null)}>
              &times; clear
            </button>
          )}
        </div>
      )}

      {books === null ? (
        <div className="text-center py-24" style={{ opacity: 0.5 }}>
          Loading…
        </div>
      ) : books.length === 0 ? (
        <div className="text-center py-24" style={{ opacity: 0.5 }}>
          No books on the shelf yet.
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24" style={{ opacity: 0.5 }}>
          No books match that search.
        </div>
      ) : (
        <div className="overflow-x-auto">
        <table className="table w-full" style={{ minWidth: 640 }}>
          <thead>
            <tr>
              <th style={{ width: '46%' }}>Book</th>
              <th style={{ width: '18%' }}>Tradition</th>
              <th style={{ width: '18%' }}>Verdict</th>
              <th style={{ width: '18%' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => {
              const verdict = b.isbn ? checksByIsbn[b.isbn] : null
              const VerdictIcon = verdictIcon(verdict)
              return (
                <tr key={b.id} className="cursor-pointer" onClick={() => navigate(`/shelf/${b.id}`)}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div
                        className="rounded-sm shrink-0 overflow-hidden bg-neutral-200"
                        style={{ width: 30, height: 45 }}
                      >
                        {b.cover_url && (
                          <img src={b.cover_url} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div>
                        <div className="card-title !text-[14px]">{b.title}</div>
                        <div className="card-meta">{b.author}</div>
                      </div>
                    </div>
                  </td>
                  <td>{b.tradition ? <span className="tag tag-neutral">{b.tradition}</span> : '—'}</td>
                  <td>
                    {verdict ? (
                      <span className={`tag ${verdictClass(verdict)} flex items-center gap-1 w-fit`}>
                        <VerdictIcon size={12} strokeWidth={2.75} />
                        {verdict}
                      </span>
                    ) : (
                      <span style={{ opacity: 0.4, fontSize: 12 }}>not checked</span>
                    )}
                  </td>
                  <td>
                    {b.reading_status === 'in-progress' ? (
                      <span className="tag tag-accent">Reading</span>
                    ) : b.reading_status === 'read' ? (
                      <span className="tag tag-accent-2">Read</span>
                    ) : (
                      <span style={{ opacity: 0.5, fontSize: 12 }}>Unread</span>
                    )}
                    {b.location && <span className="card-meta ml-1">{b.location}</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      )}

      {books?.length > 0 && (
        <div className="card-meta mt-3">
          Showing {filtered.length} of {books.length}
        </div>
      )}
    </div>
  )
}
