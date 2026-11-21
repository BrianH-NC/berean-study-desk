// Finds the Scripture references in a Treasury of Scripture Knowledge note so they can be links.
//
// The Treasury writes a verse's note as a run of "keyword. references" groups:
//
//   God. Lu 2:14; Ro 5:8; 2Co 5:19-21; 1Jo 4:9,10,19 gave. 1:14,18; Ge 22:12; Ro 5:10; 8:32 that whosoever. 15; Mt 9:13
//
// A reference names its book in the Treasury's abbreviations (Lu, Ro, 2Co, Joh, Re...). One
// without a book follows these conventions, checked against the whole text of the Treasury:
//   - after a keyword (a word ending in a period), references start fresh in the book being
//     studied: "gave. 1:14,18" is John 1:14 and 1:18 in the note on John 3:16, and a bare number
//     is a verse of the chapter being studied: "that whosoever. 15" is John 3:15
//   - after a reference, "; 8:32" continues in the same book, and ",10" or ";10" is another verse
//     of the same chapter: "1Jo 4:9,10,19" is verses 9, 10 and 19
// Anything that doesn't name a real verse is left as plain text, and so is any reference following
// a book name this doesn't know (a spelled-out "Psalm 23:4", or "2 Mac 3:4" from the Apocrypha),
// since its book can't be assumed.
import { chapterCount, verseCount } from './verseCounts.js'

const BOOKS = {
  Ge: 1, Ex: 2, Le: 3, Nu: 4, De: 5, Jos: 6, Jud: 7, Ru: 8, '1Sa': 9, '2Sa': 10, '1Ki': 11, '2Ki': 12, '1Ch': 13, '2Ch': 14,
  Ezr: 15, Ne: 16, Es: 17, Job: 18, Ps: 19, Pr: 20, Ec: 21, So: 22, Isa: 23, Jer: 24, La: 25, Eze: 26, Da: 27, Ho: 28, Joe: 29,
  Am: 30, Ob: 31, Jon: 32, Mic: 33, Na: 34, Hab: 35, Zep: 36, Hag: 37, Zec: 38, Mal: 39, Mt: 40, Mr: 41, Lu: 42, Joh: 43,
  Ac: 44, Ro: 45, '1Co': 46, '2Co': 47, Ga: 48, Eph: 49, Php: 50, Col: 51, '1Th': 52, '2Th': 53, '1Ti': 54, '2Ti': 55,
  Tit: 56, Phm: 57, Heb: 58, Jas: 59, '1Pe': 60, '2Pe': 61, '1Jo': 62, '2Jo': 63, '3Jo': 64, Jude: 65, Re: 66,
}
// Books written with a number ("1Sa", "2Co") must carry it: a bare "Co 5:19" is not a book.
const NUMBERED = [...new Set(Object.keys(BOOKS).filter((k) => /^\d/.test(k)).map((k) => k.slice(1)))]
const PLAIN = Object.keys(BOOKS).filter((k) => !/^\d/.test(k)).sort((a, b) => b.length - a.length)   // "Jude" before "Jud"
const BOOK_NAME = `[1-3] ?(?:${NUMBERED.join('|')})|(?:${PLAIN.join('|')})`

// "Ro 5:8", "1Jo 4:9,10", "2 Ki 3:4": a book (with an optional space after its number) then chapter:verse.
// Or a reference without a book: "8:32", "4:9-10", "35-39", "15". A range may end in another chapter's verse.
const SPEC = String.raw`\d+(?::\d+)?(?:[-–]\d+(?::\d+)?)?`
const TOKEN = new RegExp(
  String.raw`(?<![A-Za-z0-9])(?<book>${BOOK_NAME})\s+(?<bspec>\d+:\d+(?:[-–]\d+(?::\d+)?)?)(?!\d)` +
  String.raw`|(?<![A-Za-z0-9:])(?<spec>${SPEC})(?![\d:])`,
  'g',
)

const bookNumber = (name) => BOOKS[name.replace(/\s/g, '')] || 0

// "4:9-10" -> a start and, if there is one, an end; the end may be a verse or chapter:verse.
function readSpec(spec, defaultChapter) {
  const [start, end] = spec.split(/[-–]/)
  const [a, b] = start.split(':').map(Number)
  const first = b === undefined ? { chapter: defaultChapter, verse: a } : { chapter: a, verse: b }
  let last = null
  if (end !== undefined) {
    const [c, d] = end.split(':').map(Number)
    last = d === undefined ? { chapter: first.chapter, verse: c } : { chapter: c, verse: d }
  }
  return { first, last }
}

// A reference as { book, chapter, verse, endVerse? }, or null if it doesn't exist. A range
// that runs into another chapter links to its first verse; one past a chapter's last verse stops there.
function makeRef(book, spec, defaultChapter) {
  if (!book || !defaultChapter && !spec.includes(':')) return null
  const { first, last } = readSpec(spec, defaultChapter)
  const count = verseCount(book, first.chapter)
  if (!first.chapter || first.verse < 1 || first.verse > count) return null
  const ref = { book, chapter: first.chapter, verse: first.verse }
  if (last && last.chapter === first.chapter && last.verse > first.verse) ref.endVerse = Math.min(last.verse, count)
  return ref
}

// Splits a note into [{ text }] and [{ text, ref }] segments; joined, the texts are the original
// note exactly. `book` (1-66) and `chapter` are the passage the note comments on.
export function linkTreasuryRefs(text, { book: studyBook, chapter: studyChapter }) {
  const segments = []
  let consumed = 0, previousEnd = 0, seenToken = false
  let book = studyBook, chapter = studyChapter
  let trusted = true   // false after a book name we can't read, until the next keyword

  for (const match of text.matchAll(TOKEN)) {
    const gap = text.slice(previousEnd, match.index)
    previousEnd = match.index + match[0].length
    // How this token relates to the one before it.
    let relation
    if (!seenToken) relation = 'start'
    else if (/^\s*,\s*$/.test(gap)) relation = 'comma'
    else if (/^\s*;\s*$/.test(gap)) relation = 'semicolon'
    else if (/^\s*$/.test(gap)) relation = 'space'
    else relation = 'keyword'
    seenToken = true
    if (relation === 'start' || relation === 'keyword') {
      // A keyword ends with a period. Letters with no period before a reference mean a book name we don't know.
      trusted = /(^|\.)\s*$/.test(gap)
      book = studyBook
      chapter = studyChapter
    }

    let ref = null
    if (match.groups.book) {
      const named = bookNumber(match.groups.book)
      ref = makeRef(named, match.groups.bspec, 0)
      if (ref) { book = named; chapter = ref.chapter; trusted = true } else trusted = false   // not a real verse: what follows can't be assumed
    } else if (trusted) {
      ref = makeRef(book, match.groups.spec, chapter)
      if (ref) chapter = ref.chapter
    }
    if (!ref) continue
    if (match.index > consumed) segments.push({ text: text.slice(consumed, match.index) })
    segments.push({ text: match[0], ref })
    consumed = match.index + match[0].length
  }
  if (consumed < text.length) segments.push({ text: text.slice(consumed) })
  return segments
}

export { chapterCount }
