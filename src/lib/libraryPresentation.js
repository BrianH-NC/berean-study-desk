import { extractSortLastName } from './authorSort.js'

export function primaryCategory(book) { return book.tags?.[0] || 'Uncategorized' }
export function readingStatus(book) {
  return { unread: 'Not Started', 'in-progress': 'Reading', read: 'Completed', paused: 'Paused' }[book.reading_status] || 'Not Started'
}
export function sortLibrary(books, sort, direction) {
  const key = book => sort === 'author' ? extractSortLastName(book.author) : sort === 'category' ? primaryCategory(book) : book.title || ''
  return [...books].sort((a, b) => {
    const comparison = sort === 'recent' ? (Date.parse(b.created_at) || 0) - (Date.parse(a.created_at) || 0) : key(a).localeCompare(key(b), undefined, { sensitivity: 'base' })
    return comparison * (direction === 'desc' ? -1 : 1) || (a.title || '').localeCompare(b.title || '') || String(a.id).localeCompare(String(b.id))
  })
}
