import test from 'node:test'
import assert from 'node:assert/strict'
import { MCHEYNE_DAYS, mcheyneDay, mcheynePlanItems, parsePlanReading, mcheyneStart, mcheyneStatus, toggleMcheyneReading, readingUrl, isMcheynePlan } from './mcheyne.js'

const BOOKS = ['Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth','1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra','Nehemiah','Esther','Job','Psalms','Proverbs','Ecclesiastes','Song of Solomon','Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah','Malachi','Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians','2 Corinthians','Galatians','Ephesians','Philippians','Colossians','1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon','Hebrews','James','1 Peter','2 Peter','1 John','2 John','3 John','Jude','Revelation']

test('has 365 days of three readings matching YouVersion', () => {
  assert.equal(MCHEYNE_DAYS, 365)
  assert.deepEqual(mcheyneDay(0).map(r => r.label), ['Genesis 1', 'Matthew 1', 'Ezra 1'])
  assert.deepEqual(mcheyneDay(326).map(r => r.label), ['1 Chronicles 18', 'James 5', 'Jonah 2'])
  assert.deepEqual(mcheyneDay(237).map(r => r.label), ['1 Samuel 18', 'Romans 16', 'Lamentations 3'])
})

test('every reading names a canonical book and a positive chapter', () => {
  for (const item of mcheynePlanItems()) {
    assert.equal(item.readings.length, 3)
    for (const r of item.readings) { assert.ok(BOOKS.includes(r.book), r.label); assert.ok(r.chapter > 0, r.label) }
  }
})

test('parses chapter spans, verse spans and lists', () => {
  assert.deepEqual(parsePlanReading('Genesis 9-10'), { book: 'Genesis', chapter: 9, chapterEnd: 10, label: 'Genesis 9–10' })
  assert.deepEqual(parsePlanReading('Exodus 11:1-12:21'), { book: 'Exodus', chapter: 11, verseStart: 1, chapterEnd: 12, verseEnd: 21, label: 'Exodus 11:1–12:21' })
  assert.deepEqual(parsePlanReading('Jeremiah 36,45'), { book: 'Jeremiah', chapter: 36, alsoChapters: [45], label: 'Jeremiah 36, 45' })
  assert.equal(parsePlanReading('Psalms 34').label, 'Psalm 34')
  assert.equal(parsePlanReading('Song of Songs 2').book, 'Song of Solomon')
})

test('starting on day 327 marks earlier days read and shows day 327', () => {
  const items = mcheynePlanItems()
  const { start_date, completed } = mcheyneStart(327, '2026-11-23')
  assert.equal(start_date, '2026-01-01')
  const plan = { id: 'p1', items, start_date, completed }
  assert.ok(isMcheynePlan(plan))
  const status = mcheyneStatus(plan, '2026-11-23')
  assert.equal(status.index, 326)
  assert.equal(status.read, 0)
  assert.equal(status.behind, 0)
  assert.equal(mcheyneStatus(plan, '2026-11-25').behind, 2)
})

test('a day completes when all three readings are marked, and can be undone', () => {
  const items = mcheynePlanItems()
  let plan = { id: 'p1', items, start_date: '2026-11-23', completed: {} }
  for (const n of [0, 1]) plan = { ...plan, completed: toggleMcheyneReading(plan, 0, n, 't') }
  assert.equal(mcheyneStatus(plan, '2026-11-23').read, 2)
  plan = { ...plan, completed: toggleMcheyneReading(plan, 0, 2, 't') }
  assert.deepEqual(plan.completed, { 0: 't' })
  assert.equal(mcheyneStatus(plan, '2026-11-23').index, 1)
  plan = { ...plan, completed: toggleMcheyneReading(plan, 0, 1, 't') }
  assert.deepEqual(plan.completed, { '0:0': 't', '0:2': 't' })
})

test('reading links carry the plan position', () => {
  const r = { ...parsePlanReading('Psalms 119:1-24'), n: 2 }
  assert.equal(readingUrl({ id: 'p1' }, 10, r), '/bible?book=Psalms&chapter=119&verse=1&verseEnd=24&plan=p1&day=10&reading=2')
  assert.equal(readingUrl(null, 0, { ...parsePlanReading('Genesis 9-10'), n: 0 }), '/bible?book=Genesis&chapter=9')
})
