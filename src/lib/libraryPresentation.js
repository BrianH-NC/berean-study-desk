import { extractSortLastName } from './authorSort.js'

export function primaryCategory(book) { return book.tags?.[0] || 'Uncategorized' }
export function readingProgress(book) {
  if (book.reading_status === 'read') return 100
  if (!(book.pages > 0)) return null
  return Math.min(100, Math.max(0, Math.round((book.current_page || 0) / book.pages * 100)))
}
export function readingStatus(book) {
  return { unread: 'Not Started', 'in-progress': 'Reading', read: 'Completed', paused: 'Paused', reference: 'Reference' }[book.reading_status] || 'Not Started'
}
export function sortLibrary(books, sort, direction) {
  const key = book => sort === 'author' ? extractSortLastName(book.author) : sort === 'category' ? primaryCategory(book) : book.title || ''
  return [...books].sort((a, b) => {
    const comparison = sort === 'recent' ? (Date.parse(b.created_at) || 0) - (Date.parse(a.created_at) || 0) : key(a).localeCompare(key(b), undefined, { sensitivity: 'base' })
    return comparison * (direction === 'desc' ? -1 : 1) || (a.title || '').localeCompare(b.title || '') || String(a.id).localeCompare(String(b.id))
  })
}

// Ranks other library books by how many subjects they share with this one
// (same primary category breaks ties), so subjects imported from CLZ become
// a way to find related reading rather than just labels.
export function rankSimilar(book, others, limit = 6) {
  const mine = new Set((book.subjects || []).map((s) => s.toLowerCase()))
  return others
    .filter((o) => o.id !== book.id)
    .map((o) => ({
      ...o,
      shared: (o.subjects || []).filter((s) => mine.has(s.toLowerCase())),
      sameCategory: !!book.tags?.[0] && o.tags?.[0] === book.tags[0],
    }))
    .filter((o) => o.shared.length > 0)
    .sort((a, b) => b.shared.length - a.shared.length || Number(b.sameCategory) - Number(a.sameCategory) || (a.title || '').localeCompare(b.title || ''))
    .slice(0, limit)
}
