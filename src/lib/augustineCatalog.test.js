import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseSermonReferences, matchingSermons } from './passageSermons.js'
import { chapterCount, verseCount } from './verseCounts.js'
import { bookFor } from './scriptureBooks.js'

const read = (name) => JSON.parse(readFileSync(new URL(`../../public/data/${name}`, import.meta.url), 'utf8'))
const catalog = read('augustine-sermons.json')
const sermons = catalog.sermons.map(s => ({ ...s, spans: parseSermonReferences(s.reference) }))

test('both Church Fathers catalogs name their author', () => {
  assert.equal(catalog.author, 'Augustine')
  assert.equal(read('chrysostom-homilies.json').author, 'John Chrysostom')
})

test('every entry has a title, a New Advent address and a readable passage', () => {
  assert.ok(sermons.length > 350, `only ${sermons.length} entries`)
  for (const s of sermons) {
    assert.ok(s.title, s.url)
    assert.match(s.url, /^https:\/\/www\.newadvent\.org\/fathers\/\d+\.htm$/, s.url)
    assert.ok(s.spans.length > 0, `unparseable: ${s.reference} (${s.url})`)
  }
  assert.equal(new Set(sermons.map(s => s.url)).size, sermons.length, 'each address once')
})

test('each passage names verses that exist', () => {
  for (const s of sermons) {
    for (const span of s.spans) {
      const book = bookFor(span.book)
      assert.ok(book > 0, `unknown book ${span.book}`)
      assert.ok(span.endChapter <= chapterCount(book), `${s.reference}: ${span.book} has no chapter ${span.endChapter}`)
      assert.ok(span.startVerse <= verseCount(book, span.startChapter), `${s.reference}: start verse`)
      if (span.endVerse !== 999) assert.ok(span.endVerse <= verseCount(book, span.endChapter), `${s.reference}: end verse`)
    }
  }
})

test('the Psalms use the numbering a modern Bible does, not Augustine’s', () => {
  const psalm = (n) => matchingSermons(sermons, { book: 'Psalms', chapter: n }).map(s => s.title)
  // his Psalm 22 is the Hebrew 23 ("The Lord is my shepherd")
  assert.deepEqual(psalm(23), ['Exposition on Psalm 23 (his Psalm 22)'])
  assert.deepEqual(psalm(22), ['Exposition on Psalm 22 (his Psalm 21)'])
  // his Psalm 9 holds Hebrew 9 and 10; his 114 and 115 together are Hebrew 116
  assert.equal(psalm(10).length, 1)
  assert.equal(psalm(116).length, 2)
  // his Psalm 118 is the long acrostic, Hebrew 119; Psalm 150 is the same in both
  assert.deepEqual(psalm(119), ['Exposition on Psalm 119 (his Psalm 118)'])
  assert.equal(psalm(150).length, 1)
  // every Hebrew psalm is covered
  for (let n = 1; n <= 150; n++) assert.ok(psalm(n).length >= 1, `Psalm ${n}`)
})

test('verses in John, 1 John and Matthew find Augustine', () => {
  const john = matchingSermons(sermons, { book: 'John', chapter: 3, verseStart: 16, verseEnd: 16 })
  assert.ok(john.some(s => s.title === 'Tractate 12 on the Gospel of John'), 'John 3:16')
  assert.ok(matchingSermons(sermons, { book: 'John', chapter: 9 }).some(s => s.title.startsWith('Tractate 44')), 'John 9 as a whole chapter')
  assert.ok(matchingSermons(sermons, { book: '1 John', chapter: 4, verseStart: 8, verseEnd: 8 }).some(s => s.title.startsWith('Homily 7')), '1 John 4:8')
  assert.ok(matchingSermons(sermons, { book: 'Matthew', chapter: 6, verseStart: 9, verseEnd: 13 }).some(s => /Sermon on the Mount, Book II/.test(s.title)), 'Matthew 6:9-13')
})

test('John 16 reads Tractate 94 as 16:4-7, not the index’s misprint 16:44-47', () => {
  const t94 = sermons.find(s => s.url.endsWith('/1701094.htm'))
  assert.equal(t94.reference, 'John 16:4-7')
})

test('titles with numbers sort in number order', () => {
  const titles = matchingSermons([
    { reference: 'John 1:1', title: 'Tractate 10', url: 'a', spans: parseSermonReferences('John 1:1') },
    { reference: 'John 1:1', title: 'Tractate 2', url: 'b', spans: parseSermonReferences('John 1:1') },
  ], { book: 'John', chapter: 1, verseStart: 1, verseEnd: 1 }).map(s => s.title)
  assert.deepEqual(titles, ['Tractate 2', 'Tractate 10'])
})
