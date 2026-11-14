import test from 'node:test'
import assert from 'node:assert/strict'
import { authorSurnames, buildLibraryIndex, filterItems, groupItems, matchItem, recommendedForBook, statusMap, summarize, surnameKey, workKey } from './readingLists.js'

const item = (over) => ({ id: over.title, author_surname: 'Hamilton', series: null, bible_books: [], bible_scope: null, is_first_pick: false, levels: [], section: 'Old Testament', ...over })

test('surnames are read from either name order and several authors', () => {
  assert.equal(surnameKey('Victor P. Hamilton'), 'hamilton')
  assert.equal(surnameKey('Gleason L. Archer Jr.'), 'archer')
  assert.equal(surnameKey('G. R. Beasley-Murray'), 'murray')
  assert.ok(authorSurnames('Hamilton, Victor P.').includes('hamilton'))
  assert.deepEqual(authorSurnames('Chad Brand, Trent Butler, and Charles Draper').sort(), ['brand', 'butler', 'draper'])
  assert.ok(!authorSurnames('Gleason L. Archer Jr.').includes('jr'))
})

test('a library book matches by surname and title, subtitles included', () => {
  const index = buildLibraryIndex([
    { id: 'b1', title: 'The Book of Genesis Chapters 1-17', author: 'Victor P. Hamilton' },
    { id: 'b2', title: 'Knowing God (20th Anniversary Edition)', author: 'J. I. Packer' },
    { id: 'b3', title: 'How God Became Jesus The Real Origins of Belief in Jesus Divine Nature', author: 'Michael F. Bird' },
  ])
  assert.equal(matchItem(item({ title: 'The Book of Genesis Chapters 1-17' }), index).status, 'owned')
  // the other volume of the same commentary is a different book
  assert.equal(matchItem(item({ title: 'The Book of Genesis Chapters 18-50' }), index).status, 'none')
  assert.equal(matchItem(item({ title: 'Knowing God', author_surname: 'Packer' }), index).status, 'owned')
  assert.equal(matchItem(item({ title: 'How God Became Jesus', author_surname: 'Bird' }), index).book.id, 'b3')
})

test('the same title by a different author is not a match', () => {
  const index = buildLibraryIndex([{ id: 'b1', title: 'Genesis', author: 'Allen P. Ross' }])
  assert.equal(matchItem(item({ title: 'Genesis', author_surname: 'Waltke' }), index).status, 'none')
  assert.equal(matchItem(item({ title: 'Genesis', author_surname: 'Ross' }), index).status, 'owned')
})

test('a similar title by the same author is a "maybe", and a book beats a wishlist entry', () => {
  const index = buildLibraryIndex(
    [{ id: 'b1', title: 'Joshua An Introduction and Commentary', author: 'Richard S. Hess' }],
    [{ id: 'w1', title: 'Romans', author: 'Douglas Moo' }],
  )
  const hess = matchItem(item({ title: 'Joshua', author_surname: 'Hess' }), index)
  assert.equal(hess.status, 'maybe')
  assert.equal(hess.book.id, 'b1')
  assert.equal(matchItem(item({ title: 'Romans', author_surname: 'Moo' }), index).status, 'wishlist')
  // an explicit wishlist entry is stronger evidence than a similar title on the shelf
  const wished = buildLibraryIndex([{ id: 'b1', title: 'Joshua An Introduction and Commentary', author: 'Richard S. Hess' }], [{ id: 'w2', title: 'Joshua', author: 'Richard Hess' }])
  assert.equal(matchItem(item({ title: 'Joshua', author_surname: 'Hess' }), wished).status, 'wishlist')
  const both = buildLibraryIndex([{ id: 'b', title: 'Romans', author: 'Douglas J. Moo' }], [{ id: 'w', title: 'Romans', author: 'Douglas Moo' }])
  assert.equal(matchItem(item({ title: 'Romans', author_surname: 'Moo' }), both).status, 'owned')
})

test('the same work listed under several topics is counted once', () => {
  const a = item({ id: '1', title: 'Hosea-Jonah', author_surname: 'Stuart', series: 'WBC', section: 'Old Testament', is_first_pick: true })
  const b = { ...a, id: '2', topic: 'Joel' }
  const c = item({ id: '3', title: 'Romans', author_surname: 'Moo', section: 'New Testament' })
  assert.equal(workKey(a), workKey(b))
  const index = buildLibraryIndex([{ id: 'x', title: 'Hosea-Jonah', author: 'Douglas Stuart' }])
  const items = [a, b, c]
  const { total, sections } = summarize(items, statusMap(items, index))
  assert.deepEqual({ works: total.works, owned: total.owned, firstPicks: total.firstPicks, firstPicksOwned: total.firstPicksOwned }, { works: 2, owned: 1, firstPicks: 1, firstPicksOwned: 1 })
  assert.deepEqual(sections.map((s) => [s.name, s.works, s.owned]), [['Old Testament', 1, 1], ['New Testament', 1, 0]])
})

test('filters combine: section, first picks, level, status and search words', () => {
  const items = [
    item({ id: '1', title: 'Genesis', author: 'Allen Ross', author_surname: 'Ross', is_first_pick: true, levels: ['P', 'D'], bible_books: ['Genesis'] }),
    item({ id: '2', title: 'Genesis', author: 'Bruce Waltke', author_surname: 'Waltke', levels: ['T', 'P'], bible_books: ['Genesis'] }),
    item({ id: '3', title: 'Romans', author: 'Douglas Moo', author_surname: 'Moo', section: 'New Testament', bible_books: ['Romans'] }),
  ]
  const index = buildLibraryIndex([{ id: 'b', title: 'Genesis', author: 'Allen P. Ross' }])
  const statuses = statusMap(items, index)
  const ids = (f) => filterItems(items, f, statuses).map((i) => i.id)
  assert.deepEqual(ids({ section: 'Old Testament' }), ['1', '2'])
  assert.deepEqual(ids({ firstOnly: true }), ['1'])
  assert.deepEqual(ids({ level: 'T' }), ['2'])
  assert.deepEqual(ids({ status: 'owned' }), ['1'])
  assert.deepEqual(ids({ status: 'missing' }), ['2', '3'])
  assert.deepEqual(ids({ q: 'wal gen' }), ['2'])
  assert.deepEqual(ids({ book: 'Romans' }), ['3'])
})

test('recommendations for a Bible book put first picks first, then what you lack, and fold duplicates', () => {
  const rows = [
    item({ id: 'a', title: 'Genesis A', author_surname: 'Aaa', bible_books: ['Genesis'], bible_scope: 'book', pub_year: 2000 }),
    item({ id: 'b', title: 'Genesis B', author_surname: 'Bbb', bible_books: ['Genesis'], bible_scope: 'book', is_first_pick: true, pub_year: 1990 }),
    item({ id: 'c', title: 'Genesis C', author_surname: 'Ccc', bible_books: ['Genesis'], bible_scope: 'book', is_first_pick: true, pub_year: 2010 }),
    { ...item({ id: 'c2', title: 'Genesis C', author_surname: 'Ccc', bible_books: ['Genesis'], bible_scope: 'book', is_first_pick: true, pub_year: 2010 }), topic: 'dup' },
    item({ id: 'p', title: 'Pentateuch Intro', author_surname: 'Ppp', bible_books: ['Genesis', 'Exodus'], bible_scope: 'group' }),
    item({ id: 'x', title: 'Exodus X', author_surname: 'Xxx', bible_books: ['Exodus'], bible_scope: 'book' }),
  ]
  const index = buildLibraryIndex([{ id: 'own', title: 'Genesis B', author: 'Bob Bbb' }])
  const { direct, group } = recommendedForBook(rows, 'Genesis', statusMap(rows, index))
  assert.deepEqual(direct.map((i) => i.id), ['c', 'b', 'a'])   // first picks, the one you lack before the one you own
  assert.deepEqual(group.map((i) => i.id), ['p'])
})

test('items are grouped under their heading in list order', () => {
  const groups = groupItems([
    item({ id: '1', title: 'A', subsection: 'Books', topic: 'Genesis' }),
    item({ id: '2', title: 'B', subsection: 'Books', topic: 'Genesis' }),
    item({ id: '3', title: 'C', subsection: 'Books', topic: 'Exodus' }),
  ])
  assert.deepEqual(groups.map((g) => [g.topic, g.items.length]), [['Genesis', 2], ['Exodus', 1]])
})
