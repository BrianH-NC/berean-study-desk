import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bookFileFormat, MAX_BOOK_BYTES, normalizeReaderLocation, createPositionWriter } from '../src/lib/readerState.js'

test('accepts supported file types and rejects empty, oversized or unrelated files', () => {
  assert.equal(bookFileFormat({ name: 'Book.PDF', size: 5 }), 'pdf')
  assert.equal(bookFileFormat({ name: 'book.epub', size: MAX_BOOK_BYTES }), 'epub')
  for (const file of [{ name: 'book.pdf', size: 0 }, { name: 'book.epub', size: MAX_BOOK_BYTES + 1 }, { name: 'book.html', size: 50 }]) assert.throws(() => bookFileFormat(file))
})
test('rejects invalid saved locations', () => {
  assert.deepEqual(normalizeReaderLocation('pdf', { page: 3 }), { page: 3 })
  for (const page of [-1, 0, 1.5, 'abc']) assert.equal(normalizeReaderLocation('pdf', { page }), null)
  assert.equal(normalizeReaderLocation('epub', { cfi: 'javascript:alert(1)' }), null)
  assert.deepEqual(normalizeReaderLocation('epub', { cfi: 'epubcfi(/6/2!/4/2:0)' }), { cfi: 'epubcfi(/6/2!/4/2:0)' })
})
test('serializes slow saves and coalesces rapid navigation to the newest position', async () => {
  const calls = [], resolvers = []
  const write = createPositionWriter(value => { calls.push(value); return new Promise(resolve => resolvers.push(resolve)) })
  write({ page: 1 }); write({ page: 2 }); write({ page: 3 })
  assert.deepEqual(calls, [{ page: 1 }])
  resolvers.shift()(); await new Promise(resolve => setImmediate(resolve))
  assert.deepEqual(calls, [{ page: 1 }, { page: 3 }])
  resolvers.shift()()
})
test('reports failed saves and accepts a retry', async () => {
  const reports = []; let fail = true
  const write = createPositionWriter(async () => { if (fail) throw new Error('offline') }, error => reports.push(error?.message || 'saved'))
  write({ page: 5 }); await new Promise(resolve => setImmediate(resolve))
  fail = false; write({ page: 5 }); await new Promise(resolve => setImmediate(resolve))
  assert.deepEqual(reports, ['offline', 'saved'])
})
