const normalize = value => (value || '').trim().toLowerCase().replace(/\s+/g, ' ')
const isbnKey = value => (value || '').replace(/[^0-9x]/gi, '').toUpperCase()

export function findCheckBook(check, books) {
  if (check.kind !== 'book') return null
  const isbn = isbnKey(check.isbn)
  return books.find(book => isbn && isbnKey(book.isbn) === isbn) || books.find(book =>
    normalize(check.title) && normalize(check.authors) &&
    normalize(book.title) === normalize(check.title) && normalize(book.author) === normalize(check.authors)
  ) || null
}
