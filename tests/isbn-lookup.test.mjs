import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { isValidISBN, normalizeISBN } from '../src/lib/isbn.js'

// Inject only Vite's build-time key; exercise the actual lookup module.
const source = (await readFile(new URL('../src/lib/googleBooks.js', import.meta.url), 'utf8'))
  .replace("'./isbn.js'", JSON.stringify(new URL('../src/lib/isbn.js', import.meta.url).href))
  .replace('import.meta.env?.VITE_GOOGLE_BOOKS_API_KEY', "'test-key'")
const { fetchBookByISBN, fetchCoverCandidates } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)

function mockProviders(t, google, edition, author = { name: 'C. S. Lewis' }) {
  const calls = []
  t.mock.method(globalThis, 'fetch', async url => {
    calls.push(url)
    const data = url.includes('googleapis.com') ? google : url.includes('/authors/') ? author : edition
    if (data instanceof Error) throw data
    return { ok: !!data, status: data ? 200 : 404, json: async () => data }
  })
  t.mock.method(console, 'error', () => {})
  return calls
}

test('ISBN normalization and checksums reject non-book barcodes and malformed input', () => {
  assert.equal(normalizeISBN(' 0-8044-2957-x '), '080442957X')
  for (const isbn of ['9780451524935', '9780060652920', '080442957X']) assert.equal(isValidISBN(isbn), true)
  for (const isbn of ['9780451524936', '12345678', '036000291452', '9780451524935garbage', '1234567890123']) assert.equal(isValidISBN(isbn), false)
})

test('Google metadata is preserved and missing cover is filled from the edition API', async t => {
  const calls = mockProviders(t, { items: [{ volumeInfo: { title: 'Mere Christianity', authors: ['C. S. Lewis'], publisher: 'Google publisher' } }] }, {
    title: 'Another title', authors: [{ key: '/authors/OL31574A' }], covers: [-1, 15104143], publishers: ['HarperOne'], publish_date: '2001', number_of_pages: 227,
  })
  const book = await fetchBookByISBN('978-0-06-065292-0')
  assert.equal(book.title, 'Mere Christianity')
  assert.equal(book.publisher, 'Google publisher')
  assert.equal(book.cover_url, 'https://covers.openlibrary.org/b/id/15104143-L.jpg')
  assert.equal(book.pages, 227)
  assert.equal(calls.length, 2)
  assert.ok(calls[1].endsWith('/isbn/9780060652920.json'))
})

test('empty Google title and author are backfilled even when other fields are complete', async t => {
  mockProviders(t, { items: [{ volumeInfo: { title: '', imageLinks: { thumbnail: 'http://example.org/cover.jpg' }, publisher: 'P', publishedDate: '2001', pageCount: 227, description: 'Summary' } }] }, {
    title: 'Mere Christianity', authors: [{ key: '/authors/OL31574A' }],
  })
  const book = await fetchBookByISBN('9780060652920')
  assert.equal(book.title, 'Mere Christianity')
  assert.equal(book.author, 'C. S. Lewis')
  assert.equal(book.cover_url, 'https://example.org/cover.jpg')
})

test('Google failure falls back; author failure does not discard edition metadata', async t => {
  mockProviders(t, new Error('Google unavailable'), { title: 'Mere Christianity', authors: [{ key: '/authors/OL31574A' }], covers: [15104143] }, new Error('Author unavailable'))
  const book = await fetchBookByISBN('9780060652920')
  assert.equal(book.title, 'Mere Christianity')
  assert.ok(book.cover_url)
  assert.equal(book.author, '')
})

test('both providers unavailable return null; invalid ISBN sends no requests', async t => {
  const calls = mockProviders(t, null, null)
  assert.equal(await fetchBookByISBN('9780060652920'), null)
  assert.equal(calls.length, 2)
  assert.equal(await fetchBookByISBN('12345678'), null)
  assert.equal(calls.length, 2)
})

test('cover picker also uses the edition fallback without fetching authors', async t => {
  const calls = mockProviders(t, { items: [] }, { covers: [15104143], authors: [{ key: '/authors/OL31574A' }] })
  const originalImage = globalThis.Image
  globalThis.Image = class { set src(_) { this.onerror() } }
  t.after(() => { if (originalImage) globalThis.Image = originalImage; else delete globalThis.Image })
  const covers = await fetchCoverCandidates('9780060652920')
  assert.deepEqual(covers, [{ source: 'Open Library', url: 'https://covers.openlibrary.org/b/id/15104143-L.jpg' }])
  assert.equal(calls.length, 2)
})
