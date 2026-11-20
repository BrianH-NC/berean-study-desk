// Which Bible books a commentary covers, so Bible Study can offer only the
// commentaries that exist for the book being read (Barnes, Burkitt and the
// People's NT are New Testament only; Catena Aurea is the four Gospels).
// The data is a snapshot -- see scripts/snapshot-commentary-coverage.mjs.
import { COMMENTARY_BOOKS } from './commentaryCoverageData.js'

const coverage = new Map(Object.entries(COMMENTARY_BOOKS).map(([id, codes]) => [id, new Set(codes.split(' '))]))

// True when the commentary covers the book (by the API's book code). A
// commentary the snapshot doesn't know about is assumed to cover everything:
// the chapter request still reports a clean "not available" if it doesn't.
export function commentaryCoversBook(id, bookCode) {
  const books = coverage.get(id)
  return books ? books.has(bookCode) : true
}
