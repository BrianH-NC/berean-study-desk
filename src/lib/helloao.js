// Client for the Free Use Bible API (bible.helloao.org) -- commentaries and
// cross-references. Both are live, on-demand calls to a third-party API (no
// local storage, unlike bsb_verses), fetched only when the user opens the
// relevant panel in Bible Study, not on every chapter load.
import { CANONICAL_BOOKS } from './entries'
import { commentaryCoversBook } from './commentaryCoverage'

const API_BASE = 'https://bible.helloao.org/api'

// helloao's USFM-style book codes, in the same order as CANONICAL_BOOKS, so
// the two arrays line up by index rather than needing a name-matching pass.
const BOOK_CODES = [
  'GEN', 'EXO', 'LEV', 'NUM', 'DEU', 'JOS', 'JDG', 'RUT', '1SA', '2SA', '1KI', '2KI', '1CH', '2CH', 'EZR', 'NEH',
  'EST', 'JOB', 'PSA', 'PRO', 'ECC', 'SNG', 'ISA', 'JER', 'LAM', 'EZK', 'DAN', 'HOS', 'JOL', 'AMO', 'OBA', 'JON', 'MIC',
  'NAM', 'HAB', 'ZEP', 'HAG', 'ZEC', 'MAL',
  'MAT', 'MRK', 'LUK', 'JHN', 'ACT', 'ROM', '1CO', '2CO', 'GAL', 'EPH', 'PHP', 'COL', '1TH', '2TH',
  '1TI', '2TI', 'TIT', 'PHM', 'HEB', 'JAS', '1PE', '2PE', '1JN', '2JN', '3JN', 'JUD', 'REV',
]

const nameToCode = new Map(CANONICAL_BOOKS.map((name, i) => [name, BOOK_CODES[i]]))
const codeToName = new Map(BOOK_CODES.map((code, i) => [code, CANONICAL_BOOKS[i]]))

export function bookCodeFor(bookName) {
  return nameToCode.get(bookName) || null
}

export function bookNameForCode(code) {
  return codeToName.get(code) || code
}

// The 7 commentaries the API currently offers, all public-domain classic
// expositors -- a good thematic fit alongside Doctrine Check's own use of
// historic confessions as a measuring line.
export const COMMENTARIES = [
  { id: 'matthew-henry', name: 'Matthew Henry' },
  { id: 'john-calvin', name: 'John Calvin' },
  { id: 'john-gill', name: 'John Gill' },
  { id: 'adam-clarke', name: 'Adam Clarke' },
  { id: 'jamieson-fausset-brown', name: 'Jamieson, Fausset & Brown' },
  { id: 'keil-delitzsch', name: 'Keil & Delitzsch' },
  { id: 'tyndale', name: 'Tyndale' },
]

// What Bible Study offers: the seven above plus more of the API's public-domain
// works. Several cover only part of the Bible, so `commentariesForBook` lists just
// the ones that exist for the book being read. (Search and Settings keep using
// COMMENTARIES -- their pickers are not tied to one book.)
export const STUDY_COMMENTARIES = [
  ...COMMENTARIES,
  { id: 'tsk', name: 'Treasury of Scripture Knowledge' },
  { id: 'barnes', name: 'Barnes’ Notes (New Testament)' },
  { id: 'burkitt', name: 'Burkitt’s Expository Notes (New Testament)' },
  { id: 'geneva', name: 'Geneva Bible Notes' },
  { id: 'scofield', name: 'Scofield Reference Notes (1917)' },
  { id: 'pnt', name: 'The People’s New Testament' },
  { id: 'catena', name: 'Catena Aurea (Aquinas, Gospels)' },
]

export function commentariesForBook(bookName) {
  const code = bookCodeFor(bookName)
  return code ? STUDY_COMMENTARIES.filter((c) => commentaryCoversBook(c.id, code)) : STUDY_COMMENTARIES
}

// The commentary to show: the one asked for if it covers this book, otherwise the
// first one that does -- so moving from a Gospel to Genesis switches away from Barnes
// instead of showing an error. Returns null only if nothing covers the book.
export function pickCommentary(commentaryId, bookName) {
  const available = commentariesForBook(bookName)
  return (available.find((c) => c.id === commentaryId) || available[0] || null)?.id || null
}

// 1-66, the order the Bible's books come in (used to look verses up in bsb_verses).
export function bookNumberForCode(code) {
  const index = BOOK_CODES.indexOf(code)
  return index < 0 ? 0 : index + 1
}

export async function fetchCommentaryChapter(commentaryId, bookName, chapter, options = {}) {
  const code = bookCodeFor(bookName)
  if (!code) throw new Error(`No book code for "${bookName}"`)
  const res = await fetch(`${API_BASE}/c/${commentaryId}/${code}/${chapter}.json`, options)
  if (!res.ok) throw new Error(res.status===404 ? "No commentary chapter available from this source. Try another commentary." : `Commentary temporarily unavailable (${res.status}). Try again.`)
  return res.json()
}

export async function fetchCrossReferences(bookName, chapter) {
  const code = bookCodeFor(bookName)
  if (!code) throw new Error(`No book code for "${bookName}"`)
  const res = await fetch(`${API_BASE}/d/open-cross-ref/${code}/${chapter}.json`)
  if (!res.ok) throw new Error(`Cross-reference lookup failed (${res.status})`)
  return res.json()
}

// A curated slice of the API's 1,256 translations for side-by-side comparison
// against BSB -- all public-domain or freely-licensed classics (via eBible.org),
// chosen to span translation philosophy from hyper-literal to modern paraphrase
// rather than listing all 1,256.
export const COMPARISON_TRANSLATIONS = [
  { id: 'eng_kjv', name: 'King James Version', short: 'KJV' },
  { id: 'eng_asv', name: 'American Standard Version (1901)', short: 'ASV' },
  { id: 'ENGWEBP', name: 'World English Bible', short: 'WEB' },
  { id: 'eng_dby', name: 'Darby Translation', short: 'DBY' },
  { id: 'eng_ylt', name: "Young's Literal Translation", short: 'YLT' },
  { id: 'eng_dra', name: 'Douay-Rheims 1899', short: 'DRA' },
]

// A verse's content segment is either a plain string, or an object whose
// `.text` holds the words (other object shapes -- {lineBreak: true},
// {noteId: N} -- carry no text and are skipped).
function segmentText(seg) {
  return typeof seg === 'string' ? seg : seg.text
}

// Returns [{ number, text }, ...] for a chapter in the given translation --
// flattened from the API's block-based content (verse blocks interspersed
// with headings/subtitles; each verse's own content is itself a list of
// segments, some of which are line breaks or footnote markers with no text).
export async function fetchTranslationChapter(translationId, bookName, chapter) {
  const code = bookCodeFor(bookName)
  if (!code) throw new Error(`No book code for "${bookName}"`)
  const res = await fetch(`${API_BASE}/${translationId}/${code}/${chapter}.json`)
  if (!res.ok) throw new Error(`Translation lookup failed (${res.status})`)
  const data = await res.json()
  return data.chapter.content
    .filter((block) => block.type === 'verse')
    .map((block) => ({
      number: block.number,
      text: block.content.map(segmentText).filter(Boolean).join(' '),
    }))
}
