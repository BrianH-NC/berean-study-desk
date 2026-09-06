import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { findReferences } from '../lib/scriptureTagger'
import { fetchVerseRange, formatReference } from '../lib/bsb'

// Renders free-flowing prose (a Notebook entry's body) with any Bible
// references it contains turned into tappable inline links -- similar in
// spirit to Blue Letter Bible's ScriptTagger widget, but native: tapping a
// reference previews it (via the app's own local BSB copy, so it's instant
// and free) in a popover with a link into Bible Study, rather than embedding
// a third-party script.
export default function ScriptureText({ text, style }) {
  const [openMatch, setOpenMatch] = useState(null) // the match object currently showing a popover, or null
  const containerRef = useRef(null)

  useEffect(() => {
    if (!openMatch) return
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpenMatch(null)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openMatch])

  if (!text) return null

  const matches = findReferences(text)
  if (matches.length === 0) {
    return (
      <p style={style} className="whitespace-pre-wrap">
        {text}
      </p>
    )
  }

  const segments = []
  let cursor = 0
  matches.forEach((m, i) => {
    if (m.index > cursor) segments.push({ type: 'text', value: text.slice(cursor, m.index) })
    segments.push({ type: 'ref', match: m, key: i })
    cursor = m.index + m.length
  })
  if (cursor < text.length) segments.push({ type: 'text', value: text.slice(cursor) })

  return (
    <p ref={containerRef} style={{ ...style, position: 'relative' }} className="whitespace-pre-wrap">
      {segments.map((seg, i) =>
        seg.type === 'text' ? (
          <span key={i}>{seg.value}</span>
        ) : (
          <ReferenceTag
            key={i}
            match={seg.match}
            isOpen={openMatch === seg.match}
            onToggle={() => setOpenMatch(openMatch === seg.match ? null : seg.match)}
          />
        )
      )}
    </p>
  )
}

function ReferenceTag({ match, isOpen, onToggle }) {
  const [verses, setVerses] = useState(null) // null = not loaded, false = error
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen || verses !== null) return
    let cancelled = false
    setLoading(true)
    fetchVerseRange(match.book, match.chapter, match.verseStart ?? 1, match.verseEnd ?? match.verseStart ?? 1)
      .then((rows) => {
        if (!cancelled) setVerses(rows)
      })
      .catch(() => {
        if (!cancelled) setVerses(false)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isOpen, verses, match])

  const bibleLink = `/bible?book=${encodeURIComponent(match.book)}&chapter=${match.chapter}${
    match.verseStart ? `&verse=${match.verseStart}` : ''
  }${match.verseEnd && match.verseEnd !== match.verseStart ? `&verseEnd=${match.verseEnd}` : ''}`

  const label = match.verseStart
    ? formatReference(match.book, match.chapter, match.verseStart, match.verseEnd)
    : `${match.book} ${match.chapter}`

  return (
    <span style={{ position: 'relative', whiteSpace: 'nowrap' }}>
      <span
        onClick={(e) => {
          e.stopPropagation()
          onToggle()
        }}
        className="cursor-pointer"
        style={{
          color: 'var(--color-accent)',
          fontWeight: 600,
          borderBottom: '1px dotted var(--color-accent)',
        }}
      >
        {match.raw}
      </span>
      {isOpen && (
        <span
          className="card"
          style={{
            position: 'absolute',
            zIndex: 20,
            top: '100%',
            left: 0,
            marginTop: 6,
            width: 300,
            maxWidth: '80vw',
            padding: '12px 14px',
            whiteSpace: 'normal',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          }}
        >
          <span className="card-kicker" style={{ display: 'block', marginBottom: 4 }}>
            {label}
          </span>
          {loading ? (
            <span className="text-sm" style={{ opacity: 0.6, display: 'block' }}>
              Loading…
            </span>
          ) : verses === false ? (
            <span className="text-sm" style={{ opacity: 0.6, display: 'block' }}>
              Couldn't load that reference.
            </span>
          ) : verses ? (
            <span style={{ fontSize: 14, lineHeight: 1.6, display: 'block' }}>
              {verses.map((v) => v.text).join(' ')}
            </span>
          ) : null}
          <Link
            to={bibleLink}
            className="btn btn-secondary !text-[12px] mt-2"
            style={{ display: 'inline-flex' }}
            onClick={(e) => e.stopPropagation()}
          >
            Open in Bible Study
          </Link>
        </span>
      )}
    </span>
  )
}
