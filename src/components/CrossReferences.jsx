import { useEffect, useMemo, useState } from 'react'
import './CrossReferences.css'
import { fetchVerseTexts } from '../lib/bsb'
import { bookNameForCode, bookNumberForCode } from '../lib/helloao'
import { INITIAL_REFS, previewText, rangesFor, refLabel, refsForVerse, relativeStrength } from '../lib/crossReferences'

// Verse text already fetched for earlier previews, kept for the session so
// reopening a verse or expanding a list doesn't fetch it again.
const textCache = new Map()

function useVerseTexts(refs) {
  const [, rerender] = useState(0)
  useEffect(() => {
    const missing = rangesFor(refs, bookNumberForCode).filter((r) => {
      for (let v = r.start; v <= r.end; v++) if (!textCache.has(`${r.bookNumber}:${r.chapter}:${v}`)) return true
      return false
    })
    if (!missing.length) return
    let active = true
    fetchVerseTexts(missing).then((found) => {
      found.forEach((text, key) => textCache.set(key, text))
      if (active) rerender((n) => n + 1)
    }).catch(() => {})   // a reference without a preview is still a working link
    return () => { active = false }
  }, [refs])
  return textCache
}

function VerseReferences({ book, chapter, verse, refs, onGoTo }) {
  const [expanded, setExpanded] = useState(false)
  const shown = useMemo(() => (expanded ? refs : refs.slice(0, INITIAL_REFS)), [refs, expanded])
  const texts = useVerseTexts(shown)
  return (
    <section className="xref-verse" aria-label={`Cross references for ${book} ${chapter}:${verse}`}>
      <div className="card-meta mb-1">{book} {chapter}:{verse}{refs.length ? ` · ${refs.length} cross reference${refs.length === 1 ? '' : 's'}` : ''}</div>
      {refs.length === 0 ? <p className="text-sm xref-none">No cross references found.</p> : (
        <ul className="xref-list">
          {shown.map((ref) => {
            const text = previewText(ref, texts, bookNumberForCode)
            return (
              <li className="xref-item" key={`${ref.book}.${ref.chapter}.${ref.verse}.${ref.endVerse || ''}`}>
                <div className="xref-head">
                  <button type="button" className="xref-ref" onClick={() => onGoTo(bookNameForCode(ref.book), ref.chapter, ref.verse, ref.endVerse)}>{refLabel(ref, bookNameForCode)}</button>
                  <span className="xref-strength" title="How strongly this link is voted up" aria-hidden="true"><span style={{ width: `${Math.round(relativeStrength(ref, refs) * 100)}%` }} /></span>
                </div>
                {text && <p className="xref-text">{text}</p>}
              </li>
            )
          })}
        </ul>
      )}
      {refs.length > INITIAL_REFS && (
        <button type="button" className="btn btn-ghost xref-more" aria-expanded={expanded} onClick={() => setExpanded((e) => !e)}>
          {expanded ? 'Show fewer' : `Show all ${refs.length}`}
        </button>
      )}
    </section>
  )
}

// The cross references of each selected verse, strongest first, each with the
// verse text (Berean Standard Bible) so you can judge a link without leaving the page.
export default function CrossReferences({ data, book, chapter, verses, onGoTo }) {
  return (
    <div className="xref-panel">
      {verses.map((verse) => <VerseReferences key={verse} book={book} chapter={chapter} verse={verse} refs={refsForVerse(data, verse)} onGoTo={onGoTo} />)}
      <p className="xref-note">Verse text shown is the Berean Standard Bible.</p>
    </div>
  )
}
