import { CANONICAL_BOOKS } from '../lib/entries'
import { commentaryLinker } from '../lib/commentaryLinks'

// What ExcerptNote needs to turn the Scripture references in a commentary's text into buttons:
// { key, link(text), nameFor(bookNumber), onGoTo(bookName, chapter, verse, endVerse) }.
// `key` changes whenever the references would be read differently (another commentary or chapter).
export function commentaryLinkRefs(commentaryId, bookName, chapter, onGoTo) {
  const book = CANONICAL_BOOKS.indexOf(bookName) + 1
  if (!book) return undefined
  return { key: `${commentaryId}:${book}:${chapter}`, link: commentaryLinker(commentaryId, book, chapter), nameFor: (n) => CANONICAL_BOOKS[n - 1], onGoTo }
}
