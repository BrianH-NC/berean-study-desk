import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseSermonReferences, matchingSermons, twoJourneysChapterUrl } from './passageSermons.js'

test('parses verse lists, inherited chapters, and cross-chapter ranges', () => {
  const refs = parseSermonReferences('Matt 2:1, 2, 9, 10; 3:1-4; John 3:22-4:2')
  assert.equal(refs.length, 6)
  assert.equal(refs[3].startVerse, 10)
  assert.equal(refs[4].startChapter, 3)
  assert.equal(refs[5].endChapter, 4)
  assert.equal(refs[5].endVerse, 2)
})

test('matches overlaps, excludes disjoint selections, and deduplicates links', () => {
  const catalog = [
    { reference: 'Rom 8:28-30', title: 'A', url: 'a' },
    { reference: 'Rom 8:29', title: 'B', url: 'b' },
    { reference: 'Rom 8:28', title: 'A again', url: 'a' },
    { reference: 'Rom 9:28', title: 'C', url: 'c' },
    { reference: 'Rom 8', title: 'Chapter exposition', url: 'd' },
  ]
  const passage = { book: 'Romans', chapter: 8, verseStart: 28, verseEnd: 30 }
  assert.deepEqual(matchingSermons(catalog, passage, [28, 30]).map(s => s.url), ['a', 'd'])
  assert.equal(matchingSermons(catalog, passage).length, 3)
  assert.equal(matchingSermons(catalog, { book: 'John', chapter: 8 }).length, 0)
})

test('cross-chapter coverage respects both boundaries', () => {
  const catalog = [{ reference: 'John 3:22-4:2', title: 'A', url: 'a' }]
  assert.equal(matchingSermons(catalog, { book: 'John', chapter: 4, verseStart: 3 }).length, 0)
  assert.equal(matchingSermons(catalog, { book: 'John', chapter: 4, verseStart: 2 }).length, 1)
})

test('catalog has real PDF links and matches representative passages', () => {
  const { sermons } = JSON.parse(readFileSync(new URL('../../public/data/spurgeon-sermons.json', import.meta.url)))
  assert.ok(sermons.length > 4000)
  assert.ok(sermons.every(s => s.reference !== 'Passage' && !s.url.endsWith('/chs0.pdf')))
  assert.ok(sermons.every(s => /^https:\/\/www\.spurgeongems\.org\/sermon\/[^\s]+\.pdf(?:#.*)?$/i.test(s.url)))
  for (const [book, chapter, verseStart] of [['John', 3, 16], ['Romans', 8, 28], ['Genesis', 1, 1], ['Psalms', 23, 1]]) {
    assert.ok(matchingSermons(sermons, { book, chapter, verseStart }).length, `${book} ${chapter}:${verseStart}`)
  }
})

test('Two Journeys chapter links preserve numbered books', () => {
  assert.equal(twoJourneysChapterUrl('Romans', 8), 'https://twojourneys.org/scripture/romans-8/')
  assert.equal(twoJourneysChapterUrl('1 Corinthians', 13), 'https://twojourneys.org/scripture/1-corinthians-13/')
})
