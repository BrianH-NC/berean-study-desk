import { isValidISBN, normalizeISBN } from './isbn.js'

async function fetchWithTimeout(url, signal = AbortSignal.timeout(15000)) {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`Book lookup failed (${response.status})`)
  return response
}

function googleBooksURL(query) {
  const key = import.meta.env?.VITE_GOOGLE_BOOKS_API_KEY?.trim()
  if (!key) throw new Error('Google Books API key is not configured')
  return `https://www.googleapis.com/books/v1/volumes?${new URLSearchParams({ q: query, key })}`
}

// Use the edition API: the legacy /api/books endpoint can return 404 even
// for ISBNs with an available edition. Author names require separate reads.
async function fetchOpenLibraryEdition(isbn, resolveAuthors = true) {
  const signal = AbortSignal.timeout(15000)
  const book = await (await fetchWithTimeout(`https://openlibrary.org/isbn/${isbn}.json`, signal)).json()
  const names = []
  if (resolveAuthors) {
    for (const author of book.authors || []) {
      if (signal.aborted) break
      if (author.name) names.push(author.name)
      else if (/^\/authors\/OL\d+A$/.test(author.key || '')) {
        try {
          const data = await (await fetchWithTimeout(`https://openlibrary.org${author.key}.json`, signal)).json()
          if (data.name) names.push(data.name)
        } catch (e) {
          console.error('Open Library author error:', e)
        }
      }
    }
  }
  const coverId = book.covers?.find(id => Number.isInteger(id) && id > 0)
  return {
    isbn,
    title: book.title || '',
    author: names.join(', '),
    cover_url: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : '',
    publisher: book.publishers?.[0] || '',
    pub_date: book.publish_date || '',
    pages: book.number_of_pages || null,
    description: typeof book.description === 'string' ? book.description : book.description?.value || '',
  }
}

// ISBN -> book-data lookup, ported from holy-shelf/src/App.jsx (Google Books
// primary, Open Library fallback) -- the same lookup Holy Shelf itself uses
// when a book is first scanned in.

export async function fetchBookByISBN(isbn) {
  isbn = normalizeISBN(isbn)
  if (!isValidISBN(isbn)) return null
  let result = null

  try {
    const res = await fetchWithTimeout(
      googleBooksURL(`isbn:${isbn}`)
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

  const fields = ['title', 'author', 'cover_url', 'publisher', 'pub_date', 'pages', 'description']
  const needsBackfill = !result || fields.some(field => !result[field])
  if (needsBackfill) {
    try {
      const book = await fetchOpenLibraryEdition(isbn, !result?.author)
      if (!result) result = book
      else for (const field of fields) if (!result[field] && book[field]) result[field] = book[field]
    } catch (e) {
      console.error('Open Library error:', e)
    }
  }

  return result
}

// Every candidate cover for one ISBN, kept separate (not merged/backfilled
// like fetchBookByISBN) so "Change cover" can show them side by side and let
// the user pick -- e.g. their own 2008 hardcover instead of the 2021
// paperback the "best" single guess would otherwise land on.
export async function fetchCoverCandidates(isbn) {
  isbn = normalizeISBN(isbn)
  if (!isValidISBN(isbn)) return []
  const candidates = []

  try {
    const res = await fetchWithTimeout(
      googleBooksURL(`isbn:${isbn}`)
    )
    const data = await res.json()
    const cover = data.items?.[0]?.volumeInfo?.imageLinks?.thumbnail?.replace('http:', 'https:')
    if (cover) candidates.push({ source: 'Google Books', url: cover })
  } catch (e) {
    console.error('Google Books error:', e)
  }

  try {
    const cover = (await fetchOpenLibraryEdition(isbn, false)).cover_url
    if (cover) candidates.push({ source: 'Open Library', url: cover })
  } catch (e) {
    console.error('Open Library error:', e)
  }

  try {
    const amazon = await fetchAmazonCoverByISBN(isbn)
    if (amazon) candidates.push({ source: 'Amazon', url: amazon })
  } catch (e) {
    console.error('Amazon cover error:', e)
  }

  return candidates
}

// Best-effort cover lookup for books with no ISBN on file -- searches by
// title/author instead of an exact ISBN match, so it's less reliable and
// only used as a fallback (see Shelf's "Find missing covers"). Tries Google
// Books first, then Open Library's search API.
export async function searchBookCover(title, author) {
  try {
    const q = `intitle:${title}${author ? ` inauthor:${author}` : ''}`
    const res = await fetchWithTimeout(googleBooksURL(q))
    const data = await res.json()
    const cover = data.items?.[0]?.volumeInfo?.imageLinks?.thumbnail
    if (cover) return cover.replace('http:', 'https:')
  } catch (e) {
    console.error('Google Books cover search error:', e)
  }

  try {
    const params = new URLSearchParams({ title, limit: '1' })
    if (author) params.set('author', author)
    const res = await fetchWithTimeout(`https://openlibrary.org/search.json?${params}`)
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
