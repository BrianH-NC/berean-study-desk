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

// Best-effort cover lookup for books with no ISBN on file -- searches by
// title/author instead of an exact ISBN match, so it's less reliable and
// only used as a fallback (see Shelf's "Find missing covers").
export async function searchBookCover(title, author) {
  try {
    const q = encodeURIComponent(`intitle:${title}${author ? ` inauthor:${author}` : ''}`)
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&key=${import.meta.env.VITE_GOOGLE_BOOKS_API_KEY}`)
    const data = await res.json()
    const cover = data.items?.[0]?.volumeInfo?.imageLinks?.thumbnail
    if (cover) return cover.replace('http:', 'https:')
  } catch (e) {
    console.error('Google Books cover search error:', e)
  }
  return null
}
