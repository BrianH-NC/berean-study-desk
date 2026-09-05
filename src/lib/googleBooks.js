// ISBN -> book-data lookup, ported from holy-shelf/src/App.jsx (Google Books
// primary, Open Library fallback) -- the same lookup Holy Shelf itself uses
// when a book is first scanned in.

export async function fetchBookByISBN(isbn) {
  let result = null

  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${import.meta.env.VITE_GOOGLE_BOOKS_API_KEY}`
    )
    const data = await res.json()
    if (data.items?.length > 0) {
      const info = data.items[0].volumeInfo
      result = {
        title: info.title || '',
        author: info.authors?.join(', ') || '',
        cover_url: info.imageLinks?.thumbnail?.replace('http:', 'https:') || '',
        publisher: info.publisher || '',
        pub_date: info.publishedDate || '',
        pages: info.pageCount || null,
        description: info.description || '',
        isbn,
      }
    }
  } catch (e) {
    console.error('Google Books error:', e)
  }

  // Open Library fills in whatever Google Books didn't have -- either the
  // whole record if Google had no match at all, or just individual fields
  // (most often the cover, since Google's own thumbnail is frequently
  // missing even when its metadata is otherwise good). Open Library's
  // per-ISBN endpoint doesn't reliably return a summary, so description
  // stays Google-Books-only.
  const needsBackfill = !result || !result.cover_url || !result.publisher || !result.pub_date || !result.pages
  if (needsBackfill) {
    try {
      const res = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`)
      const data = await res.json()
      const book = data[`ISBN:${isbn}`]
      if (book) {
        const cover = book.cover?.large || book.cover?.medium || book.cover?.small || ''
        if (!result) {
          result = {
            title: book.title || '',
            author: book.authors?.map((a) => a.name).join(', ') || '',
            cover_url: cover,
            publisher: book.publishers?.[0]?.name || '',
            pub_date: book.publish_date || '',
            pages: book.number_of_pages || null,
            description: '',
            isbn,
          }
        } else {
          if (!result.cover_url && cover) result.cover_url = cover
          if (!result.publisher && book.publishers?.[0]?.name) result.publisher = book.publishers[0].name
          if (!result.pub_date && book.publish_date) result.pub_date = book.publish_date
          if (!result.pages && book.number_of_pages) result.pages = book.number_of_pages
        }
      }
    } catch (e) {
      console.error('Open Library error:', e)
    }
  }

  return result
}

// Best-effort cover lookup for books with no ISBN on file -- searches by
// title/author instead of an exact ISBN match, so it's less reliable and
// only used as a fallback (see Shelf's "Find missing covers"). Tries Google
// Books first, then Open Library's search API.
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

  try {
    const params = new URLSearchParams({ title, limit: '1' })
    if (author) params.set('author', author)
    const res = await fetch(`https://openlibrary.org/search.json?${params}`)
    const data = await res.json()
    const coverId = data.docs?.[0]?.cover_i
    if (coverId) return `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
  } catch (e) {
    console.error('Open Library cover search error:', e)
  }

  return null
}

// ISBN-13 (978-prefixed) -> ISBN-10, via the standard mod-11 check digit --
// Amazon's image URLs are keyed by ISBN-10/ASIN, not ISBN-13.
function isbn13to10(isbn13) {
  const digits = isbn13.replace(/[^0-9]/g, '')
  if (digits.length !== 13 || !digits.startsWith('978')) return null
  const core = digits.slice(3, 12)
  let sum = 0
  for (let i = 0; i < 9; i++) sum += (10 - i) * Number(core[i])
  const check = (11 - (sum % 11)) % 11
  return core + (check === 10 ? 'X' : String(check))
}

// Loads a URL as an <img> (no CORS involved, unlike fetch) and reports its
// rendered size, so a too-small "image not found" placeholder can be told
// apart from an actual cover.
function loadImageDimensions(url) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => resolve(null)
    img.src = url
  })
}

// Last resort, ISBN-only cover guess via Amazon's product-image URL pattern.
// There's no public Amazon API for this without an Associates account in
// good standing (ongoing qualifying sales required just to keep API access),
// so this just guesses the URL their site itself uses and checks the image
// actually loaded and isn't their tiny "no cover available" placeholder.
// Unofficial and can stop working without notice -- kept separate from
// fetchBookByISBN so it never risks overwriting a title/author during a
// barcode scan, and is only reached from "Find missing covers" once Google
// Books and Open Library have both already come up empty.
export async function fetchAmazonCoverByISBN(isbn) {
  const digits = isbn.replace(/[^0-9Xx]/g, '')
  const isbn10 = digits.length === 10 ? digits : isbn13to10(digits)
  if (!isbn10) return null
  const url = `https://images-na.ssl-images-amazon.com/images/P/${isbn10}.01.LZZZZZZZ.jpg`
  const dims = await loadImageDimensions(url)
  // Amazon's "no cover available" placeholder renders very small; a real
  // cover thumbnail at this size code is comfortably larger.
  return dims && dims.width > 60 && dims.height > 60 ? url : null
}
