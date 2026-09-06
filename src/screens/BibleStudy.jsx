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
import {
  COMMENTARIES,
  fetchCommentaryChapter,
  fetchCrossReferences,
  bookNameForCode,
  COMPARISON_TRANSLATIONS,
  fetchTranslationChapter,
} from '../lib/helloao'
import { fetchEsvChapterVerses } from '../lib/esv'
import { BIBLEPLUS_TRANSLATIONS, fetchBibleplusChapter } from '../lib/bibleplus'

const VIEW_MODES = ['Read', 'Search']

// Every translation the reading pane and the comparison panel can show, in
// one list so both stay in sync. BSB is the app's own local copy; ESV and
// the BIBLEPLUS_TRANSLATIONS (NIV/NLT/CSB) are each licensed and fetched
// live through their own Edge Function; everything else comes from the
// Free Use Bible API.
const BSB_OPTION = { id: 'BSB', name: 'Berean Standard Bible', short: 'BSB' }
const ESV_OPTION = { id: 'ESV', name: 'English Standard Version', short: 'ESV' }
const BIBLEPLUS_IDS = new Set(BIBLEPLUS_TRANSLATIONS.map((t) => t.id))
const ALL_TRANSLATIONS = [BSB_OPTION, ESV_OPTION, ...BIBLEPLUS_TRANSLATIONS, ...COMPARISON_TRANSLATIONS]

// Normalizes every translation source to the same
// [{ number, text, paragraphStart }, ...] shape for one chapter, so the
// reading pane and comparison panel can treat them identically regardless of
// where the text actually comes from. Only the API.Bible-backed translations
// (BIBLEPLUS_IDS) carry real paragraph boundaries in their source data;
// everything else marks every verse as its own paragraph start, giving a
// one-verse-per-paragraph fallback rather than running the whole chapter
// together as one undifferentiated block.
async function fetchChapterVersesFor(translationId, bookName, chapterNum) {
  if (translationId === 'BSB') {
    const rows = await fetchChapter(bookName, chapterNum)
    return rows.map((r) => ({ number: r.verse, text: r.text, paragraphStart: true }))
  }
  if (translationId === 'ESV') {
    const verses = await fetchEsvChapterVerses(bookName, chapterNum)
    return verses.map((v) => ({ ...v, paragraphStart: true }))
  }
  if (BIBLEPLUS_IDS.has(translationId)) {
    return fetchBibleplusChapter(translationId, bookName, chapterNum)
  }
  const verses = await fetchTranslationChapter(translationId, bookName, chapterNum)
  return verses.map((v) => ({ ...v, paragraphStart: true }))
}

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
  const [readingTranslation, setReadingTranslation] = useState('BSB')
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

  const [showCompare, setShowCompare] = useState(false)
  const [compareIds, setCompareIds] = useState(['eng_kjv', 'ENGWEBP'])
  const [compareData, setCompareData] = useState({}) // translationId -> { status: 'loading'|'ready'|'error', verses }

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

  // Chapter counts (for the Prev/Next bounds) come from BSB's own versification
  // regardless of the active reading translation -- chapter divisions are the
  // same standard 66-book canon across all of them, so one lookup per book
  // (not per chapter, and not re-fetched on every translation switch) is enough.
  useEffect(() => {
    let cancelled = false
    fetchChapterCount(book).then((count) => {
      if (!cancelled) setChapterCount(count)
    })
    return () => {
      cancelled = true
    }
  }, [book])

  // Fetches whenever book/chapter/reading-translation changes. Only resets
  // the verse-range scope to "whole chapter" when book or chapter actually
  // changed -- switching the reading translation while a narrowed range is
  // showing (e.g. from a "John 3:16" search) should keep that same range
  // narrowed once the new translation's text loads, not snap back to the
  // whole chapter. A pending range (set by goTo, below) still re-narrows it
  // once this load finishes, in the effect after this one.
  const prevBookChapterRef = useRef({ book, chapter })
  useEffect(() => {
    let cancelled = false
    const navigated = prevBookChapterRef.current.book !== book || prevBookChapterRef.current.chapter !== chapter
    prevBookChapterRef.current = { book, chapter }
    setVerses(null)
    if (navigated) {
      setSelectedVerses(new Set())
      setVerseRange(null)
    }
    setRefError('')
    fetchChapterVersesFor(readingTranslation, book, chapter)
      .then((rows) => {
        if (cancelled) return
        setVerses(rows)
      })
      .catch((err) => {
        if (cancelled) return
        setVerses([])
        setRefError('Could not load that chapter — ' + err.message)
      })
    return () => {
      cancelled = true
    }
  }, [book, chapter, readingTranslation])

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

  // The reading pane already shows `readingTranslation` as the anchor text --
  // drop it from the comparison list if the user switches the reader to a
  // translation that's also toggled on there, so it doesn't sit active with
  // nothing rendered for it.
  useEffect(() => {
    setCompareIds((prev) => prev.filter((id) => id !== readingTranslation))
  }, [readingTranslation])

  // Fetches every selected comparison translation for the current chapter --
  // re-runs whenever the chapter, reading translation, or the toggled set
  // changes. Uses the same normalized fetch as the reading pane, so BSB/ESV/
  // Free Use Bible API translations are all handled uniformly here.
  useEffect(() => {
    const ids = compareIds.filter((id) => id !== readingTranslation)
    if (!showCompare || ids.length === 0) return
    let cancelled = false
    setCompareData((prev) => {
      const next = { ...prev }
      ids.forEach((id) => {
        next[id] = { status: 'loading', verses: null }
      })
      return next
    })
    ids.forEach((id) => {
      fetchChapterVersesFor(id, book, chapter)
        .then((verses) => {
          if (cancelled) return
          setCompareData((prev) => ({ ...prev, [id]: { status: 'ready', verses } }))
        })
        .catch((err) => {
          if (cancelled) return
          setCompareData((prev) => ({ ...prev, [id]: { status: 'error', verses: null, message: err.message } }))
        })
    })
    return () => {
      cancelled = true
    }
  }, [showCompare, compareIds, book, chapter, readingTranslation])

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
    return verses.filter((v) => v.number >= verseRange.start && v.number <= verseRange.end)
  }, [verses, verseRange])

  // Groups displayedVerses into paragraphs wherever paragraphStart says one
  // begins -- real USX paragraph boundaries for the API.Bible translations,
  // or one verse per paragraph as a fallback for sources without that data.
  // The first verse of whatever's currently displayed always starts a group,
  // even mid-chapter, so a narrowed verse range never opens looking like a
  // paragraph fragment missing its start.
  const paragraphs = useMemo(() => {
    if (!displayedVerses) return []
    const groups = []
    for (const v of displayedVerses) {
      if (v.paragraphStart || groups.length === 0) groups.push([v])
      else groups[groups.length - 1].push(v)
    }
    return groups
  }, [displayedVerses])

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
    () => (verses || []).filter((v) => selectedVerses.has(v.number)).map((v) => v.text).join(' '),
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

  const readingMeta = ALL_TRANSLATIONS.find((t) => t.id === readingTranslation) || BSB_OPTION
  const sidePanelOpen = showCommentary || showCompare

  return (
    <div className="max-w-[1180px] mx-auto page">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <div className="card-kicker mb-1">{readingMeta.name}</div>
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

          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <select
              className="input"
              style={{ width: 'auto' }}
              value={readingTranslation}
              onChange={(e) => setReadingTranslation(e.target.value)}
              aria-label="Reading translation"
            >
              {ALL_TRANSLATIONS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <div className="flex gap-2 flex-wrap ml-auto">
              <button type="button" className="btn btn-secondary" onClick={() => setShowCommentary((v) => !v)}>
                {showCommentary ? 'Hide commentary' : 'Commentary'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowCrossRefs((v) => !v)}>
                {showCrossRefs ? 'Hide cross references' : 'Cross references'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowCompare((v) => !v)}>
                {showCompare ? 'Hide comparison' : 'Compare translations'}
              </button>
            </div>
          </div>

          <div className="flex gap-4 items-start flex-wrap lg:flex-nowrap">
            <div className={sidePanelOpen ? 'flex-1 min-w-[280px]' : 'w-full max-w-[720px] mx-auto'}>
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
                    {paragraphs.map((group) => (
                      <p key={group[0].number} style={{ fontSize: 17, lineHeight: 1.75, marginBottom: '1em' }}>
                        {group.map((v) => (
                          <span
                            key={v.number}
                            onClick={() => toggleVerse(v.number)}
                            className="cursor-pointer"
                            style={{
                              background: selectedVerses.has(v.number) ? 'var(--color-accent-100)' : 'transparent',
                              borderRadius: 6,
                              padding: '2px 3px',
                            }}
                          >
                            <sup style={{ color: 'var(--color-accent)', fontWeight: 700, marginRight: 3, fontSize: 12 }}>{v.number}</sup>
                            {v.text + ' '}
                          </span>
                        ))}
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
            </div>

            {sidePanelOpen && (
              <div className="flex flex-col gap-3 w-full" style={{ maxWidth: 380 }}>
                {showCommentary && (
                  <div className="card" style={{ padding: '16px 20px' }}>
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
                    <p className="mt-2" style={{ fontSize: 11, color: 'color-mix(in srgb, var(--color-text) 50%, transparent)' }}>
                      {commentaryData?.commentary?.name || 'Commentary'} — via the{' '}
                      <a href="https://bible.helloao.org" target="_blank" rel="noopener noreferrer">
                        Free Use Bible API
                      </a>
                    </p>
                  </div>
                )}

                {showCompare && (
                  <div className="card" style={{ padding: '16px 20px' }}>
                    <div className="card-kicker mb-2">Compare Translations</div>
                    {selectedSorted.length === 0 ? (
                      <p className="text-sm" style={{ opacity: 0.6 }}>
                        Tap a verse to compare translations.
                      </p>
                    ) : (
                      <>
                        <div className="flex gap-1.5 flex-wrap mb-3">
                          {ALL_TRANSLATIONS.filter((t) => t.id !== readingTranslation).map((t) => {
                            const active = compareIds.includes(t.id)
                            return (
                              <button
                                key={t.id}
                                type="button"
                                className="tag font-body font-medium"
                                style={{
                                  background: active ? 'var(--color-accent)' : 'var(--color-surface)',
                                  color: active ? 'var(--color-bg)' : 'var(--color-text)',
                                  border: '1px solid var(--color-divider)',
                                }}
                                onClick={() =>
                                  setCompareIds((prev) => (active ? prev.filter((id) => id !== t.id) : [...prev, t.id]))
                                }
                              >
                                {t.short}
                              </button>
                            )
                          })}
                        </div>
                        <div className="flex flex-col gap-3">
                          <div>
                            <div className="card-meta mb-1">
                              {readingMeta.short} — {readingMeta.name}
                            </div>
                            <p style={{ fontSize: 14, lineHeight: 1.6 }}>
                              {(verses || [])
                                .filter((v) => selectedVerses.has(v.number))
                                .map((v) => `${v.number} ${v.text}`)
                                .join('  ')}
                            </p>
                          </div>
                          {compareIds.length === 0 ? (
                            <p className="text-sm" style={{ opacity: 0.6 }}>
                              Pick at least one translation above.
                            </p>
                          ) : (
                            compareIds.map((id) => {
                              const meta = ALL_TRANSLATIONS.find((t) => t.id === id)
                              const entry = compareData[id]
                              return (
                                <div key={id}>
                                  <div className="card-meta mb-1">
                                    {meta?.short} — {meta?.name}
                                  </div>
                                  {!entry || entry.status === 'loading' ? (
                                    <div className="flex items-center gap-2 text-sm" style={{ opacity: 0.7 }}>
                                      <Loader2 size={13} strokeWidth={2.75} className="animate-spin" /> Loading…
                                    </div>
                                  ) : entry.status === 'error' ? (
                                    <p className="text-sm" style={{ opacity: 0.6 }}>
                                      Couldn't load {meta?.short}
                                      {entry.message ? ` — ${entry.message}` : '.'}
                                    </p>
                                  ) : (
                                    <p style={{ fontSize: 14, lineHeight: 1.6 }}>
                                      {entry.verses
                                        .filter((v) => selectedVerses.has(v.number))
                                        .map((v) => `${v.number} ${v.text}`)
                                        .join('  ')}
                                    </p>
                                  )}
                                </div>
                              )
                            })
                          )}
                        </div>
                      </>
                    )}
                    <p className="mt-2" style={{ fontSize: 11, color: 'color-mix(in srgb, var(--color-text) 50%, transparent)' }}>
                      ESV® via Crossway; NIV/NLT/CSB via{' '}
                      <a href="https://scripture.api.bible" target="_blank" rel="noopener noreferrer">
                        API.Bible
                      </a>
                      ; other translations via the{' '}
                      <a href="https://bible.helloao.org" target="_blank" rel="noopener noreferrer">
                        Free Use Bible API
                      </a>
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {showCrossRefs && (
            <div className="card mt-3" style={{ padding: '16px 20px' }}>
              <div className="card-kicker mb-2">Cross References</div>
              {selectedSorted.length === 0 ? (
                <p className="text-sm" style={{ opacity: 0.6 }}>
                  Tap a verse to see related verses.
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
              <p className="mt-2" style={{ fontSize: 11, color: 'color-mix(in srgb, var(--color-text) 50%, transparent)' }}>
                Cross references from OpenBible.info (CC BY 4.0), via the{' '}
                <a href="https://bible.helloao.org" target="_blank" rel="noopener noreferrer">
                  Free Use Bible API
                </a>
              </p>
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
