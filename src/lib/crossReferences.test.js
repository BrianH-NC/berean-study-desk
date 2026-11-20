import test from 'node:test'
import assert from 'node:assert/strict'
import { INITIAL_REFS, PREVIEW_VERSES, previewRange, previewText, rangesFor, refLabel, refsForVerse, relativeStrength, verseKey, versesFilter } from './crossReferences.js'
import { commentaryCoversBook } from './commentaryCoverage.js'

// Shaped like the API's real John 3 payload (refs deliberately out of order).
const data = {
  chapter: {
    content: [
      { verse: 15, references: [{ book: 'JHN', chapter: 20, verse: 31, score: 12 }] },
      {
        verse: 16,
        references: [
          { book: 'JHN', chapter: 3, verse: 15, score: 475 },
          { book: 'ROM', chapter: 5, verse: 8, score: 935 },
          { book: '1JN', chapter: 4, verse: 9, endVerse: 10, score: 663 },
          { book: 'NAM', chapter: 1, verse: 1 },   // no score at all
        ],
      },
    ],
  },
}
const names = { JHN: 'John', ROM: 'Romans', '1JN': '1 John', NAM: 'Nahum' }
const nameFor = (code) => names[code] || code
const numbers = { JHN: 43, ROM: 45, '1JN': 62, NAM: 34 }
const bookNumberFor = (code) => numbers[code]

test('references for a verse come strongest first, and an unknown verse has none', () => {
  assert.deepEqual(refsForVerse(data, 16).map((r) => r.book), ['ROM', '1JN', 'JHN', 'NAM'])
  assert.deepEqual(refsForVerse(data, 99), [])
  assert.deepEqual(refsForVerse(null, 16), [])
  assert.equal(data.chapter.content[1].references[0].book, 'JHN', 'does not reorder the source data')
})

test('labels name the verse or the verse range', () => {
  assert.equal(refLabel({ book: 'ROM', chapter: 5, verse: 8 }, nameFor), 'Romans 5:8')
  assert.equal(refLabel({ book: '1JN', chapter: 4, verse: 9, endVerse: 10 }, nameFor), '1 John 4:9-10')
  assert.equal(refLabel({ book: 'ROM', chapter: 5, verse: 8, endVerse: 8 }, nameFor), 'Romans 5:8')
})

test('relative strength is measured against the strongest link and never reaches zero', () => {
  const refs = refsForVerse(data, 16)
  assert.equal(relativeStrength(refs[0], refs), 1)
  assert.ok(Math.abs(relativeStrength(refs[1], refs) - 663 / 935) < 1e-9)
  assert.equal(relativeStrength(refs[3], refs), 0.06)
  assert.equal(relativeStrength({ book: 'X' }, [{ book: 'X' }]), 0.06)
})

test('a long range previews only its first verses', () => {
  assert.deepEqual(previewRange({ verse: 9, endVerse: 10 }), { start: 9, end: 10, truncated: false })
  assert.deepEqual(previewRange({ verse: 5 }), { start: 5, end: 5, truncated: false })
  assert.deepEqual(previewRange({ verse: 1, endVerse: 1 + PREVIEW_VERSES }), { start: 1, end: PREVIEW_VERSES, truncated: true })
})

test('one request covers every distinct range', () => {
  const refs = [...refsForVerse(data, 16), { book: 'ROM', chapter: 5, verse: 8 }, { book: 'ZZZ', chapter: 1, verse: 1 }]
  const ranges = rangesFor(refs, bookNumberFor)
  assert.equal(ranges.length, 4, 'duplicates and unknown books are dropped')
  assert.equal(versesFilter(ranges.slice(0, 2)), 'and(book_number.eq.45,chapter.eq.5,verse.gte.8,verse.lte.8),and(book_number.eq.62,chapter.eq.4,verse.gte.9,verse.lte.10)')
})

test('preview text joins a range, numbers its verses, and waits for missing ones', () => {
  const texts = new Map([[verseKey(62, 4, 9), 'In this the love of God was made manifest.'], [verseKey(62, 4, 10), 'In this is love.'], [verseKey(45, 5, 8), 'God shows his love for us.']])
  assert.equal(previewText({ book: 'ROM', chapter: 5, verse: 8 }, texts, bookNumberFor), 'God shows his love for us.')
  assert.equal(previewText({ book: '1JN', chapter: 4, verse: 9, endVerse: 10 }, texts, bookNumberFor), '9 In this the love of God was made manifest. 10 In this is love.')
  assert.equal(previewText({ book: 'JHN', chapter: 3, verse: 15 }, texts, bookNumberFor), '', 'not loaded yet')
  assert.equal(previewText({ book: '1JN', chapter: 4, verse: 9, endVerse: 11 }, texts, bookNumberFor), '', 'a verse of the range is missing')
})

test('the initial list is shorter than the longest real verse (33 references on John 3)', () => {
  assert.ok(INITIAL_REFS >= 5 && INITIAL_REFS < 33)
})

test('commentaries are offered only for the books they cover', () => {
  assert.equal(commentaryCoversBook('barnes', 'JHN'), true)
  assert.equal(commentaryCoversBook('barnes', 'GEN'), false, 'Barnes covers the New Testament only')
  assert.equal(commentaryCoversBook('catena', 'JHN'), true)
  assert.equal(commentaryCoversBook('catena', 'ROM'), false, 'Catena Aurea is the four Gospels')
  assert.equal(commentaryCoversBook('tsk', 'GEN'), true)
  assert.equal(commentaryCoversBook('matthew-henry', 'SNG'), false, 'the snapshot has no Song of Solomon for Matthew Henry')
  assert.equal(commentaryCoversBook('matthew-henry', 'PSA'), true)
  assert.equal(commentaryCoversBook('a-commentary-added-later', 'GEN'), true, 'unknown commentaries are not hidden')
})
