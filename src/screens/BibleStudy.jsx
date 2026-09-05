import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search as SearchIcon, ChevronLeft, ChevronRight, Copy, NotebookPen, X, Loader2 } from 'lucide-react'
import {
  OT_BOOKS,
  NT_BOOKS,
  parseReference,
  fetchChapter,
  fetchChapterCount,
  searchVerses,
  formatReference,
} from '../lib/bsb'
import { CANONICAL_BOOKS } from '../lib/entries'
import { COMMENTARIES, fetchCommentaryChapter, fetchCrossReferences, bookNameForCode } from '../lib/helloao'

const VIEW_MODES = ['Read', 'Search']

function highlightTerms(text, query) {
  const words = query.trim().split(/\s+/).filter((w) => w.length > 1)
  if (words.length === 0) return text
  const pattern = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi')
  const parts = text.split(pattern)
  return parts.map((part, i) =>
    words.some((w) => w.toLowerCase() === part.toLowerCase()) ? (
      <mark key={i} style={{ background: 'var(--color-accent-200)', color: 'inherit', borderRadius: 3 }}>
        {part}
      </mark>
    ) : (
      part
    )
  )
}

function BookPickerDialog({ initialBook, onPick, onClose }) {
  const [testament, setTestament] = useState(OT_BOOKS.includes(initialBook) ? 'OT' : 'NT')
  const [pickedBook, setPickedBook] = useState(null)
  const [chapterCount, setChapterCount] = useState(null)

  async function handlePickBook(b) {
    setPickedBook(b)
    setChapterCount(null)
    const count = await fetchChapterCount(b)
    setChapterCount(count)
  }

  const books = testament === 'OT' ? OT_BOOKS : NT_BOOKS

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" style={{ width: 'min(520px, 100%)' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="dialog-title">{pickedBook ? pickedBook : 'Choose a book'}</div>
          <button type="button" className="btn btn-icon btn-ghost" onClick={onClose} aria-label="Close">
            <X size={16} strokeWidth={2.75} />
          </button>
        </div>

        {!pickedBook ? (
          <>
            <div className="seg self-start">
              <button
                type="button"
                className="seg-opt"
                style={testament === 'OT' ? { background: 'var(--color-accent)', color: 'var(--color-bg)' } : undefined}
                onClick={() => setTestament('OT')}
              >
                Old Testament
              </button>
              <button
                type="button"
                className="seg-opt"
                style={testament === 'NT' ? { background: 'var(--color-accent)', color: 'var(--color-bg)' } : undefined}
                onClick={() => setTestament('NT')}
              >
                New Testament
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5" style={{ maxHeight: 360, overflowY: 'auto' }}>
              {books.map((b) => (
                <button key={b} type="button" className="btn btn-secondary !justify-start" onClick={() => handlePickBook(b)}>
                  {b}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <button type="button" className="btn btn-ghost self-start !px-0" onClick={() => setPickedBook(null)}>
              ← Choose a different book
            </button>
            {chapterCount === null ? (
              <div className="flex items-center gap-2 text-sm" style={{ opacity: 0.7 }}>
                <Loader2 size={14} strokeWidth={2.75} className="animate-spin" /> Loading chapters…
              </div>
            ) : (
              <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5" style={{ maxHeight: 360, overflowY: 'auto' }}>
                {Array.from({ length: chapterCount }, (_, i) => i + 1).map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="btn btn-secondary !px-0"
                    style={{ width: 40 }}
                    onClick={() => onPick(pickedBook, c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function BibleStudy() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [viewMode, setViewMode] = useState('Read')

  const [quickRef, setQuickRef] = useState('')
  const [refError, setRefError] = useState('')
  const [book, setBook] = useState('John')
  const [chapter, setChapter] = useState(3)
  const [verses, setVerses] = useState(null) // null = loading
  const [chapterCount, setChapterCount] = useState(null)
  const [selectedVerses, setSelectedVerses] = useState(new Set())
  const [verseRange, setVerseRange] = useState(null) // { start, end } -- restricts the reader to just these verses; null shows the whole chapter
  const [pendingRange, setPendingRange] = useState(null) // a verseRange to apply once the (possibly still-loading) chapter arrives
  const [showPicker, setShowPicker] = useState(false)
  const [copied, setCopied] = useState('')

  const [showCommentary, setShowCommentary] = useState(false)
  const [commentaryId, setCommentaryId] = useState('matthew-henry')
  const [commentaryData, setCommentaryData] = useState(null) // null = not loaded, false = error
  const [commentaryLoading, setCommentaryLoading] = useState(false)

  const activeCommentaryBlockRef = useRef(null)

  const [showCrossRefs, setShowCrossRefs] = useState(false)
  const [crossRefData, setCrossRefData] = useState(null)
  const [crossRefLoading, setCrossRefLoading] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchTestament, setSearchTestament] = useState('')
  const [searchBook, setSearchBook] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const searchDebounce = useRef(null)

  // Deep link from global Search: /bible?book=Romans&chapter=8&verse=28
  const appliedDeepLink = useRef(false)
  useEffect(() => {
    if (appliedDeepLink.current) return
    appliedDeepLink.current = true
    const qBook = searchParams.get('book')
    const qChapter = searchParams.get('chapter')
    const qVerse = searchParams.get('verse')
    if (qBook && qChapter) {
      setBook(qBook)
      setChapter(parseInt(qChapter, 10) || 1)
      if (qVerse) {
        const v = parseInt(qVerse, 10)
        setPendingRange({ start: v, end: v })
      }
    }
  }, [searchParams])

  // Fetches whenever book/chapter changes. Resets the verse-range scope to
  // "whole chapter" up front -- a pending range (set by goTo, below) will
  // re-narrow it once this load finishes, in the effect after this one.
  useEffect(() => {
    let cancelled = false
    setVerses(null)
    setSelectedVerses(new Set())
    setVerseRange(null)
    setRefError('')
    Promise.all([fetchChapter(book, chapter), fetchChapterCount(book)])
      .then(([rows, count]) => {
        if (cancelled) return
        setVerses(rows)
        setChapterCount(count)
      })
      .catch((err) => {
        if (cancelled) return
        setVerses([])
        setRefError('Could not load that chapter — ' + err.message)
      })
    return () => {
      cancelled = true
    }
  }, [book, chapter])

  // Applies a pending verse-range request as soon as the chapter it targets
  // has actually loaded. Separate from the fetch effect above so that
  // re-requesting a specific verse *within the same chapter* still narrows
  // the view even though book/chapter themselves didn't change (and so
  // wouldn't have re-triggered that effect).
  useEffect(() => {
    if (!pendingRange || verses === null) return
    const set = new Set()
    for (let v = pendingRange.start; v <= pendingRange.end; v++) set.add(v)
    setSelectedVerses(set)
    setVerseRange(pendingRange)
    setPendingRange(null)
  }, [pendingRange, verses])

  // Commentary and cross references are third-party live calls (bible.helloao.org),
  // only made when the user actually opens that panel -- not on every chapter load.
  useEffect(() => {
    if (!showCommentary) return
    let cancelled = false
    setCommentaryData(null)
    setCommentaryLoading(true)
    fetchCommentaryChapter(commentaryId, book, chapter)
      .then((data) => {
        if (!cancelled) setCommentaryData(data)
      })
      .catch(() => {
        if (!cancelled) setCommentaryData(false)
      })
      .finally(() => {
        if (!cancelled) setCommentaryLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [showCommentary, commentaryId, book, chapter])

  useEffect(() => {
    if (!showCrossRefs) return
    let cancelled = false
    setCrossRefData(null)
    setCrossRefLoading(true)
    fetchCrossReferences(book, chapter)
      .then((data) => {
        if (!cancelled) setCrossRefData(data)
      })
      .catch(() => {
        if (!cancelled) setCrossRefData(false)
      })
      .finally(() => {
        if (!cancelled) setCrossRefLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [showCrossRefs, book, chapter])

  useEffect(() => {
    if (viewMode !== 'Search') return
    if (!searchQuery.trim()) {
      setSearchResults(null)
      return
    }
    clearTimeout(searchDebounce.current)
    searchDebounce.current = setTimeout(async () => {
      setSearching(true)
      try {
        const results = await searchVerses({ query: searchQuery, testament: searchTestament || undefined, bookName: searchBook || undefined })
        setSearchResults(results)
      } catch (err) {
        setRefError(err.message)
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 350)
    return () => clearTimeout(searchDebounce.current)
  }, [searchQuery, searchTestament, searchBook, viewMode])

  // verseStart/verseEnd are optional -- omit both for a plain chapter browse
  // (picker, cross-reference chapter jumps without a verse), which shows
  // the whole chapter.
  function goTo(bookName, chapterNum, verseStart, verseEnd) {
    setBook(bookName)
    setChapter(chapterNum)
    if (verseStart) {
      setPendingRange({ start: verseStart, end: verseEnd || verseStart })
    } else {
      // Explicit "no verse requested" -- clear any stale scope immediately
      // rather than waiting on the fetch effect, since it won't re-fire at
      // all if the book/chapter happen to already match.
      setPendingRange(null)
      setVerseRange(null)
    }
    setViewMode('Read')
    setShowPicker(false)
  }

  function stepChapter(delta) {
    setPendingRange(null)
    setVerseRange(null)
    setChapter((c) => {
      const next = c + delta
      if (next < 1) return c
      if (chapterCount && next > chapterCount) return c
      return next
    })
  }

  function handleQuickRef(e) {
    e.preventDefault()
    const parsed = parseReference(quickRef)
    if (!parsed) {
      setRefError(`Couldn't make sense of "${quickRef}" — try something like "Romans 8:28" or "Ps 23".`)
      return
    }
    setRefError('')
    goTo(parsed.book, parsed.chapter, parsed.verseStart, parsed.verseEnd)
  }

  function toggleVerse(v) {
    setSelectedVerses((prev) => {
      const next = new Set(prev)
      if (next.has(v)) next.delete(v)
      else next.add(v)
      return next
    })
  }

  const displayedVerses = useMemo(() => {
    if (!verses || !verseRange) return verses
    return verses.filter((v) => v.verse >= verseRange.start && v.verse <= verseRange.end)
  }, [verses, verseRange])

  const selectedSorted = useMemo(() => [...selectedVerses].sort((a, b) => a - b), [selectedVerses])

  // Scrolls the highlighted commentary block into view -- without this, opening
  // commentary on a chapter with many verse-blocks (e.g. Adam Clarke, which runs
  // nearly one block per verse) leaves the reader to hunt for the right section.
  useEffect(() => {
    if (showCommentary && commentaryData) {
      activeCommentaryBlockRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [showCommentary, commentaryData, selectedSorted])

  const selectionRef = selectedSorted.length
    ? formatReference(book, chapter, selectedSorted[0], selectedSorted[selectedSorted.length - 1])
    : ''
  const selectionText = useMemo(
    () => (verses || []).filter((v) => selectedVerses.has(v.verse)).map((v) => v.text).join(' '),
    [verses, selectedVerses]
  )

  function copy(label, text) {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(label)
      setTimeout(() => setCopied(''), 1500)
    })
  }

  function handleCreateEntry() {
    navigate('/notebook/new', { state: { ref: selectionRef, body: `"${selectionText}"` } })
  }

  return (
    <div className="max-w-[900px] mx-auto page">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <div className="card-kicker mb-1">Berean Standard Bible</div>
          <h2 className="!mb-0">Bible Study</h2>
        </div>
        <div className="seg">
          {VIEW_MODES.map((v) => (
            <button
              key={v}
              type="button"
              className="seg-opt"
              style={viewMode === v ? { background: 'var(--color-accent)', color: 'var(--color-bg)' } : undefined}
              onClick={() => setViewMode(v)}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {viewMode === 'Read' ? (
        <>
          <form onSubmit={handleQuickRef} className="flex gap-2 flex-wrap mb-2">
            <input
              className="input flex-1"
              style={{ minWidth: 220 }}
              placeholder="Jump to a reference — e.g. Romans 8:28, Jn 3:16-18, Ps 23"
              value={quickRef}
              onChange={(e) => setQuickRef(e.target.value)}
            />
            <button type="submit" className="btn btn-secondary">
              Go
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowPicker(true)}>
              Browse
            </button>
          </form>
          {refError && (
            <div className="mb-3 text-sm" style={{ color: 'var(--color-accent-800)' }}>
              {refError}
            </div>
          )}

          <div className="flex items-center justify-between mb-3">
            <button type="button" className="btn btn-icon btn-ghost" onClick={() => stepChapter(-1)} disabled={chapter <= 1} aria-label="Previous chapter">
              <ChevronLeft size={18} strokeWidth={2.75} />
            </button>
            <h3 className="!mb-0">
              {book} {chapter}
            </h3>
            <button
              type="button"
              className="btn btn-icon btn-ghost"
              onClick={() => stepChapter(1)}
              disabled={chapterCount != null && chapter >= chapterCount}
              aria-label="Next chapter"
            >
              <ChevronRight size={18} strokeWidth={2.75} />
            </button>
          </div>

          <div className="card mb-3" style={{ padding: '22px 26px' }}>
            {verses === null ? (
              <div className="text-center py-16" style={{ opacity: 0.5 }}>
                Loading…
              </div>
            ) : verses.length === 0 ? (
              <div className="text-center py-16" style={{ opacity: 0.5 }}>
                No text found for that reference.
              </div>
            ) : displayedVerses.length === 0 ? (
              <div className="text-center py-16" style={{ opacity: 0.5 }}>
                That verse isn't in this chapter.
              </div>
            ) : (
              <>
                {displayedVerses.map((v) => (
                  <p
                    key={v.id}
                    onClick={() => toggleVerse(v.verse)}
                    className="cursor-pointer"
                    style={{
                      fontSize: 17,
                      lineHeight: 1.75,
                      display: 'inline',
                      background: selectedVerses.has(v.verse) ? 'var(--color-accent-100)' : 'transparent',
                      borderRadius: 6,
                      padding: '2px 3px',
                    }}
                  >
                    <sup style={{ color: 'var(--color-accent)', fontWeight: 700, marginRight: 3, fontSize: 12 }}>{v.verse}</sup>
                    {v.text + ' '}
                  </p>
                ))}
                {verseRange && (
                  <div className="mt-2">
                    <button type="button" className="btn btn-secondary !text-[13px]" onClick={() => setVerseRange(null)}>
                      Show whole chapter
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {selectedSorted.length > 0 && (
            <div className="card" style={{ padding: '14px 18px' }}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="card-title !text-[14px]">{selectionRef}</span>
                <button type="button" className="btn btn-secondary" onClick={() => copy('text', selectionText)}>
                  <Copy size={13} strokeWidth={2.75} />
                  Copy text
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => copy('ref', selectionRef)}>
                  <Copy size={13} strokeWidth={2.75} />
                  Copy reference
                </button>
                <button type="button" className="btn btn-primary" onClick={handleCreateEntry}>
                  <NotebookPen size={13} strokeWidth={2.75} />
                  Create Notebook Entry
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setSelectedVerses(new Set())}>
                  Clear
                </button>
                {copied && <span className="card-meta">Copied!</span>}
              </div>
            </div>
          )}

          <div className="flex gap-2 mt-3 flex-wrap">
            <button type="button" className="btn btn-secondary" onClick={() => setShowCommentary((v) => !v)}>
              {showCommentary ? 'Hide commentary' : 'Commentary'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowCrossRefs((v) => !v)}>
              {showCrossRefs ? 'Hide cross references' : 'Cross references'}
            </button>
          </div>

          {showCommentary && (
            <div className="card mt-3" style={{ padding: '16px 20px' }}>
              <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                <div className="card-kicker">Commentary</div>
                <select className="input" style={{ width: 'auto' }} value={commentaryId} onChange={(e) => setCommentaryId(e.target.value)}>
                  {COMMENTARIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              {commentaryLoading ? (
                <div className="flex items-center gap-2 text-sm" style={{ opacity: 0.7 }}>
                  <Loader2 size={14} strokeWidth={2.75} className="animate-spin" /> Loading commentary…
                </div>
              ) : commentaryData === false ? (
                <p className="text-sm" style={{ opacity: 0.6 }}>
                  Couldn't load commentary for this chapter.
                </p>
              ) : commentaryData ? (
                <div className="flex flex-col gap-3" style={{ maxHeight: 420, overflowY: 'auto' }}>
                  {commentaryData.chapter.content.map((block, i) => {
                    const nextNumber = commentaryData.chapter.content[i + 1]?.number
                    const rangeLabel = nextNumber && nextNumber > block.number + 1 ? `${block.number}–${nextNumber - 1}` : block.number
                    const isActive =
                      selectedSorted.length > 0 &&
                      selectedSorted[0] >= block.number &&
                      (nextNumber == null || selectedSorted[0] < nextNumber)
                    return (
                      <div
                        key={i}
                        ref={isActive ? activeCommentaryBlockRef : null}
                        style={{ background: isActive ? 'var(--color-accent-100)' : 'transparent', padding: 8, borderRadius: 10 }}
                      >
                        <div className="card-meta mb-1">Verse {rangeLabel}</div>
                        <p style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{block.content.join('\n\n')}</p>
                      </div>
                    )
                  })}
                </div>
              ) : null}
              <div className="card-meta mt-2">
                {commentaryData?.commentary?.name || 'Commentary'} — via the{' '}
                <a href="https://bible.helloao.org" target="_blank" rel="noopener noreferrer">
                  Free Use Bible API
                </a>
              </div>
            </div>
          )}

          {showCrossRefs && (
            <div className="card mt-3" style={{ padding: '16px 20px' }}>
              <div className="card-kicker mb-2">Cross References</div>
              {selectedSorted.length === 0 ? (
                <p className="text-sm" style={{ opacity: 0.6 }}>
                  Tap a verse above to see related verses.
                </p>
              ) : crossRefLoading ? (
                <div className="flex items-center gap-2 text-sm" style={{ opacity: 0.7 }}>
                  <Loader2 size={14} strokeWidth={2.75} className="animate-spin" /> Loading cross references…
                </div>
              ) : crossRefData === false ? (
                <p className="text-sm" style={{ opacity: 0.6 }}>
                  Couldn't load cross references for this chapter.
                </p>
              ) : crossRefData ? (
                <div className="flex flex-col gap-3">
                  {selectedSorted.map((vNum) => {
                    const entry = crossRefData.chapter.content.find((c) => c.verse === vNum)
                    const refs = (entry?.references || []).slice(0, 6)
                    return (
                      <div key={vNum}>
                        <div className="card-meta mb-1">
                          {book} {chapter}:{vNum}
                        </div>
                        {refs.length === 0 ? (
                          <p className="text-sm" style={{ opacity: 0.5 }}>
                            No cross references found.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {refs.map((r, i) => (
                              <button
                                key={i}
                                type="button"
                                className="tag tag-neutral"
                                onClick={() => goTo(bookNameForCode(r.book), r.chapter, r.verse)}
                              >
                                {bookNameForCode(r.book)} {r.chapter}:{r.verse}
                                {r.endVerse ? `-${r.endVerse}` : ''}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : null}
              <div className="card-meta mt-2">
                Cross references from OpenBible.info (CC BY 4.0), via the{' '}
                <a href="https://bible.helloao.org" target="_blank" rel="noopener noreferrer">
                  Free Use Bible API
                </a>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center gap-3 flex-wrap mb-4">
            <div className="relative flex-1" style={{ minWidth: 220 }}>
              <SearchIcon size={15} strokeWidth={2.75} className="absolute top-1/2 -translate-y-1/2" style={{ left: 14, opacity: 0.5 }} />
              <input
                className="input"
                style={{ paddingLeft: 36 }}
                placeholder="Search every verse — e.g. faith, shepherd, born again"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
            <select
              className="input"
              style={{ width: 'auto' }}
              value={searchTestament}
              onChange={(e) => {
                setSearchTestament(e.target.value)
                setSearchBook('')
              }}
            >
              <option value="">Whole Bible</option>
              <option value="OT">Old Testament</option>
              <option value="NT">New Testament</option>
            </select>
            <select className="input" style={{ width: 'auto' }} value={searchBook} onChange={(e) => setSearchBook(e.target.value)}>
              <option value="">Any book</option>
              {(searchTestament === 'OT' ? OT_BOOKS : searchTestament === 'NT' ? NT_BOOKS : CANONICAL_BOOKS).map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {searching ? (
            <div className="text-center py-16" style={{ opacity: 0.5 }}>
              Searching…
            </div>
          ) : !searchQuery.trim() ? (
            <p style={{ opacity: 0.5 }}>Start typing to search the whole Berean Standard Bible.</p>
          ) : searchResults?.length === 0 ? (
            <div className="text-center py-16" style={{ opacity: 0.5 }}>
              No verses match that search.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {(searchResults || []).map((v) => (
                <button
                  key={v.id}
                  type="button"
                  className="card !flex-row items-start gap-3 text-left hover:shadow-sm"
                  style={{ padding: '12px 16px' }}
                  onClick={() => goTo(v.book_name, v.chapter, v.verse)}
                >
                  <span className="tag tag-accent shrink-0">
                    {v.book_name} {v.chapter}:{v.verse}
                  </span>
                  <span style={{ fontSize: 14, lineHeight: 1.6 }}>{highlightTerms(v.text, searchQuery)}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {showPicker && <BookPickerDialog initialBook={book} onPick={goTo} onClose={() => setShowPicker(false)} />}
    </div>
  )
}
