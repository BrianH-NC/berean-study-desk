import test from 'node:test'
import assert from 'node:assert/strict'
import { bookAboutReason, libraryForPassage, checksCitingPassage } from './passageLibrary.js'
import { CANONICAL_BOOKS } from './entries.js'

const about = (title, bibleBook, extra = {}) => bookAboutReason({ title, ...extra }, bibleBook)

test('unambiguous book names match anywhere in a title', () => {
  assert.equal(about('Reading Romans in Context: Paul and Second Temple Judaism', 'Romans'), 'title')
  assert.equal(about('Navigating Genesis A Scientist\'s Journey Through Genesis 1-11', 'Genesis'), 'title')
  assert.equal(about('The Letter to the Hebrews', 'Hebrews'), 'title')
  assert.equal(about('Treasury of David on the Psalm of Ascent', 'Psalms'), 'title')
})

test('names that are also people or words need context', () => {
  assert.equal(about('The Gospel of John, Volume One', 'John'), 'title')
  assert.equal(about('John Encountering Christ in a Life-Changing Way', 'John'), 'title')
  assert.equal(about('John\'s Story The Last Eyewitness', 'John'), 'title')
  assert.equal(about('Discovering God\'s Word ... with the Gospel of Mark', 'Mark'), 'title')
  assert.equal(about('Ask Pastor John 750 Bible Answers', 'John'), null)
  assert.equal(about('Walking in Faith 365 Days with John Calvin', 'John'), null)
  assert.equal(about('John Calvin: Pilgrim and Pastor', 'John'), null)
  assert.equal(about('Works of James Arminius, Vol. 1', 'James'), null)
  assert.equal(about('Revelation Through Science', 'Revelation'), null)
  assert.equal(about('Gospel Revelation Finding Worth in Knowing Christ', 'Revelation'), null)
  assert.equal(about('For Me to Live Is Christ From Genesis to Revelation', 'Genesis'), null)
})

test('numbered books do not bleed into each other', () => {
  assert.equal(about('1 John: Walking in the Light', 'John'), null)
  assert.equal(about('1 John: Walking in the Light', '1 John'), 'title')
  assert.equal(about('First Peter Commentary', '1 Peter'), 'title')
  assert.equal(about('The Epistles of John', '2 John'), 'title')
  assert.equal(about('2 Corinthians', '1 Corinthians'), null)
  assert.equal(about('Commentary on Corinthians', '2 Corinthians'), 'title')
})

test('subjects and tags count when the title does not', () => {
  assert.equal(about('The Last Eyewitness', 'John', { subjects: ['John'] }), 'subject')
  assert.equal(about('Untitled', 'Romans', { tags: ['Romans'] }), 'tag')
})

test('library splits direct matches from testament-wide resources', () => {
  const books = [
    { id: 'a', title: 'Romans The Gospel of God', subjects: [] },
    { id: 'b', title: 'Survey', subjects: ['New Testament'] },
    { id: 'c', title: 'OT Survey', subjects: ['Old Testament'] },
    { id: 'd', title: 'Linked by a note', subjects: [] },
    { id: 'e', title: 'Expositor', subjects: ['Commentaries'] },
    { id: 'f', title: 'The Reliability of the New Testament', subjects: [] },
  ]
  const r = libraryForPassage(books, 'Romans', CANONICAL_BOOKS, new Set(['d']))
  assert.deepEqual(r.direct.map((b) => [b.id, b.reason]), [['d', 'notes'], ['a', 'title']])
  assert.deepEqual(r.broader.map((b) => b.id), ['e', 'b', 'f'])
  assert.equal(r.testament, 'New Testament')
})

test('doctrine checks cite a passage in findings or follow-ups', () => {
  const checks = [
    { id: 1, summary: 'Affirms justification by faith (Romans 3:28).', strengths: [], concerns: [] },
    { id: 2, summary: 'Nothing cited', concerns: ['Reads Romans 9:11 as corporate election.'] },
    { id: 3, summary: 'x', followups: [{ question: 'What about John 3:16?', answer: 'See John 3:16-18.' }] },
  ]
  assert.deepEqual(checksCitingPassage(checks, { book: 'Romans', chapter: 3 }).map((c) => c.id), [1])
  assert.deepEqual(checksCitingPassage(checks, { book: 'Romans', chapter: 9, verseStart: 10, verseEnd: 12 }).map((c) => c.id), [2])
  assert.deepEqual(checksCitingPassage(checks, { book: 'John', chapter: 3, verseStart: 17 }).map((c) => c.id), [3])
})
