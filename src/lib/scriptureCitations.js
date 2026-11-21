// Finds the Scripture citations in a commentary's text so they can be links. The commentaries cite
// in several styles (see scriptureBooks.js for the book names). This reads:
//
//   Rom 8:28            "Psalm 110:1"       "1Cor 15:57"        "Co1 13:4"    book, chapter, verse
//   Mt 5:3-12           "Rom 1:29-32"                                         a range of verses
//   Ps 119:67,71        "Jer 4:4, 31:4,33"  "(Luke 14:26, 27)"                more verses, or more chapters of the same book
//   Exodus 12.42        "Mt 5.32"  "Cant. 5. 12"                              a period for the colon (Gill, Barnes)
//   Gen. i. 1           "Psal. xxvii. 13"                                     chapter in lowercase Roman numerals
//   ver. 16             "verse 14"  "vv. 3-18"                                a verse of the chapter being studied (optional)
//
// Every citation is checked against the real verse counts, so a number that isn't a verse never
// becomes a link. Anything citing something else ("Ant. 18. 2:2" for Josephus, "2 Maccabees 7:9",
// "Wisdom 5:6", "Cp. 18:17") is left plain, and so are the numbers that follow it.
import { BOOK_ALTERNATION, bookFor } from './scriptureBooks.js'
import { chapterCount, verseCount } from './verseCounts.js'

const SPACE = String.raw`[  ]`
const CITATION = String.raw`(?<![A-Za-z0-9])(?<name>${BOOK_ALTERNATION})\.?${SPACE}?(?:` +
  String.raw`(?<ch>\d{1,3})(?<sep>[:.])${SPACE}?(?<v>\d{1,3})(?:[-–](?<e1>\d{1,3})(?::(?<e2>\d{1,3}))?)?` +
  String.raw`|(?<rc>[ivxlc]{1,7})\.${SPACE}?(?<rv>\d{1,3})(?:[-–](?<re>\d{1,3}))?)(?!\d)`
// "ver. 16", "verse 14", "verses 1-9", "vv. 3-18": not when it follows a work and book number ("Iliad. 18. ver. 318").
const RELATIVE = String.raw`(?<![A-Za-z0-9.])(?<![A-Z][a-z]*\.\s\d+\.\s)(?<rel>(?:[Vv]erses?|[Vv]er\.|vv?\.)${SPACE}?(?<r1>\d{1,3})(?:[-–](?<r2>\d{1,3}))?)(?![\d:])`
const PATTERN = new RegExp(`${CITATION}|${RELATIVE}`, 'g')
// What may follow a reference: another verse (",10", ", 27") or chapter and verse ("; 6:14-29").
const CONTINUATION = new RegExp(String.raw`(?<sep>[,;])(?<sp> ?)(?<spec>\d{1,3}(?::\d{1,3})?(?:[-–]\d{1,3}(?::\d{1,3})?)?)`, 'y')
const SPEC = /^(\d{1,3})(?::(\d{1,3}))?(?:[-–](\d{1,3})(?::(\d{1,3}))?)?$/
// After a bare number following ", ": it is a verse of a list only if the sentence plainly ends or moves on.
const LIST_END = /^(?:[,;.)\]]|\s+[A-Z(“"]|\s*$)/

const ROMAN = { i: 1, v: 5, x: 10, l: 50, c: 100 }
function fromRoman(s) {
  let total = 0
  for (let i = 0; i < s.length; i++) {
    const value = ROMAN[s[i]], next = ROMAN[s[i + 1]]
    total += next > value ? -value : value
  }
  return total
}
function toRoman(n) {
  let out = ''
  for (const [letters, value] of [['c', 100], ['xc', 90], ['l', 50], ['xl', 40], ['x', 10], ['ix', 9], ['v', 5], ['iv', 4], ['i', 1]]) while (n >= value) { out += letters; n -= value }
  return out
}

// { book, chapter, verse, endVerse? } if that verse exists; a range past the chapter's end stops there.
function makeRef(book, chapter, verse, endVerse) {
  const count = verseCount(book, chapter)
  if (!count || verse < 1 || verse > count) return null
  const ref = { book, chapter, verse }
  if (endVerse > verse) ref.endVerse = Math.min(endVerse, count)
  return ref
}

// Splits text into [{ text }] and [{ text, ref }] pieces; joined, the texts are the original exactly.
// `book` (1-66) and `chapter` are the passage the commentary is on, for "ver. 16" style references,
// which are only read when `relative` is true.
export function linkCitations(text, { book: studyBook, chapter: studyChapter, relative = false } = {}) {
  const tokens = []
  const pattern = new RegExp(PATTERN.source, 'g')
  let match
  while ((match = pattern.exec(text))) {
    const g = match.groups
    const end = match.index + match[0].length

    if (g.rel) {
      if (!relative || !studyBook) continue
      const ref = makeRef(studyBook, studyChapter, Number(g.r1), g.r2 ? Number(g.r2) : 0)
      if (ref) tokens.push({ start: match.index, end, ref })
      continue
    }

    const book = bookFor(g.name)
    let chapter, verse, last
    if (g.ch) {
      chapter = Number(g.ch); verse = Number(g.v); last = g.e2 ? 0 : Number(g.e1 || 0)   // a range into another chapter links to its start
    } else {
      chapter = fromRoman(g.rc)
      if (!chapter || toRoman(chapter) !== g.rc || chapter > chapterCount(book)) continue
      verse = Number(g.rv); last = Number(g.re || 0)
    }
    const ref = makeRef(book, chapter, verse, last)
    if (!ref) continue
    tokens.push({ start: match.index, end, ref })

    // "Ps 119:67,71", "Jer 4:4, 31:4,33": more of the same book.
    let position = end, currentChapter = ref.chapter, lastVerse = ref.endVerse || ref.verse
    for (;;) {
      CONTINUATION.lastIndex = position
      const next = CONTINUATION.exec(text)
      if (!next) break
      const { sep, sp, spec } = next.groups
      const parts = SPEC.exec(spec)
      if (!parts) break
      const specStart = position + sep.length + sp.length
      const specEnd = specStart + spec.length
      let nextRef
      if (parts[2] !== undefined) {
        nextRef = makeRef(book, Number(parts[1]), Number(parts[2]), parts[4] !== undefined ? 0 : Number(parts[3] || 0))
      } else {
        const looksLikeAList = sep === ',' && (sp === '' || (LIST_END.test(text.slice(specEnd)) && Number(parts[1]) > lastVerse))
        nextRef = looksLikeAList ? makeRef(book, currentChapter, Number(parts[1]), Number(parts[3] || 0)) : null
      }
      if (!nextRef) break
      tokens.push({ start: specStart, end: specEnd, ref: nextRef })
      currentChapter = nextRef.chapter
      lastVerse = nextRef.endVerse || nextRef.verse
      position = specEnd
    }
    pattern.lastIndex = position
  }

  const segments = []
  let consumed = 0
  for (const { start, end, ref } of tokens) {
    if (start > consumed) segments.push({ text: text.slice(consumed, start) })
    segments.push({ text: text.slice(start, end), ref })
    consumed = end
  }
  if (consumed < text.length) segments.push({ text: text.slice(consumed) })
  return segments
}
