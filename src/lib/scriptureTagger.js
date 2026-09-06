// Detects Bible references inline in free-flowing prose (Notebook entries),
// similar in spirit to Blue Letter Bible's ScriptTagger widget -- but native,
// so it can render using the app's own theming and link into Bible Study
// instead of embedding a third-party script that phones home to BLB.
import { bookNamePatterns, resolveBookName } from './entries'

let _refRegex = null
function referenceRegex() {
  if (_refRegex) return _refRegex
  const bookAlt = bookNamePatterns()
    .map((p) => p.pattern)
    .join('|')
  _refRegex = new RegExp(`\\b(${bookAlt})\\.?\\s+(\\d{1,3})(?:\\s*:\\s*(\\d{1,3})(?:\\s*[-–]\\s*(\\d{1,3}))?)?\\b`, 'gi')
  return _refRegex
}

// Returns every reference found in `text`, in order, as
// [{ index, length, raw, book, chapter, verseStart, verseEnd }, ...].
// index/length describe where in the original string the match sits, so
// callers can slice the text around each one without re-searching.
export function findReferences(text) {
  if (!text) return []
  const regex = referenceRegex()
  regex.lastIndex = 0
  const matches = []
  let m
  while ((m = regex.exec(text))) {
    const [raw, bookRaw, chapterStr, verseStartStr, verseEndStr] = m
    const book = resolveBookName(bookRaw)
    if (!book) continue
    const verseStart = verseStartStr ? parseInt(verseStartStr, 10) : null
    matches.push({
      index: m.index,
      length: raw.length,
      raw,
      book,
      chapter: parseInt(chapterStr, 10),
      verseStart,
      verseEnd: verseEndStr ? parseInt(verseEndStr, 10) : verseStart,
    })
  }
  return matches
}
