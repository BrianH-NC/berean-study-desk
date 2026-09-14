import test from 'node:test'
import assert from 'node:assert/strict'
import { readingProgress, readingStatus } from './libraryPresentation.js'
test('progress reflects saved pages and completed status without inventing totals',()=>{
  assert.equal(readingProgress({pages:240,current_page:120}),50)
  assert.equal(readingProgress({pages:null,current_page:120}),null)
  assert.equal(readingProgress({pages:100,current_page:150}),100)
  assert.equal(readingProgress({reading_status:'read'}),100)
  assert.equal(readingStatus({reading_status:'reference'}),'Reference')
})
