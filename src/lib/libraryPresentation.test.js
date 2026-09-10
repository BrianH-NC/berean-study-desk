import test from 'node:test'
import assert from 'node:assert/strict'
import { sortLibrary, primaryCategory, readingStatus } from './libraryPresentation.js'

test('author sorting uses surnames and keeps the input collection intact', () => {
  const books = [{id:'1',title:'First',author:'Adam Young'},{id:'2',title:'Second',author:'Zoe Adams'}]
  assert.deepEqual(sortLibrary(books,'author','asc').map(b=>b.id),['2','1'])
  assert.deepEqual(books.map(b=>b.id),['1','2'])
})
test('duplicate titles have a stable ID tie-breaker in both directions', () => {
  const books = [{id:'b',title:'Same'},{id:'a',title:'Same'}]
  for (const direction of ['asc','desc']) assert.deepEqual(sortLibrary(books,'title',direction).map(b=>b.id),['a','b'])
})
test('multiple tags produce one primary category without duplicating a book', () => {
  const books=[{id:'1',tags:['Theology','History']},{id:'2',tags:[]}]
  assert.equal(primaryCategory(books[0]),'Theology')
  assert.equal(primaryCategory(books[1]),'Uncategorized')
  assert.equal(sortLibrary(books,'category','asc').length,2)
})
test('stored statuses keep their meaning under the new display vocabulary', () => {
  assert.equal(readingStatus({reading_status:'unread'}),'Not Started')
  assert.equal(readingStatus({reading_status:'in-progress'}),'Reading')
  assert.equal(readingStatus({reading_status:'read'}),'Completed')
})
