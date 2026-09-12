import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Search as SearchIcon, ChevronLeft, ChevronRight, Copy, NotebookPen, X, Loader2, BookOpen, Link2, Languages, FileText, MapPin, Clock, ChartColumn, ExternalLink, ChevronDown } from 'lucide-react'
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

import { useAuth } from '../App'
import StudySection from '../components/StudySection'
import StudyPersonalSidebar from '../components/StudyPersonalSidebar'
import './BibleStudy.css'

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
  const readerRef = useRef(null)
  const [readerFullscreen, setReaderFullscreen] = useState(false)
  const [fullscreenError, setFullscreenError] = useState('')
  useEffect(() => {
    const sync = () => setReaderFullscreen(Boolean(readerRef.current) && document.fullscreenElement === readerRef.current)
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])
  async function toggleReaderFullscreen() {
    setFullscreenError('')
    try {
      if (document.fullscreenElement === readerRef.current) await document.exitFullscreen()
      else await readerRef.current.requestFullscreen()
    } catch {
      setFullscreenError('Fullscreen could not open in this browser. Try opening this page in a separate browser window.')
    }
  }
  const navigate = useNavigate()
  const user = useAuth()
  const [toolNotice, setToolNotice] = useState('')
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

  const [showCommentary, setShowCommentary] = useState(searchParams.get('panel') === 'commentary')
  const [commentaryId, setCommentaryId] = useState(() => COMMENTARIES.find(c => c.id === searchParams.get('commentary'))?.id || 'matthew-henry')
  const [commentaryData, setCommentaryData] = useState(null) // null = not loaded, false = error
  const [commentaryLoading, setCommentaryLoading] = useState(false)

  const activeCommentaryBlockRef = useRef(null)

  const [showCrossRefs, setShowCrossRefs] = useState(false)
  const [crossRefData, setCrossRefData] = useState(null)
  const [crossRefLoading, setCrossRefLoading] = useState(false)

  const [showCompare, setShowCompare] = useState(true)
  const [compareIds, setCompareIds] = useState(['eng_kjv', 'eng_asv', 'ENGWEBP'])
  const [compareData, setCompareData] = useState({}) // translationId -> { status: 'loading'|'ready'|'error', verses }

  const [searchQuery, setSearchQuery] = useState('')
  const [searchTestament, setSearchTestament] = useState('')
  const [searchBook, setSearchBook] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const searchDebounce = useRef(null)

  // Deep link from global Search or the Notebook reference tagger:
  // /bible?book=Romans&chapter=8&verse=28 (optionally &verseEnd=30 for a range)
  const appliedDeepLink = useRef(false)
  useEffect(() => {
    if (appliedDeepLink.current) return
    appliedDeepLink.current = true
    const qBook = searchParams.get('book')
    const qChapter = searchParams.get('chapter')
    const qVerse = searchParams.get('verse')
    const qVerseEnd = searchParams.get('verseEnd')
    if (qBook && qChapter) {
      setBook(qBook)
      setChapter(parseInt(qChapter, 10) || 1)
      if (qVerse) {
        const start = parseInt(qVerse, 10)
        const end = qVerseEnd ? parseInt(qVerseEnd, 10) : start
        setPendingRange({ start, end })
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
      setSearchQuery(quickRef)
      setViewMode('Search')
      setRefError('')
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
  const passageRef = formatReference(book, chapter, verseRange?.start, verseRange?.end)
  const hubBook = ({'Song of Solomon':'songs', 'Psalms':'psalms'})[book] || book.toLowerCase().replaceAll(' ', '_')
  const interlinearUrl = `https://biblehub.com/interlinear/${hubBook}/${chapter}.htm`
  const name = user.user_metadata?.display_name || user.user_metadata?.full_name?.split(' ')[0] || 'Reader'
  const draftNote = (analysis = false) => navigate('/notebook/new', {state:{ref:selectionRef || passageRef, body:analysis ? 'Observations\n\nThemes and repeated words:\n\nPeople and places:\n\nWhat does this reveal about God?\n\nApplication:\n' : selectionText ? `“${selectionText}”` : ''}})
  const columns = [{id:readingTranslation, meta:readingMeta, entry:{status:verses === null?'loading':'ready', verses:displayedVerses}}, ...(showCompare ? compareIds.filter(id=>id!==readingTranslation).map(id=>({id,meta:ALL_TRANSLATIONS.find(t=>t.id===id),entry:compareData[id]})) : [])]
  function renderVerses(rows, anchor) {
    const scoped=(rows || []).filter(v=>!verseRange || (v.number>=verseRange.start && v.number<=verseRange.end))
    return <div className="bible-verse-text">{scoped.map(v=><span key={v.number} className={selectedVerses.has(v.number)?'is-selected':''} role={anchor?'button':undefined} tabIndex={anchor?0:undefined} aria-pressed={anchor?selectedVerses.has(v.number):undefined} aria-label={anchor?`Select verse ${v.number}: ${v.text}`:undefined} onClick={anchor?()=>toggleVerse(v.number):undefined} onKeyDown={anchor?e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleVerse(v.number)}}:undefined}><sup>{v.number}</sup>{v.text}{' '}</span>)}</div>
  }
  return <div className="page bible-desk">
    <div className="bible-topbar">
      <form className="bible-lookup" onSubmit={handleQuickRef} role="search">
        <SearchIcon size={19}/><input aria-label="Passage or Bible search" value={quickRef} onChange={e=>setQuickRef(e.target.value)} placeholder="Enter a passage (e.g. John 3:16) or search the Bible…"/>
        <select aria-label="Reading translation" value={readingTranslation} onChange={e=>setReadingTranslation(e.target.value)}>{ALL_TRANSLATIONS.map(t=><option key={t.id} value={t.id}>{t.short}</option>)}</select><button className="btn btn-primary">Go</button>
      </form>
      <Link className="bible-account" to="/settings/profile"><span>{name.slice(0,2).toUpperCase()}</span>{name}<ChevronDown size={14}/></Link>
      <blockquote className="bible-header-quote">“Your word is a lamp to my feet and a light to my path.”<cite>Psalm 119:105 · BSB</cite></blockquote>
    </div>
    <header className="bible-title"><h1>Bible Study</h1><p>Read. Compare. Explore. Understand.</p></header>
    {refError && <p role="alert">{refError}</p>}
    {viewMode === 'Read' ? <div className="bible-grid">
      <section className="bible-reading" aria-label="Passage reader" ref={readerRef}>
        <div className="card bible-toolbar">
          <button className="btn btn-secondary bible-fullscreen-toggle" aria-pressed={readerFullscreen} onClick={toggleReaderFullscreen}>{readerFullscreen ? 'Exit fullscreen' : 'Fullscreen'}</button>
          <button className="btn btn-secondary" onClick={()=>setShowPicker(true)}>{passageRef}<ChevronDown size={14}/></button>
          <details className="bible-translations"><summary>Translations ({columns.length})</summary><div>{ALL_TRANSLATIONS.filter(t=>t.id!==readingTranslation).map(t=><label key={t.id}><input type="checkbox" checked={compareIds.includes(t.id)} onChange={()=>setCompareIds(ids=>ids.includes(t.id)?ids.filter(id=>id!==t.id):[...ids,t.id])}/>{t.short}</label>)}</div></details>
          <div className="bible-chapter-nav"><button className="btn btn-icon btn-secondary" onClick={()=>stepChapter(-1)} disabled={chapter<=1} aria-label="Previous chapter"><ChevronLeft size={16}/></button><button className="btn btn-icon btn-secondary" onClick={()=>stepChapter(1)} disabled={chapterCount!=null && chapter>=chapterCount} aria-label="Next chapter"><ChevronRight size={16}/></button></div>
          <div className="bible-view-modes"><button className={`btn ${showCompare?'btn-primary':'btn-secondary'}`} aria-pressed={showCompare} onClick={()=>setShowCompare(true)}>Parallel</button><button className={`btn ${!showCompare?'btn-primary':'btn-secondary'}`} aria-pressed={!showCompare} onClick={()=>setShowCompare(false)}>Single</button><a className="btn btn-secondary" href={interlinearUrl} target="_blank" rel="noreferrer">Interlinear <ExternalLink size={12}/></a></div>
        </div>
        {fullscreenError && <p role="alert">{fullscreenError}</p>}
        <div className="card bible-reader-card">
          <div className="bible-reader-heading"><h2>{passageRef}</h2><div><button className="btn btn-icon" onClick={()=>copy('passage',`${passageRef} (${readingMeta.short})\n${(displayedVerses||[]).map(v=>`${v.number} ${v.text}`).join('\n')}`)} aria-label="Copy passage"><Copy size={17}/></button><button className="btn btn-icon" onClick={()=>draftNote()} aria-label="Create study note"><NotebookPen size={17}/></button></div></div>
          {showCompare && <p className="bible-swipe-hint">Swipe across to compare translations.</p>}
          <div className={`bible-parallel ${showCompare?'':'is-single'}`} tabIndex={0} role="region" aria-label="Bible translation text">
            {columns.map(({id,meta,entry},index)=><article className="bible-translation" key={id}><h3>{meta?.short}</h3>{!entry || entry.status==='loading'?<p role="status">Loading {meta?.short}…</p>:entry.status==='error'?<p role="alert">Could not load {meta?.short}. {entry.message}</p>:entry.verses?.length?renderVerses(entry.verses,index===0):<p>No text is available for this passage.</p>}</article>)}
          </div>
          <div className="bible-reader-footer"><span>Select verses in {readingMeta.short} to study or save them.</span>{verseRange && <button className="btn btn-ghost" onClick={()=>setVerseRange(null)}>Show whole chapter</button>}</div>
          {selectedSorted.length>0 && <div className="bible-selection"><strong>{selectionRef}</strong><button className="btn btn-secondary" onClick={()=>copy('text',selectionText)}>Copy text</button><button className="btn btn-secondary" onClick={()=>copy('ref',selectionRef)}>Copy reference</button><button className="btn btn-primary" onClick={handleCreateEntry}>Create Note</button><button className="btn btn-ghost" onClick={()=>setSelectedVerses(new Set())}>Clear</button></div>}
          {copied && <p role="status">Copied!</p>}
          <small className="bible-attribution">BSB is public domain. ESV® via Crossway; NIV/NLT/CSB via API.Bible; other translations via Free Use Bible API.</small>
        </div>
      </section>
      <aside className="bible-tools-column" aria-label="Study tools">
        <StudySection title="Study Tools for This Passage"><div className="bible-tool-grid">
          <button aria-pressed={showCrossRefs} onClick={()=>setShowCrossRefs(v=>!v)}><Link2/>Cross-References</button>
          <a href={interlinearUrl} target="_blank" rel="noreferrer"><Languages/>Word Study <small>External ↗</small></a>
          <button onClick={()=>setToolNotice(toolNotice?'':'Textual variants require a dedicated manuscript source. This tool is not connected yet.')}><FileText/>Textual Variants <small>Not connected</small></button>
          <button aria-pressed={showCompare} onClick={()=>setShowCompare(v=>!v)}><BookOpen/>Translation Compare</button>
          <button onClick={()=>draftNote()}><NotebookPen/>Study Notes</button>
          <button onClick={()=>draftNote(true)}><ChartColumn/>Passage Analysis <small>Guided note</small></button>
          <a href="https://biblehub.com/atlas/" target="_blank" rel="noreferrer"><MapPin/>Biblical Maps <small>External ↗</small></a>
          <a href="https://biblehub.com/timeline/" target="_blank" rel="noreferrer"><Clock/>Timeline <small>External ↗</small></a>
        </div>{toolNotice && <p role="status">{toolNotice}</p>}<button className="btn btn-secondary" aria-expanded={showCommentary} onClick={()=>setShowCommentary(v=>!v)}>{showCommentary?'Hide commentary':'Open commentary'}</button></StudySection>
        <StudySection title="Quick Insights"><p className="bible-muted">Questions to guide your study of {passageRef}.</p><dl className="bible-insights"><dt>Key Themes</dt><dd>Which words or ideas are repeated?</dd><dt>Key People</dt><dd>Who is speaking, acting, or being addressed?</dd><dt>Key Places</dt><dd>Where does this passage take place?</dd><dt>Key Doctrines</dt><dd>What does this reveal about God and His work?</dd></dl><button className="btn btn-ghost" onClick={()=>draftNote(true)}>Capture your insights →</button></StudySection>
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

      </aside>
      <StudyPersonalSidebar book={book} chapter={chapter} passageRef={passageRef}/>
    </div> : <section className="bible-search-results"><button className="btn btn-secondary mb-3" onClick={()=>setViewMode('Read')}>← Return to {passageRef}</button>
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
                  className="card sm:!flex-row items-start gap-3 text-left hover:shadow-sm"
                  style={{ padding: '12px 16px' }}
                  onClick={() => goTo(v.book_name, v.chapter, v.verse)}
                >
                  <span className="tag tag-accent shrink-0">
                    {v.book_name} {v.chapter}:{v.verse}
                  </span>
                  <span className="scripture-text">{highlightTerms(v.text, searchQuery)}</span>
                </button>
              ))}
            </div>
          )}

    </section>}
    {showPicker && <BookPickerDialog initialBook={book} onPick={goTo} onClose={()=>setShowPicker(false)}/>}
  </div>
}
