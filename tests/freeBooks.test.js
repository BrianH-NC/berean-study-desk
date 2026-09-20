import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DOMParser } from 'linkedom'
import { sourcePage, safeSourceUrl, parseGutenbergSearch, parseGutenbergBook, parseCcelIndex, parseCcelBook, readLimited, validateDownload } from '../supabase/functions/free-books/catalog.js'
const parse = (value, type) => new DOMParser().parseFromString(value, type)

test('source identifiers and redirects cannot target arbitrary servers', () => {
  assert.equal(sourcePage('ccel', 'augustine.confessions'), 'https://www.ccel.org/ccel/augustine/confessions.html')
  for (const [source, id] of [['gutenberg', '../1'], ['ccel', 'a.b/../../'], ['other', '1']]) assert.throws(() => sourcePage(source, id))
  for (const url of ['http://www.ccel.org/ccel/a/b.pdf', 'https://www.ccel.org.evil.test/book.pdf', 'https://127.0.0.1/book.pdf', 'https://user@www.ccel.org/book.pdf', 'https://www.ccel.org:8080/book.pdf']) assert.throws(() => safeSourceUrl(url, 'https://www.ccel.org'))
})
test('Gutenberg catalog skips navigation entries and preserves next-page availability', () => {
  const result = parseGutenbergSearch('<feed><link rel="next" href="?start_index=26"/><entry><id>/authors</id><title>Authors</title></entry><entry><id>https://www.gutenberg.org/ebooks/3296.opds</id><title>Confessions</title><content>Augustine</content></entry></feed>', parse)
  assert.equal(result.results.length, 1); assert.equal(result.results[0].id, '3296'); assert.equal(result.hasNext, true)
})
test('Gutenberg imports only explicitly public-domain EPUB editions through its mirror', () => {
  const xml = '<feed><entry><title>Confessions</title><author><name>Augustine</name></author><rights>Public domain in the USA.</rights><content>&lt;p&gt;About the book&lt;/p&gt;</content><link type="application/epub+zip" href="https://www.gutenberg.org/ebooks/3296.epub.images"/></entry></feed>'
  const book = parseGutenbergBook(xml, '3296', parse)
  assert.equal(book.formats[0].url, 'https://gutenberg.pglaf.org/cache/epub/3296/pg3296-images.epub')
  assert.equal(book.description, 'About the book')
  assert.equal(parseGutenbergBook(xml.replace('.epub.images', '.epub3.images'), '3296', parse).formats[0].url, 'https://gutenberg.pglaf.org/cache/epub/3296/pg3296-images-3.epub')
  assert.equal(parseGutenbergBook(xml.replace('Public domain in the USA.', 'Copyright protected'), '3296', parse).formats.length, 0)
})
test('CCEL author index is searchable metadata without duplicate editions', () => {
  const html = '<h5><a id="author_link_augustine">Augustine (13 classics)</a></h5><div class="author_bookList" id="author_bookList_augustine"><a href="/ccel/augustine">Author info</a><a href="https://ccel.org/ccel/augustine/confessions">Confessions</a><a href="/ccel/augustine/confessions.html">Confessions</a><a href="https://evil.test/ccel/augustine/evil">Untrusted</a></div>'
  const books = parseCcelIndex(html, parse)
  assert.equal(books.length, 1); assert.equal(books[0].author, 'Augustine')
})
test('CCEL extracts actual advertised formats and treats sign-in pages as unavailable', () => {
  const html = '<div id="titlewrapper"><h1>Confessions</h1><h3>by Augustine</h3></div><div class="bookinfo_description">A classic.</div><a href="/ccel/a/augustine/confessions/cache/confessions.pdf">PDF</a><a href="https://evil.test/book.epub">EPUB</a>'
  const book = parseCcelBook(html, 'augustine.confessions', parse)
  assert.equal(book.formats.length, 1); assert.equal(book.formats[0].format, 'pdf'); assert.equal(book.author, 'Augustine')
  assert.throws(() => parseCcelBook('<h1>Please sign in</h1>', 'augustine.confessions', parse))
})
test('downloads reject HTML masquerading as a book and enforce streamed size limits', async () => {
  assert.throws(() => validateDownload(new TextEncoder().encode('<html>Login</html>'), 'epub'))
  validateDownload(new TextEncoder().encode('%PDF-1.7'), 'pdf')
  validateDownload(new Uint8Array([80, 75, 3, 4]), 'epub')
  await assert.rejects(readLimited(new Response('too long'), 3))
  await assert.rejects(readLimited(new Response('x', { headers: { 'content-length': '100' } }), 3))
  assert.equal(new TextDecoder().decode(await readLimited(new Response('ok'), 3)), 'ok')
})
