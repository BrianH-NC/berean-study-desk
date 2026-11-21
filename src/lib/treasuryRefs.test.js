import test from 'node:test'
import assert from 'node:assert/strict'
import { linkTreasuryRefs } from './treasuryRefs.js'
import { chapterCount, verseCount } from './verseCounts.js'

const JOHN = 43, ROMANS = 45, MARK = 41, GENESIS = 1
const NAMES = { 1: 'Genesis', 2: 'Exodus', 5: 'Deuteronomy', 7: 'Judges', 19: 'Psalms', 23: 'Isaiah', 24: 'Jeremiah', 40: 'Matthew', 41: 'Mark', 42: 'Luke', 43: 'John', 45: 'Romans', 47: '2 Corinthians', 51: 'Colossians', 54: '1 Timothy', 56: 'Titus', 59: 'James', 62: '1 John', 65: 'Jude' }
const label = (ref) => `${NAMES[ref.book] || ref.book} ${ref.chapter}:${ref.verse}${ref.endVerse ? `-${ref.endVerse}` : ''}`
const refs = (text, passage) => linkTreasuryRefs(text, passage).filter((s) => s.ref).map((s) => `${s.text} => ${label(s.ref)}`)
const joined = (text, passage) => linkTreasuryRefs(text, passage).map((s) => s.text).join('')

// The real Treasury note on John 3:16.
const JOHN_3_16 = 'God. Lu 2:14; Ro 5:8; 2Co 5:19-21; Tit 3:4; 1Jo 4:9,10,19 gave. 1:14,18; Ge 22:12; Mr 12:6; Ro 5:10; 8:32 that whosoever. 15; Mt 9:13; 1Ti 1:15,16'

test('the real note on John 3:16 resolves every reference', () => {
  assert.deepEqual(refs(JOHN_3_16, { book: JOHN, chapter: 3 }), [
    'Lu 2:14 => Luke 2:14', 'Ro 5:8 => Romans 5:8', '2Co 5:19-21 => 2 Corinthians 5:19-21', 'Tit 3:4 => Titus 3:4',
    '1Jo 4:9 => 1 John 4:9', '10 => 1 John 4:10', '19 => 1 John 4:19',
    '1:14 => John 1:14', '18 => John 1:18',   // after the keyword "gave.", the book is the one being studied
    'Ge 22:12 => Genesis 22:12', 'Mr 12:6 => Mark 12:6', 'Ro 5:10 => Romans 5:10',
    '8:32 => Romans 8:32',                    // continues the book of the reference before it
    '15 => John 3:15',                        // a bare number after a keyword is a verse of the chapter being studied
    'Mt 9:13 => Matthew 9:13', '1Ti 1:15 => 1 Timothy 1:15', '16 => 1 Timothy 1:16',
  ])
})

test('references carry on from the one before them until a keyword starts a new group', () => {
  // Romans 8:28 (real): bare verses, then c:v in Romans, then explicit books, then a keyword resets to Romans.
  const note = 'we know. 35-39; 5:3,4; Ge 50:20; De 8:2,3,16 them. 5:5; Ex 20:6 the called. 30; 1:6,7; 9:11,23,24; Jer 51:29'
  assert.deepEqual(refs(note, { book: ROMANS, chapter: 8 }), [
    '35-39 => Romans 8:35-39', '5:3 => Romans 5:3', '4 => Romans 5:4',
    'Ge 50:20 => Genesis 50:20', 'De 8:2 => Deuteronomy 8:2', '3 => Deuteronomy 8:3', '16 => Deuteronomy 8:16',
    '5:5 => Romans 5:5',            // "them." reset to Romans
    'Ex 20:6 => Exodus 20:6',
    '30 => Romans 8:30', '1:6 => Romans 1:6', '7 => Romans 1:7', '9:11 => Romans 9:11', '23 => Romans 9:23', '24 => Romans 9:24',
    'Jer 51:29 => Jeremiah 51:29',
  ])
})

test('the text is never changed, only divided into pieces', () => {
  for (const [note, passage] of [[JOHN_3_16, { book: JOHN, chapter: 3 }], ['', { book: JOHN, chapter: 3 }], ['No references here.', { book: GENESIS, chapter: 1 }], ['Ps 23:1;Ps 24:1,\n 2 and 99:9', { book: JOHN, chapter: 3 }]]) {
    assert.equal(joined(note, passage), note)
  }
})

test('only references to verses that exist become links', () => {
  // years and chapter summaries in the intro notes
  assert.deepEqual(refs('Dinah. A.M. 2272. B.C. 1732. 30:21', { book: GENESIS, chapter: 34 }), ['30:21 => Genesis 30:21'])
  assert.deepEqual(refs('as Matthew states, (ch. 26:71,) she who was the janitrix. 38; Lu 22:58', { book: MARK, chapter: 14 }), ['38 => Mark 14:38', 'Lu 22:58 => Luke 22:58'], 'Mark has no chapter 26')
  assert.deepEqual(refs('Phm 2:12,13; Col 3:12', { book: 3, chapter: 20 }), ['Col 3:12 => Colossians 3:12'], 'Philemon has one chapter')
  assert.deepEqual(refs('Ps 119:176; Ps 119:177; Jude 1:25; Jude 1:26', { book: JOHN, chapter: 3 }), ['Ps 119:176 => Psalms 119:176', 'Jude 1:25 => Jude 1:25'], 'Psalm 119 ends at 176 and Jude at 25')
})

test('a reference after a book this cannot read is left alone, not guessed to be the book being studied', () => {
  // "Psalm 23:4" written out, and the Apocrypha, are not the Treasury's abbreviations.
  assert.deepEqual(refs('the same words occur in Psalm 23:4; 24:1', { book: JOHN, chapter: 3 }), [])
  assert.deepEqual(refs('see 2 Mac 3:4 and Tobit 4:7', { book: JOHN, chapter: 3 }), [])
  // ...until the next keyword makes the book plain again
  assert.deepEqual(refs('see Psalm 23:4. then. 15; Ro 5:8', { book: JOHN, chapter: 3 }), ['15 => John 3:15', 'Ro 5:8 => Romans 5:8'])
  // an abbreviation without its number is not a book
  assert.deepEqual(refs('Co 5:19; Ki 3:4', { book: JOHN, chapter: 3 }), [])
})

test('spaced numbered books, ranges and cross-chapter ranges', () => {
  assert.deepEqual(refs('2 Co 5:19; 1 Jo 4:9-10', { book: JOHN, chapter: 3 }), ['2 Co 5:19 => 2 Corinthians 5:19', '1 Jo 4:9-10 => 1 John 4:9-10'])
  assert.deepEqual(refs('Ge 1:1-2:3', { book: JOHN, chapter: 3 }), ['Ge 1:1-2:3 => Genesis 1:1'], 'a range into the next chapter links to where it starts')
  assert.deepEqual(refs('Isa 53:1-99', { book: JOHN, chapter: 3 }), ['Isa 53:1-99 => Isaiah 53:1-12'], 'a range past the end of the chapter stops at its last verse')
  assert.deepEqual(refs('Jas 1:3,4', { book: JOHN, chapter: 3 }), ['Jas 1:3 => James 1:3', '4 => James 1:4'])
})

test('Jude is told apart from Judges, and the numbered books from their plain neighbours', () => {
  const found = linkTreasuryRefs('Jud 9:15; Jude 1:5; 1Jo 1:1; Joh 1:1', { book: JOHN, chapter: 3 }).filter((s) => s.ref).map((s) => s.ref.book)
  assert.deepEqual(found, [7, 65, 62, 43])
  // "Jude 5" has no chapter:verse, so it is not read as a reference, and the "5" is not taken to be John 3:5
  assert.deepEqual(refs('Jud 9:15; Jude 5', { book: JOHN, chapter: 3 }), ['Jud 9:15 => Judges 9:15'])
})

test('the verse table is the whole Bible', () => {
  let chapters = 0, verses = 0
  for (let b = 1; b <= 66; b++) { chapters += chapterCount(b); for (let c = 1; c <= chapterCount(b); c++) verses += verseCount(b, c) }
  assert.equal(chapters, 1189)
  assert.equal(verses, 31102)
  assert.equal(verseCount(19, 119), 176)
  assert.equal(verseCount(65, 1), 25)
  assert.equal(verseCount(43, 3), 36)
  assert.equal(verseCount(43, 22), 0, 'John has 21 chapters')
  assert.equal(verseCount(67, 1), 0)
})
