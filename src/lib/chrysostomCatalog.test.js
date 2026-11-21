import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseSermonReferences, matchingSermons } from './passageSermons.js'
import { chapterCount, verseCount } from './verseCounts.js'
import { bookFor } from './scriptureBooks.js'

const catalog = JSON.parse(readFileSync(new URL('../../public/data/chrysostom-homilies.json', import.meta.url), 'utf8'))
const sermons = catalog.sermons.map(s => ({ ...s, spans: parseSermonReferences(s.reference) }))
const books = new Set(sermons.flatMap(s => s.spans.map(span => span.book)))

test('every homily has a title, a New Advent address and a readable passage', () => {
  assert.ok(sermons.length > 400, `only ${sermons.length} homilies`)
  for (const s of sermons) {
    assert.ok(s.title, s.url)
    assert.match(s.url, /^https:\/\/www\.newadvent\.org\/fathers\/\d+\.htm$/, s.url)
    assert.ok(s.spans.length > 0, `unparseable: ${s.reference} (${s.url})`)
  }
})

test('each passage names verses that exist', () => {
  for (const s of sermons) {
    for (const span of s.spans) {
      assert.ok(bookFor(span.book) > 0, `unknown book ${span.book}`)
      assert.ok(span.endChapter <= chapterCount(bookFor(span.book)), `${s.reference}: ${span.book} has no chapter ${span.endChapter}`)
      assert.ok(span.startVerse <= verseCount(bookFor(span.book), span.startChapter), `${s.reference}: start verse`)
      if (span.endVerse !== 999) assert.ok(span.endVerse <= verseCount(bookFor(span.book), span.endChapter), `${s.reference}: end verse`)
    }
  }
})

test('the homily addresses are each used once', () => {
  assert.equal(new Set(sermons.map(s => s.url)).size, sermons.length)
})

test('verses in John and Romans find their homilies', () => {
  const john = matchingSermons(sermons, { book: 'John', chapter: 1, verseStart: 6, verseEnd: 8 })
  assert.ok(john.length >= 1 && john.every(s => s.url.includes('newadvent.org/fathers/240')), 'John 1:6-8')
  const romans = matchingSermons(sermons, { book: 'Romans', chapter: 8 })
  assert.ok(romans.length >= 1 && romans.every(s => s.url.includes('newadvent.org/fathers/2102')), 'Romans 8')
})

test('it covers the books Chrysostom preached through and no others', () => {
  for (const book of ['Matthew', 'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews']) {
    assert.ok(books.has(book), `${book} is missing`)
  }
  for (const book of ['Genesis', 'Psalms', 'Isaiah', 'Mark', 'Luke', 'Revelation']) assert.ok(!books.has(book), `${book} should not be covered`)
})
