import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search as SearchIcon, Loader2 } from 'lucide-react'
import { useAuth } from '../App'
import { supabase } from '../lib/supabase'
import { verdictClass, verdictIcon } from '../lib/verdict'
import { fetchBookByISBN, searchBookCover, fetchAmazonCoverByISBN } from '../lib/googleBooks'
import { extractSortLastName } from '../lib/authorSort'

const STATUS_FILTERS = ['All', 'Reading', 'Unread', 'Read']
const VIEW_MODES = ['Category', 'Title', 'Author', 'Recent']

function firstLetter(str) {
  const c = (str || '').trim().charAt(0).toUpperCase()
  return /[A-Z]/.test(c) ? c : '#'
}

// Groups a list by the first letter of whatever keyFn returns, alphabetical
// with the "#" (no usable letter) bucket last -- used for the Title and
// Author views. keyFn is a sort key, not necessarily the displayed text --
// Author uses the surname extracted by extractSortLastName, since authors
// are stored in natural order ("John Smith"), not "Smith, John".
function groupByLetter(list, keyFn) {
  const map = {}
  list.forEach((b) => {
    const key = firstLetter(keyFn(b))
    ;(map[key] = map[key] || []).push(b)
  })
  Object.values(map).forEach((arr) => arr.sort((a, b) => keyFn(a).localeCompare(keyFn(b))))
  const letters = Object.keys(map).sort((a, b) => (a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b)))
  return { map, letters }
}

function BookTable({ books, checksByIsbn, navigate, hideTags }) {
  return (
    <div className="overflow-x-auto">
      <table className="table w-full" style={{ minWidth: 560 }}>
        <thead>
          <tr>
            <th style={{ width: '58%' }}>Book</th>
            <th style={{ width: '21%' }}>Verdict</th>
            <th style={{ width: '21%' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {books.map((b) => {
            const verdict = b.isbn ? checksByIsbn[b.isbn] : null
            const VerdictIcon = verdictIcon(verdict)
            return (
              <tr key={b.id} className="cursor-pointer" onClick={() => navigate(`/shelf/${b.id}`)}>
                <td>
                  <div className="flex items-center gap-2.5">
                    <div className="rounded-sm shrink-0 overflow-hidden bg-neutral-200" style={{ width: 40, height: 60 }}>
                      {b.cover_url && <img src={b.cover_url} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div>
                      <div className="card-title !text-[14px]">{b.title}</div>
                      <div className="card-meta">{b.author}</div>
                      {!hideTags && b.tags?.length > 0 && (
                        <div className="flex gap-1 flex-wrap mt-1">
                          {b.tags.map((t) => (
                            <span key={t} className="tag tag-neutral" style={{ fontSize: 10 }}>
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
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
                    <span className="tag tag-neutral">Unread</span>
                  )}
                  {b.location && <span className="card-meta ml-1">{b.location}</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function GroupedSections({ names, groups, checksByIsbn, navigate, hideTags }) {
  return (
    <div className="flex flex-col">
      {names.map((name, i) => (
        <div key={name} className="pt-6 mt-6 first:pt-0 first:mt-0" style={i > 0 ? { borderTop: '1px solid var(--color-divider)' } : undefined}>
          <div className="flex items-baseline gap-2 mb-3">
            <h3 className="font-heading !mb-0" style={{ fontSize: 19 }}>
              {name}
            </h3>
            <span className="card-meta">{groups[name].length}</span>
          </div>
          <BookTable books={groups[name]} checksByIsbn={checksByIsbn} navigate={navigate} hideTags={hideTags} />
        </div>
      ))}
    </div>
  )
}

export default function Shelf() {
  const user = useAuth()
  const navigate = useNavigate()

  const [books, setBooks] = useState(null) // null = loading
  const [checksByIsbn, setChecksByIsbn] = useState({})
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [tradition, setTradition] = useState(null)
  const [viewBy, setViewBy] = useState('Category')
  const [findingCovers, setFindingCovers] = useState(false)
  const [coverProgress, setCoverProgress] = useState(null) // { done, total }

  async function loadBooks() {
    const [{ data: bookRows }, { data: checkRows }] = await Promise.all([
      supabase.from('books').select('*').eq('user_id', user.id).order('title'),
      supabase.from('theology_checks').select('isbn, verdict').eq('kind', 'book').not('isbn', 'is', null),
    ])
    setBooks(bookRows || [])

    const map = {}
    ;(checkRows || []).forEach((c) => {
      if (c.isbn) map[c.isbn] = c.verdict
    })
    setChecksByIsbn(map)
  }

  useEffect(() => {
    loadBooks()
  }, [user.id])

  // Sequential, not parallel -- these are free Google Books/Open Library
  // lookups (no cost concern), but running them one at a time keeps the
  // progress readout meaningful and avoids hammering either API at once.
  async function handleFindCovers() {
    const missing = books.filter((b) => !b.cover_url)
    if (missing.length === 0) return
    setFindingCovers(true)
    let done = 0
    let found = 0
    setCoverProgress({ done, total: missing.length })
    for (const b of missing) {
      let cover = b.isbn ? (await fetchBookByISBN(b.isbn))?.cover_url : null
      if (!cover) cover = await searchBookCover(b.title, b.author)
      if (!cover && b.isbn) cover = await fetchAmazonCoverByISBN(b.isbn)
      if (cover) {
        await supabase.from('books').update({ cover_url: cover }).eq('id', b.id)
        found++
      }
      done++
      setCoverProgress({ done, total: missing.length })
    }
    setFindingCovers(false)
    setCoverProgress(null)
    await loadBooks()
    if (found < missing.length) {
      alert(`Found covers for ${found} of ${missing.length} books. The rest weren't matched — try adding an ISBN, or check the title/author spelling.`)
    }
  }

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
      list = list.filter((b) => b.title?.toLowerCase().includes(q) || b.author?.toLowerCase().includes(q))
    }

    return list
  }, [books, statusFilter, tradition, query])

  // Category view: group by each book's tags, same "a book can appear under
  // more than one heading" pattern Topics uses for Notebook entries. Books
  // with no tags fall into a catch-all "Untagged" group, shown last.
  const byCategory = useMemo(() => {
    const map = {}
    filtered.forEach((b) => {
      const cats = b.tags?.length ? b.tags : ['Untagged']
      cats.forEach((c) => (map[c] = map[c] || []).push(b))
    })
    Object.values(map).forEach((list) => list.sort((a, b) => (a.title || '').localeCompare(b.title || '')))
    return map
  }, [filtered])

  const categoryNames = useMemo(() => {
    const names = Object.keys(byCategory).filter((n) => n !== 'Untagged')
    names.sort((a, b) => a.localeCompare(b))
    if (byCategory['Untagged']) names.push('Untagged')
    return names
  }, [byCategory])

  const titleGroups = useMemo(() => groupByLetter(filtered, (b) => b.title || ''), [filtered])
  const authorGroups = useMemo(() => groupByLetter(filtered, (b) => extractSortLastName(b.author)), [filtered])

  const sortedRecent = useMemo(() => [...filtered].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)), [filtered])

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
  const missingCoverCount = books ? books.filter((b) => !b.cover_url).length : 0

  return (
    <div className="max-w-[1180px] mx-auto page">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <h2 className="!mb-0">My Library</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {findingCovers && coverProgress && (
            <span className="text-sm flex items-center gap-1.5" style={{ opacity: 0.7 }}>
              <Loader2 size={13} strokeWidth={2.75} className="animate-spin" />
              Finding covers… {coverProgress.done} of {coverProgress.total}
            </span>
          )}
          {missingCoverCount > 0 && (
            <button type="button" className="btn btn-secondary" onClick={handleFindCovers} disabled={findingCovers}>
              Find missing covers ({missingCoverCount})
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={() => navigate('/shelf/add')}>
            Add books
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/shelf/wishlist')}>
            Wishlist
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

        <div className="seg ml-auto">
          {VIEW_MODES.map((v) => (
            <button
              key={v}
              type="button"
              className="seg-opt"
              style={viewBy === v ? { background: 'var(--color-accent)', color: 'var(--color-bg)' } : undefined}
              onClick={() => setViewBy(v)}
            >
              {v}
            </button>
          ))}
        </div>
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
          No books in your library yet.
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24" style={{ opacity: 0.5 }}>
          No books match that search.
        </div>
      ) : viewBy === 'Category' ? (
        <GroupedSections names={categoryNames} groups={byCategory} checksByIsbn={checksByIsbn} navigate={navigate} hideTags />
      ) : viewBy === 'Title' ? (
        <GroupedSections names={titleGroups.letters} groups={titleGroups.map} checksByIsbn={checksByIsbn} navigate={navigate} />
      ) : viewBy === 'Author' ? (
        <GroupedSections names={authorGroups.letters} groups={authorGroups.map} checksByIsbn={checksByIsbn} navigate={navigate} />
      ) : (
        <BookTable books={sortedRecent} checksByIsbn={checksByIsbn} navigate={navigate} />
      )}

      {books?.length > 0 && (
        <div className="card-meta mt-3">
          Showing {filtered.length} of {books.length} · {checkedCount} checked
        </div>
      )}
    </div>
  )
}
