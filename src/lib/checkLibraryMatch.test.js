import test from 'node:test'
import assert from 'node:assert/strict'
import { findCheckBook } from './checkLibraryMatch.js'
const book = {id:'one',title:'Grace',author:'A. Writer',isbn:'978-1234567890'}
test('matches formatted ISBN or exact normalized title and author', () => {
  assert.equal(findCheckBook({kind:'book',isbn:'9781234567890'},[book]),book)
  assert.equal(findCheckBook({kind:'book',title:' grace ',authors:'A. Writer'},[book]),book)
  assert.equal(findCheckBook({kind:'book',title:'Grace',authors:'Other'},[book]),null)
  assert.equal(findCheckBook({kind:'person',isbn:book.isbn},[book]),null)
  assert.equal(findCheckBook({kind:'book',title:'Grace'},[book]),null)
})
