import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search as SearchIcon, User, BookOpen, BookText, Loader2 } from 'lucide-react'
import { useAuth } from '../App'
import { supabase } from '../lib/supabase'
import { checksList } from '../lib/theologyCheck'
import { listEntries, formatEntryNum, bookNameForRef } from '../lib/entries'
import { fetchEsvPassage } from '../lib/esv'
import { searchVerses } from '../lib/bsb'
import { verdictClass, verdictIcon } from '../lib/verdict'

function matches(haystacks, q) {
  return haystacks.some((h) => h && h.toLowerCase().includes(q))
}

export default function Search() {
  const user = useAuth()

  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(() => searchParams.get('q') || '')
  const [books, setBooks] = useState(null)
  const [checks, setChecks] = useState(null)
  const [entries, setEntries] = useState(null)

  const [passage, setPassage] = useState(null) // null = not fetched, false = failed
  const [passageLoading, setPassageLoading] = useState(false)
  const [passageFor, setPassageFor] = useState(null)

  // BSB is 31,000+ rows -- unlike shelf/checks/entries this can't be fetched
  // once and filtered client-side, so it's a live, debounced server query.
  const [bsbResults, setBsbResults] = useState(null)
  const [bsbSearching, setBsbSearching] = useState(false)
  const bsbDebounce = useRef(null)

  useEffect(() => {
    supabase
      .from('books')
      .select('id, title, author, cover_url, isbn, reading_status')
      .eq('user_id', user.id)
      .then(({ data }) => setBooks(data || []))
    checksList()
      .then(({ data }) => setChecks(data || []))
      .catch(() => setChecks([]))
    listEntries(user.id).then(setEntries)
  }, [user.id])

  const q = query.trim().toLowerCase()

  const bookMatches = useMemo(() => {
    if (!books || !q) return []
    return books.filter((b) => matches([b.title, b.author, b.isbn], q))
  }, [books, q])

  const checkMatches = useMemo(() => {
    if (!checks || !q) return []
    return checks
      .filter((c) => matches([c.title, c.name, c.authors], q))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }, [checks, q])

  const entryMatches = useMemo(() => {
    if (!entries || !q) return []
    return entries.filter((e) => matches([e.title, e.body, e.ref, ...(e.tags || [])], q))
  }, [entries, q])

  const scriptureRef = useMemo(() => (q ? bookNameForRef(query.trim()) && query.trim() : null), [q, query])

  useEffect(() => {
    if (!q) {
      setBsbResults(null)
      return
    }
    clearTimeout(bsbDebounce.current)
    bsbDebounce.current = setTimeout(async () => {
      setBsbSearching(true)
      try {
        setBsbResults(await searchVerses({ query: query.trim(), limit: 5 }))
      } catch {
        setBsbResults([])
      } finally {
        setBsbSearching(false)
      }
    }, 350)
    return () => clearTimeout(bsbDebounce.current)
  }, [q, query])

  function handleLookup() {
    setPassageFor(scriptureRef)
    setPassage(null)
    setPassageLoading(true)
    fetchEsvPassage(scriptureRef)
      .then(setPassage)
      .catch(() => setPassage(false))
      .finally(() => setPassageLoading(false))
  }

  const loading = books === null || checks === null || entries === null
  const totalMatches = bookMatches.length + checkMatches.length + entryMatches.length + (bsbResults?.length || 0)

  return (
    <div className="max-w-[1080px] mx-auto page">
      <h2 className="!mb-4">Search</h2>

      <div className="relative mb-6">
        <SearchIcon size={16} strokeWidth={2.75} className="absolute top-1/2 -translate-y-1/2" style={{ left: 16, opacity: 0.5 }} />
        <input
          autoFocus
          className="input"
          style={{ paddingLeft: 42, fontSize: 16, minHeight: 46 }}
          placeholder="Search your shelf, doctrine checks, and notebook — or type a reference like Romans 8:28…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {!q ? (
        <p style={{ opacity: 0.5 }}>Start typing to search across everything you've added.</p>
      ) : loading ? (
        <div className="text-center py-16" style={{ opacity: 0.5 }}>
          Loading…
        </div>
      ) : (
        <div className="flex flex-col gap-7">
          {scriptureRef && (
            <div className="card" style={{ background: 'var(--color-accent-100)', padding: '18px 20px' }}>
              <div className="card-kicker mb-1" style={{ color: 'var(--color-accent-700)' }}>
                Scripture
              </div>
              {passageFor !== scriptureRef || passage === null ? (
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div style={{ fontSize: 15 }}>Look up "{scriptureRef}" in the ESV</div>
                  <button type="button" className="btn btn-secondary" onClick={handleLookup} disabled={passageLoading}>
                    {passageLoading ? <Loader2 size={14} strokeWidth={2.75} className="animate-spin" /> : 'Look up'}
                  </button>
                </div>
              ) : passage === false ? (
                <div className="text-sm" style={{ opacity: 0.6 }}>
                  Couldn't look up that reference.
                </div>
              ) : (
                <>
                  <div className="card-title !text-[14px] mb-1">{passage.canonical || scriptureRef}</div>
                  <p className="scripture-text scripture-block whitespace-pre-wrap">{passage.text}</p>
                </>
              )}
            </div>
          )}

          {totalMatches === 0 && !scriptureRef && (
            <div className="text-center py-16" style={{ opacity: 0.5 }}>
              No matches for "{query.trim()}".
            </div>
          )}

          {bookMatches.length > 0 && (
            <div>
              <div className="card-kicker mb-2">My Library · {bookMatches.length}</div>
              <div className="flex flex-col">
                {bookMatches.map((b) => (
                  <Link
                    key={b.id}
                    to={`/shelf/${b.id}`}
                    className="flex items-center gap-2.5 py-2 hover:bg-black/[0.02]"
                    style={{ borderBottom: '1px solid var(--color-divider)' }}
                  >
                    <div className="rounded-sm shrink-0 overflow-hidden bg-neutral-200" style={{ width: 26, height: 39 }}>
                      {b.cover_url && <img src={b.cover_url} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div>
                      <div className="card-title !text-[14px]">{b.title}</div>
                      <div className="card-meta">{b.author}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {checkMatches.length > 0 && (
            <div>
              <div className="card-kicker mb-2">Doctrine Check · {checkMatches.length}</div>
              <div className="flex flex-col">
                {checkMatches.map((c) => {
                  const VerdictIcon = verdictIcon(c.verdict)
                  return (
                    <Link
                      key={c.id}
                      to={`/checks/${c.id}`}
                      className="flex items-center gap-2.5 py-2 hover:bg-black/[0.02]"
                      style={{ borderBottom: '1px solid var(--color-divider)' }}
                    >
                      {c.kind === 'book' ? (
                        <div className="rounded-sm shrink-0 overflow-hidden bg-neutral-200" style={{ width: 26, height: 39 }}>
                          {c.cover_url && <img src={c.cover_url} alt="" className="w-full h-full object-cover" />}
                        </div>
                      ) : (
                        <div className="rounded-full shrink-0 flex items-center justify-center bg-neutral-200" style={{ width: 26, height: 26 }}>
                          <User size={13} strokeWidth={2.75} style={{ opacity: 0.5 }} />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="card-title !text-[14px]">{c.title || c.name}</div>
                        {c.kind === 'book' && c.authors && <div className="card-meta">{c.authors}</div>}
                      </div>
                      <span className={`tag ${verdictClass(c.verdict)} flex items-center gap-1 w-fit shrink-0`}>
                        <VerdictIcon size={12} strokeWidth={2.75} />
                        {c.verdict || 'Unable to Assess'}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {entryMatches.length > 0 && (
            <div>
              <div className="card-kicker mb-2">Notebook · {entryMatches.length}</div>
              <div className="flex flex-col">
                {entryMatches
                  .sort((a, b) => a.number - b.number)
                  .map((e) => (
                    <Link
                      key={e.id}
                      to={`/notebook/${e.id}`}
                      className="flex items-start gap-2.5 py-2 hover:bg-black/[0.02]"
                      style={{ borderBottom: '1px solid var(--color-divider)' }}
                    >
                      <BookOpen size={15} strokeWidth={2.75} className="shrink-0 mt-0.5" style={{ opacity: 0.4 }} />
                      <div className="min-w-0">
                        <div className="card-title !text-[14px]">
                          no. {formatEntryNum(e.number)} — {e.title || 'Untitled'}
                        </div>
                        <div className="card-meta truncate">
                          {e.ref ? `${e.ref} · ` : ''}
                          {e.body}
                        </div>
                      </div>
                    </Link>
                  ))}
              </div>
            </div>
          )}

          {(bsbSearching || bsbResults?.length > 0) && (
            <div>
              <div className="card-kicker mb-2 flex items-center gap-1.5">
                Bible Verses (BSB) {bsbResults ? `· ${bsbResults.length}` : ''}
                {bsbSearching && <Loader2 size={12} strokeWidth={2.75} className="animate-spin" />}
              </div>
              <div className="flex flex-col gap-1.5">
                {(bsbResults || []).map((v) => (
                  <Link
                    key={v.id}
                    to={`/bible?book=${encodeURIComponent(v.book_name)}&chapter=${v.chapter}&verse=${v.verse}`}
                    className="flex items-start gap-2.5 py-2 hover:bg-black/[0.02]"
                    style={{ borderBottom: '1px solid var(--color-divider)' }}
                  >
                    <BookText size={15} strokeWidth={2.75} className="shrink-0 mt-0.5" style={{ opacity: 0.4 }} />
                    <div className="min-w-0">
                      <div className="card-title !text-[14px]">
                        {v.book_name} {v.chapter}:{v.verse}
                      </div>
                      <div className="card-meta truncate">{v.text}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
