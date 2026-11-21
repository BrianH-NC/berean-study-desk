import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './CommentaryCompare.css'
import { commentariesForBook, fetchCommentaryChapter } from '../lib/helloao'
import { MAX_COMPARED, chooseCompared, spanLabel, spansForVerses, toggleCompared, uncoveredVerses, verseSummary } from '../lib/commentaryBlocks'
import { commentarySourceFor } from '../lib/excerpts'
import { commentaryLinkRefs } from './commentaryLinkRefs'
import ExcerptNote from './ExcerptNote'

const STORAGE_KEY = 'bsd:compare-commentaries'
// A per-viewer convenience, so it can fail quietly (private windows, blocked storage).
function readSaved() {
  try { const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY)); return Array.isArray(saved) ? saved : [] } catch { return [] }
}
function writeSaved(ids) {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)) } catch { /* not worth interrupting a study */ }
}

// One request per commentary chapter for the whole session. A chapter a commentary
// doesn't have is remembered; a failed request is not, so "Try again" really retries.
const chapterCache = new Map()
function loadChapter(id, book, chapter) {
  const key = `${id}|${book}|${chapter}`
  if (!chapterCache.has(key)) {
    chapterCache.set(key, fetchCommentaryChapter(id, book, chapter)
      .then((data) => ({ status: 'ok', content: data.chapter.content }))
      .catch((error) => {
        if (/^No commentary chapter/.test(error.message)) return { status: 'missing' }
        chapterCache.delete(key)
        return { status: 'error' }
      }))
  }
  return chapterCache.get(key)
}

const LONG_NOTE = 1400   // characters before a note is folded

function Note({ text, source, noteTarget, linkRefs }) {
  const [open, setOpen] = useState(false)
  const long = text.length > LONG_NOTE
  const words = text.split(/\s+/).length
  // Saving from a folded note opens it: the save panel would otherwise be clipped by the fold.
  const onSaving = useCallback((on) => { if (on) setOpen(true) }, [])
  return (
    <>
      <div className={`cc-note${long && !open ? ' is-folded' : ''}`}>
        {/* The text of a folded note stays selectable; its clipped save buttons just leave the tab order until it is opened. */}
        <ExcerptNote text={text} source={source} noteTarget={noteTarget} tabbable={!long || open} onSaving={onSaving} linkRefs={linkRefs} />
      </div>
      {long && <button type="button" className="btn btn-ghost cc-fold" aria-expanded={open} onClick={() => setOpen((o) => !o)}>{open ? 'Show less' : `Read the full note (${words.toLocaleString()} words)`}</button>}
    </>
  )
}

function Card({ meta, result, book, chapter, verses, noteTarget, onGoTo, onRetry }) {
  // Each Scripture reference in a note opens its verse.
  const linkRefs = commentaryLinkRefs(meta.id, book, chapter, onGoTo)
  let body
  if (!result) body = <p role="status" className="cc-status">Loading…</p>
  else if (result.status === 'error') body = <p role="alert" className="cc-status">Couldn’t load this commentary. <button type="button" className="btn btn-ghost" onClick={onRetry}>Try again</button></p>
  else if (result.status === 'missing') body = <p className="cc-status">This commentary has no notes on this chapter.</p>
  else {
    const spans = spansForVerses(result.content, verses)
    const skipped = uncoveredVerses(spans, verses)
    body = spans.length
      ? <>
        {spans.map((span) => <section key={span.from} className="cc-span"><div className="cc-range">{spanLabel(span)}</div><Note text={span.text} source={commentarySourceFor(meta, book, chapter, span)} noteTarget={noteTarget} linkRefs={linkRefs} /></section>)}
        {skipped.length > 0 && <p className="cc-status cc-skipped">No note on verse{skipped.length > 1 ? 's' : ''} {verseSummary(skipped)}.</p>}
      </>
      : <p className="cc-status">No note on {verses.length === 1 ? 'this verse' : 'these verses'} in this commentary.</p>
  }
  return <article className="cc-card"><h3>{meta.name}</h3>{body}</article>
}

// Side-by-side notes from several commentaries on the selected verse(s).
export default function CommentaryCompare({ book, chapter, verses, defaulted, noteTarget, onGoTo, onClose }) {
  const available = useMemo(() => commentariesForBook(book), [book])
  const availableIds = useMemo(() => available.map((c) => c.id), [available])
  const [chosen, setChosen] = useState(() => chooseCompared(availableIds, readSaved()))
  const [results, setResults] = useState({})
  const [retry, setRetry] = useState(0)
  const dialog = useRef(null)
  const closeButton = useRef(null)

  useEffect(() => {
    let active = true
    for (const id of chosen) {
      loadChapter(id, book, chapter).then((result) => {
        if (active) setResults((prev) => (prev[`${id}|${book}|${chapter}`] === result ? prev : { ...prev, [`${id}|${book}|${chapter}`]: result }))
      })
    }
    return () => { active = false }
  }, [chosen, book, chapter, retry])

  // Focus moves into the dialog and comes back to whatever opened it.
  useEffect(() => {
    const opener = document.activeElement
    closeButton.current?.focus()
    return () => { if (opener?.isConnected) opener.focus() }
  }, [])

  function onKeyDown(e) {
    if (e.key === 'Escape') { e.stopPropagation(); onClose(); return }
    if (e.key !== 'Tab') return
    const focusable = [...dialog.current.querySelectorAll('button:not([disabled]):not([tabindex="-1"]), a[href], select:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    if (!focusable.length) return
    const first = focusable[0], last = focusable[focusable.length - 1]
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }

  function toggle(id) {
    const next = toggleCompared(chosen, id, availableIds)
    setChosen(next)
    writeSaved(next)
  }

  const atMax = chosen.length >= MAX_COMPARED
  return (
    <div className="cc-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="cc-dialog" role="dialog" aria-modal="true" aria-labelledby="cc-title" ref={dialog} onKeyDown={onKeyDown}>
        <header className="cc-header">
          <div>
            <h2 id="cc-title">Compare commentaries</h2>
            <p className="cc-verses">{book} {chapter}:{verseSummary(verses)}</p>
          </div>
          <button type="button" className="btn btn-secondary" ref={closeButton} onClick={onClose} aria-label="Close comparison">Close ×</button>
        </header>
        {defaulted && <p className="cc-hint">Showing verse {verses[0]}. Select a verse in the reading pane first to compare a different one.</p>}
        <div className="cc-picker" role="group" aria-label={`Commentaries to compare, up to ${MAX_COMPARED}`}>
          {available.map((c) => {
            const on = chosen.includes(c.id)
            return <button key={c.id} type="button" className="cc-chip" aria-pressed={on} disabled={!on && atMax} onClick={() => toggle(c.id)}>{c.name}</button>
          })}
        </div>
        {atMax && <p className="cc-hint">Up to {MAX_COMPARED} at a time. Turn one off to add another.</p>}
        <div className="cc-grid">
          {chosen.map((id) => {
            const meta = available.find((c) => c.id === id)
            return meta && <Card key={id} meta={meta} book={book} chapter={chapter} verses={verses} noteTarget={noteTarget} onGoTo={onGoTo} result={results[`${id}|${book}|${chapter}`]} onRetry={() => setRetry((n) => n + 1)} />
          })}
        </div>
        <p className="cc-source">Commentaries are classic public-domain works, served by the Free Use Bible API. Notes cover different ranges of verses, so the range is shown on each.</p>
      </div>
    </div>
  )
}
