// ISBN -> book-data lookup, ported from holy-shelf/src/App.jsx (Google Books
// primary, Open Library fallback) -- the same lookup Holy Shelf itself uses
// when a book is first scanned in.

export async function fetchBookByISBN(isbn) {
  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${import.meta.env.VITE_GOOGLE_BOOKS_API_KEY}`
    )
    const data = await res.json()
    if (data.items?.length > 0) {
      const info = data.items[0].volumeInfo
      return {
        title: info.title || '',
        author: info.authors?.join(', ') || '',
        cover_url: info.imageLinks?.thumbnail?.replace('http:', 'https:') || '',
        isbn,
      }
    }
  } catch (e) {
    console.error('Google Books error:', e)
  }

  try {
    const res = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`)
    const data = await res.json()
    const book = data[`ISBN:${isbn}`]
    if (book) {
      return {
        title: book.title || '',
        author: book.authors?.map((a) => a.name).join(', ') || '',
        cover_url: book.cover?.large || book.cover?.medium || book.cover?.small || '',
        isbn,
      }
    }
  } catch (e) {
    console.error('Open Library error:', e)
  }

  return null
}
