import test from 'node:test'
import assert from 'node:assert/strict'
import { linkCitations } from './scriptureCitations.js'
import { bookFor } from './scriptureBooks.js'

const NAMES = ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi', 'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude', 'Revelation']
const label = (ref) => `${NAMES[ref.book - 1]} ${ref.chapter}:${ref.verse}${ref.endVerse ? `-${ref.endVerse}` : ''}`
const JOHN = 43
const found = (text, options = {}) => linkCitations(text, { book: JOHN, chapter: 3, ...options }).filter((s) => s.ref).map((s) => `${s.text} = ${label(s.ref)}`)
const joined = (text, options = {}) => linkCitations(text, { book: JOHN, chapter: 3, ...options }).map((s) => s.text).join('')

test('full names, as Calvin and Scofield write them, with chained verses', () => {
  assert.deepEqual(found('(Romans 8:3, 4) What Paul'), ['Romans 8:3 = Romans 8:3', '4 = Romans 8:4'])
  assert.deepEqual(found('(Matthew 6:24; Luke 14:26, 27) This is the'), ['Matthew 6:24 = Matthew 6:24', 'Luke 14:26 = Luke 14:26', '27 = Luke 14:27'])
  assert.deepEqual(found('(2 Timothy 3:16, 17,) -- is as much'), ['2 Timothy 3:16 = 2 Timothy 3:16', '17 = 2 Timothy 3:17'])
  assert.deepEqual(found('Psalm 51:10-12 10. Create in me'), ['Psalm 51:10-12 = Psalms 51:10-12'])
})

test('Barnes mixes short forms and lists whole citations', () => {
  assert.deepEqual(found('See De 10:16, Jer 4:4, 31:4,33, Eze 11:19, 36:26'), [
    'De 10:16 = Deuteronomy 10:16', 'Jer 4:4 = Jeremiah 4:4', '31:4 = Jeremiah 31:4', '33 = Jeremiah 31:33', 'Eze 11:19 = Ezekiel 11:19', '36:26 = Ezekiel 36:26',
  ])
  assert.deepEqual(found('Son" Rom 9:4, 11:1 Verse 32.'), ['Rom 9:4 = Romans 9:4', '11:1 = Romans 11:1'])
  assert.deepEqual(found('Whosoever shall" Mt 5.32, 19:9, Lk 16:18'), ['Mt 5.32 = Matthew 5:32', '19:9 = Matthew 19:9', 'Lk 16:18 = Luke 16:18'])
  assert.deepEqual(found('Ps 2:6, 89:19, 110:1-3, Is 9:6,7, Dan 7:14'), ['Ps 2:6 = Psalms 2:6', '89:19 = Psalms 89:19', '110:1-3 = Psalms 110:1-3', 'Is 9:6 = Isaiah 9:6', '7 = Isaiah 9:7', 'Dan 7:14 = Daniel 7:14'])
})

test('three-letter forms, numbers written after the name, and the sources’ own typos', () => {
  assert.deepEqual(found('(Zac 8:7). (Act 6:1; Pe1 4:9; Jde 1:16). (Col 4:14; compare Ti2 4:10; Plm 1:24)'), [
    'Zac 8:7 = Zechariah 8:7', 'Act 6:1 = Acts 6:1', 'Pe1 4:9 = 1 Peter 4:9', 'Jde 1:16 = Jude 1:16', 'Col 4:14 = Colossians 4:14', 'Ti2 4:10 = 2 Timothy 4:10', 'Plm 1:24 = Philemon 1:24',
  ])
  assert.deepEqual(found('Sa1 17:12, Co1 13:4, Jo1 4:9, Kg2 5:1, Th1 4:3, Ch2 7:14'), ['Sa1 17:12 = 1 Samuel 17:12', 'Co1 13:4 = 1 Corinthians 13:4', 'Jo1 4:9 = 1 John 4:9', 'Kg2 5:1 = 2 Kings 5:1', 'Th1 4:3 = 1 Thessalonians 4:3', 'Ch2 7:14 = 2 Chronicles 7:14'])
  assert.deepEqual(found('Gall 3:13, 1Timm 2:6, Hoss 6:2, Romm 8:24, Lkke 13:16'), ['Gall 3:13 = Galatians 3:13', '1Timm 2:6 = 1 Timothy 2:6', 'Hoss 6:2 = Hosea 6:2', 'Romm 8:24 = Romans 8:24', 'Lkke 13:16 = Luke 13:16'])
})

test('a name that is two things in two commentaries is read the way those commentaries use it', () => {
  assert.equal(bookFor('Jud'), 7, 'Jud is Judges (Barnes: "Jud 21:19-21"); Jude is Jde or Jude')
  assert.equal(bookFor('Jde'), 65)
  assert.equal(bookFor('Co'), 51, 'Co is Colossians, 1Co is 1 Corinthians')
  assert.equal(bookFor('1Co'), 46)
  assert.equal(bookFor('Phi'), 50, 'Phi is Philippians; Philemon is Phm or Plm')
  assert.equal(bookFor('He'), 58)
  assert.deepEqual(found('Jud 6:22,23, 13:21,22'), ['Jud 6:22 = Judges 6:22', '23 = Judges 6:23', '13:21 = Judges 13:21', '22 = Judges 13:22'])
})

test('Gill’s period for the colon, and chapters in Roman numerals', () => {
  assert.deepEqual(found('Targ. Hieros. in Exodus 12.42. Praefat.'), ['Exodus 12.42 = Exodus 12:42'])
  assert.deepEqual(found('Jarchi in Cant. 5. 12. (o) Jarchi'), ['Cant. 5. 12 = Song of Solomon 5:12'])
  assert.deepEqual(found('Comment. in Gen. i. 1. Kimchi in Psal. xxvii. 13. Therefore'), ['Gen. i. 1 = Genesis 1:1', 'Psal. xxvii. 13 = Psalms 27:13'])
  assert.deepEqual(found('Gen. v. 24 is rendered'), ['Gen. v. 24 = Genesis 5:24'])
  assert.deepEqual(found('in Gen. c. 41. Vid.'), [], '"c." is "chapter", not a Roman numeral')
  assert.deepEqual(found('Gen. iiii. 1 and Gen. lxxxx. 1'), [], 'not Roman numerals, and no such chapters')
})

test('only citations of verses that exist become links', () => {
  assert.deepEqual(found('(Matthew 45:24;) Mark 18:26; Daniel 3:33; 2Jn 2:1; Jeremiah 20:22'), [])
  assert.deepEqual(found('Ps 119:176; Ps 119:177; Jude 1:25; Jude 1:26'), ['Ps 119:176 = Psalms 119:176', 'Jude 1:25 = Jude 1:25'])
  assert.deepEqual(found('Isa 53:1-99, Ge 1:1-2:3'), ['Isa 53:1-99 = Isaiah 53:1-12', 'Ge 1:1-2:3 = Genesis 1:1'])
})

test('other books and writers are not Scripture, and what follows them is not guessed', () => {
  assert.deepEqual(found('2 Maccabees 7:9, 11, 14, 29, 36; and Eleazar, 2 Maccabees 6:21, 28'), [])
  assert.deepEqual(found('Wisdom 5:6, Sirach 4:5, Ecclus 24:3, Tobit 4:7, 2 Esdras 3:1'), [])
  assert.deepEqual(found('Josephus, Ant. 18. 2:2 and Plin. 5:14, Verr. 2:3'), [])
  assert.deepEqual(found('Cp. 18:17-27 and In 20:22-26 and A.D. 356 and Christ 5:21'), [])
  assert.deepEqual(found('He said, "It is I." Mark my words, 3:4 times'), [])
  assert.deepEqual(found('Jude 5 and Job 42.15 and Gen 1 and Ps 23'), ['Job 42.15 = Job 42:15'], 'no chapter and verse, no link')
})

test('a number after a comma is another verse only when it plainly continues the list', () => {
  assert.deepEqual(found('John 3:16, 4 persons were there'), ['John 3:16 = John 3:16'])
  assert.deepEqual(found('Rom 8:28, 29 For we know'), ['Rom 8:28 = Romans 8:28', '29 = Romans 8:29'])
  assert.deepEqual(found('Rom 8:28, 5 For we know'), ['Rom 8:28 = Romans 8:28'], 'a list goes up, not back')
  assert.deepEqual(found('Ps 119:67,71, Jer 4:4'), ['Ps 119:67 = Psalms 119:67', '71 = Psalms 119:71', 'Jer 4:4 = Jeremiah 4:4'])
  assert.deepEqual(found('Mt 5:3; 6 sermons'), ['Mt 5:3 = Matthew 5:3'], 'a bare number after a semicolon is not a verse')
})

test('"ver. 16" style references are verses of the chapter being studied, and only where asked', () => {
  const text = 'the argument in ver. 2. Verse 32. (y) In verse 14, vv. 3-18 and verses 1-9.'
  assert.deepEqual(found(text), [])
  assert.deepEqual(found(text, { relative: true }), ['ver. 2 = John 3:2', 'Verse 32 = John 3:32', 'verse 14 = John 3:14', 'vv. 3-18 = John 3:3-18', 'verses 1-9 = John 3:1-9'])
  assert.deepEqual(found('Iliad. 18. ver. 318 and Ep. 1. v. 52', { relative: true }), [], 'a poem’s line numbers are not verses (and 318 is not a verse of John 3)')
  assert.deepEqual(found('Mt 5:3, see ver. 5', { relative: true, book: 40, chapter: 5 }), ['Mt 5:3 = Matthew 5:3', 'ver. 5 = Matthew 5:5'])
})

test('the text is never changed, only divided into pieces', () => {
  for (const text of ['', 'No citations here.', 'Rom 8:28, 29; Jer 4:4, 31:4,33 (Gen. i. 1) in verse 14, 2 Maccabees 7:9.', 'Ps 23:1\nPs 24:1,\n 2']) {
    assert.equal(joined(text, { relative: true }), text)
  }
})
