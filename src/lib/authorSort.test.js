// Run with: node --test src/lib/authorSort.test.js
// Uses Node's built-in test runner rather than adding vitest/jest -- this
// project deliberately has no test framework dependency; node:test needs
// none either, since it ships with Node itself.
import test from 'node:test'
import assert from 'node:assert/strict'
import { extractSortLastName } from './authorSort.js'

test('simple two-word name', () => {
  assert.equal(extractSortLastName('John Smith'), 'smith')
})

test('with middle name', () => {
  assert.equal(extractSortLastName('Andrew Michael Davis'), 'davis')
})

test('with middle initial', () => {
  assert.equal(extractSortLastName('Andrew M. Davis'), 'davis')
})

test('with multiple initials', () => {
  assert.equal(extractSortLastName('J.R.R. Tolkien'), 'tolkien')
})

test('with generational suffix', () => {
  assert.equal(extractSortLastName('John Smith Jr.'), 'smith')
})

test('suffix without a period', () => {
  assert.equal(extractSortLastName('John Smith Jr'), 'smith')
})

test('suffix plus middle initial', () => {
  assert.equal(extractSortLastName('William H. Gates III'), 'gates')
})

test('academic suffix', () => {
  assert.equal(extractSortLastName('Jane Doe PhD'), 'doe')
  assert.equal(extractSortLastName('Jane Doe Ph.D.'), 'doe')
  assert.equal(extractSortLastName('John Roe M.D.'), 'roe')
  assert.equal(extractSortLastName('Sam Poe Esq.'), 'poe')
})

test('stacked suffixes', () => {
  assert.equal(extractSortLastName('John Smith Jr. PhD'), 'smith')
})

test('compound/noble surname: von', () => {
  assert.equal(extractSortLastName('Werner von Braun'), 'von braun')
})

test('compound/noble surname: da', () => {
  assert.equal(extractSortLastName('Leonardo da Vinci'), 'da vinci')
})

test('compound/noble surname: de', () => {
  assert.equal(extractSortLastName('Charles de Gaulle'), 'de gaulle')
})

test('multi-word compound surname', () => {
  assert.equal(extractSortLastName('Juan Carlos de la Cruz'), 'de la cruz')
})

test('mononym', () => {
  assert.equal(extractSortLastName('Madonna'), 'madonna')
})

test('hyphenated last name', () => {
  assert.equal(extractSortLastName('Mary Smith-Jones'), 'smith-jones')
})

test('case-insensitive suffix and prefix matching', () => {
  assert.equal(extractSortLastName('WERNER VON BRAUN'), 'von braun')
  assert.equal(extractSortLastName('john smith jr.'), 'smith')
})

test('empty string', () => {
  assert.equal(extractSortLastName(''), '')
})

test('null and undefined', () => {
  assert.equal(extractSortLastName(null), '')
  assert.equal(extractSortLastName(undefined), '')
})

test('whitespace only', () => {
  assert.equal(extractSortLastName('   '), '')
})

test('single word', () => {
  assert.equal(extractSortLastName('Cher'), 'cher')
})

test('all-caps simple name', () => {
  assert.equal(extractSortLastName('JOHN SMITH'), 'smith')
})

test('extra whitespace between tokens', () => {
  assert.equal(extractSortLastName('John   Smith'), 'smith')
})
