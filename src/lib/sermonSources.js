// Links to other teachers' sermons on a passage, for "Sermons for this passage". Each of these sites has
// its own page for a book or chapter, so the app links straight to it rather than copying anything
// (their catalogs are theirs; Desiring God and Two Journeys also turn away automated requests).
// Book names are the app's own ("1 Peter", "Song of Solomon").

// "1 Peter" -> "1-peter", the form Desiring God, Ligonier and Two Journeys all use in their addresses.
export const bookSlug = (book) => String(book).trim().toLowerCase().replace(/\s+/g, '-')

// Desiring God (John Piper) has no pages at all for these two books.
const DESIRING_GOD_WITHOUT = new Set(['Esther', 'Nahum'])
export const DESIRING_GOD_SCRIPTURE_INDEX = 'https://www.desiringgod.org/scripture'
export const DESIRING_GOD_ALL_MESSAGES = 'https://www.desiringgod.org/messages'

// The page of Piper's messages on a chapter, or null for a book with no page at all. A chapter Desiring God
// has nothing on has no page either (it answers "not found"), which is why the card also offers the
// Scripture index, from which any book can be browsed.
export function desiringGodChapterUrl(book, chapter) {
  if (!book || DESIRING_GOD_WITHOUT.has(book) || !(chapter >= 1)) return null
  return `https://www.desiringgod.org/scripture/${bookSlug(book)}/${chapter}/messages`
}

// Ligonier (R.C. Sproul and others): the book's teaching page. Chapters have no page of their own.
export function ligonierBookUrl(book) {
  return book ? `https://learn.ligonier.org/scripture/${bookSlug(book)}` : null
}

// Grace to You (John MacArthur): the book's sermon list. Chapters have no page of their own.
export function graceToYouBookUrl(book) {
  return book ? `https://www.gty.org/sermons/scripture/${encodeURIComponent(book)}` : null
}

// SermonCentral: sermons from many pastors, with a page for every chapter in its "browse by Scripture" index.
// Its addresses use its own spellings for two books (the Psalms are "psalm"), the same ones that index links to.
const SERMON_CENTRAL_SLUG = { Psalms: 'psalm', 'Song of Solomon': 'song-of-songs' }
export const SERMON_CENTRAL_BROWSE = 'https://www.sermoncentral.com/browse-sermons-by-scripture'
export function sermonCentralChapterUrl(book, chapter) {
  if (!book || !(chapter >= 1)) return null
  return `https://www.sermoncentral.com/sermons/sermons-about-${SERMON_CENTRAL_SLUG[book] || bookSlug(book)}-chapter-${chapter}`
}

// SermonIndex: free audio sermons, tagged to the passages they open. Its chapter pages in its Bible have a sermons
// section; the counts come from the snapshot built by scripts/snapshot-sermon-chapters.mjs (the live per-chapter files
// are megabytes). Attribution to SermonIndex is asked for by its terms, so the card names it.
export const SERMON_INDEX_SPEAKERS = 'https://www.sermonindex.net/speakers/'

// `bookNumber` is 1-66. Returns { url, count } for a chapter SermonIndex has sermons on, else null.
export function sermonIndexChapter(snapshot, bookNumber, chapter) {
  const book = snapshot?.sermonIndex?.books?.[bookNumber - 1]
  const count = book?.counts?.[chapter - 1]
  if (!book || !(count > 0)) return null
  return { count, url: `https://www.sermonindex.net/bible/BSB/${book.id}/${chapter}/#sec-sermons` }
}

// The snapshot's figure counts a sermon once for each verse it opens, so it can run up to a quarter above the number of
// distinct sermons. This rounds it down and says "more than", which is true however the sermons are counted.
export function sermonCountPhrase(count) {
  if (!(count > 0)) return ''
  if (count < 10) return 'A few sermons'
  const safe = Math.floor(count * 0.8)
  const step = safe >= 1000 ? 500 : safe >= 100 ? 50 : 5
  return `More than ${(Math.floor(safe / step) * step).toLocaleString('en-US')} sermons`
}

// Open the Bible (Pastor Colin Smith): a page for each chapter it has teaching on, and no page (a 404) for the rest.
// Three chapters have an address with the book repeated, because the plain one belongs to something else.
export const OPEN_THE_BIBLE_BROWSE = 'https://openthebible.org/browse-sermons/#scripture'
export function openTheBibleChapterUrl(snapshot, book, chapter) {
  const chapters = snapshot?.openTheBible?.chapters
  if (!chapters || !book || !(chapter >= 1)) return null
  const slug = `${book === 'Psalms' ? 'psalm' : bookSlug(book)}-${chapter}`
  const found = chapters.find((s) => s === slug) || chapters.find((s) => s.startsWith(`${slug}-`) && s.endsWith(bookSlug(book)))
  return found ? `https://openthebible.org/scripture/${found}/?filter-post_type=sermon` : null
}
