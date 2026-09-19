import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { isValidISBN, normalizeISBN } from '../src/lib/isbn.js'

// Run the screen's actual event handlers with state setters and data access
// substituted. No DOM, camera permission, or production session is needed.
const source = await readFile(new URL('../src/screens/AddBooks.jsx', import.meta.url), 'utf8')
const handlers = source.slice(source.indexOf('  function clearBookMetadata()'), source.indexOf('  async function handlePhotoFile('))
const save = source.slice(source.indexOf('  async function handleAddOne('), source.indexOf('  async function handleFileChange('))
function screen(lookup) {
  const state = { title: 'Previous book', author: 'Previous author', coverUrl: 'old-cover', extraMeta: { publisher: 'Old publisher' }, isbn: '9780451524935' }
  const fields = ['Title', 'Author', 'CoverUrl', 'ExtraMeta', 'Isbn', 'LookupMessage', 'OneError', 'PhotoError', 'ScanLookupLoading', 'ShowScanner', 'SavingOne']
  let writes = 0
  const factory = new Function('state', 'fetchBookByISBN', 'isValidISBN', 'normalizeISBN', 'supabase', ...fields.map(field => `set${field}`), `
    const lookupBusyRef = { current: false }, metadataIsbnRef = { current: state.isbn }
    const savingOne = false, user = { id: 'test-user' }, navigate = () => {}
    ${handlers}
    async function attemptSave() {
      const { title, author, isbn, coverUrl, extraMeta } = state
      ${save}
      return handleAddOne({ preventDefault() {} })
    }
    return { handleScan, handleIsbnChange, attemptSave }
  `)
  const api = factory(state, lookup, isValidISBN, normalizeISBN, { from: () => ({ insert: async () => { writes++; return {} } }) }, ...fields.map(field => value => { state[field[0].toLowerCase() + field.slice(1)] = value }))
  return { ...api, state, writes: () => writes }
}

test('pending lookup clears old metadata, blocks duplicate lookup and saving', async () => {
  let complete, calls = 0
  const s = screen(() => { calls++; return new Promise(resolve => { complete = resolve }) })
  const pending = s.handleScan('9780060652920')
  assert.equal(s.state.title, '')
  assert.equal(s.state.coverUrl, '')
  assert.deepEqual(s.state.extraMeta, {})
  // Even if a title is supplied programmatically, the save guard holds.
  s.state.title = 'Manual title'
  await s.attemptSave()
  await s.handleScan('9780451524935')
  assert.equal(s.writes(), 0)
  assert.equal(calls, 1)
  complete({ title: 'Mere Christianity', author: 'C. S. Lewis', cover_url: 'new-cover' })
  await pending
  assert.equal(s.state.title, 'Mere Christianity')
  assert.equal(s.state.scanLookupLoading, false)
  assert.equal(s.state.coverUrl, 'new-cover')
})

test('null and unexpected failure both provide feedback and release loading', async () => {
  for (const lookup of [async () => null, async () => { throw new Error('Network') }]) {
    const s = screen(lookup)
    await s.handleScan('9780060652920')
    assert.equal(s.state.title, '')
    assert.equal(s.state.scanLookupLoading, false)
    assert.match(s.state.lookupMessage, /Retry|retry/)
    await s.handleScan('9780060652920')
    assert.equal(s.state.scanLookupLoading, false)
  }
})

test('changing an ISBN detaches previous metadata; formatting alone does not', () => {
  const s = screen(async () => null)
  s.handleIsbnChange('978-0-451-52493-5')
  assert.equal(s.state.title, 'Previous book')
  s.handleIsbnChange('9780060652920')
  assert.equal(s.state.title, '')
  assert.equal(s.state.coverUrl, '')
})
