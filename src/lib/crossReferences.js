// Pure helpers for Bible Study's cross-reference panel. The data is OpenBible.info's
// cross references (CC BY 4.0) as served by the Free Use Bible API: for each verse of
// a chapter, a list of { book, chapter, verse, endVerse?, score } where score is how
// strongly the link is voted up.

// How many references show before "Show all".
export const INITIAL_REFS = 8
// A reference spanning many verses previews only its first few.
export const PREVIEW_VERSES = 6

// The references for one verse of a chapter payload, strongest first.
export function refsForVerse(data, verse) {
  const entry = data?.chapter?.content?.find((c) => c.verse === verse)
  return [...(entry?.references || [])].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
}

// "Romans 5:8" or "1 John 4:9-10". `nameFor` turns the API's book code into a name.
export function refLabel(ref, nameFor) {
  const range = ref.endVerse && ref.endVerse !== ref.verse ? `-${ref.endVerse}` : ''
  return `${nameFor(ref.book)} ${ref.chapter}:${ref.verse}${range}`
}

// 0..1 -- this reference's strength against the strongest one for the verse, never
// so small that its bar disappears.
export function relativeStrength(ref, refs) {
  const top = Math.max(...refs.map((r) => r.score ?? 0), 0)
  return top > 0 ? Math.max((ref.score ?? 0) / top, 0.06) : 0.06
}

export const verseKey = (bookNumber, chapter, verse) => `${bookNumber}:${chapter}:${verse}`

// The verses of a reference that get a text preview: the whole reference, up to PREVIEW_VERSES.
export function previewRange(ref) {
  const end = ref.endVerse && ref.endVerse > ref.verse ? ref.endVerse : ref.verse
  return { start: ref.verse, end: Math.min(end, ref.verse + PREVIEW_VERSES - 1), truncated: end > ref.verse + PREVIEW_VERSES - 1 }
}

// The ranges to look up for several references, one per distinct range.
export function rangesFor(refs, bookNumberFor) {
  const seen = new Map()
  for (const ref of refs) {
    const { start, end } = previewRange(ref)
    const bookNumber = bookNumberFor(ref.book)
    if (!bookNumber) continue
    seen.set(`${bookNumber}:${ref.chapter}:${start}-${end}`, { bookNumber, chapter: ref.chapter, start, end })
  }
  return [...seen.values()]
}

// The PostgREST or() filter that fetches those ranges from bsb_verses in a single request.
export function versesFilter(ranges) {
  return ranges.map((r) => `and(book_number.eq.${r.bookNumber},chapter.eq.${r.chapter},verse.gte.${r.start},verse.lte.${r.end})`).join(',')
}

// The preview text for a reference from a { verseKey -> text } lookup, or '' while a verse is missing.
export function previewText(ref, texts, bookNumberFor) {
  const bookNumber = bookNumberFor(ref.book)
  const { start, end, truncated } = previewRange(ref)
  const parts = []
  for (let v = start; v <= end; v++) {
    const text = texts.get(verseKey(bookNumber, ref.chapter, v))
    if (text == null) return ''
    parts.push(end > start ? `${v} ${text}` : text)
  }
  return parts.join(' ') + (truncated ? ' …' : '')
}
