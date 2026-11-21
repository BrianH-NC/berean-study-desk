import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { bookFor } from './scriptureBooks.js'
import { bookSlug, desiringGodChapterUrl, graceToYouBookUrl, ligonierBookUrl, openTheBibleChapterUrl, sermonCentralChapterUrl, sermonCountPhrase, sermonIndexChapter } from './sermonSources.js'

const BOOKS = ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi', 'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude', 'Revelation']

test('book names become the slugs the sites use', () => {
  assert.equal(bookSlug('1 Peter'), '1-peter')
  assert.equal(bookSlug('Song of Solomon'), 'song-of-solomon')
  assert.equal(bookSlug('Psalms'), 'psalms')
  assert.deepEqual(BOOKS.map(bookSlug).filter((s) => /[^a-z0-9-]/.test(s)), [], 'only letters, digits and hyphens')
})

test('Desiring God: a chapter\'s messages page, except for the two books it has nothing on', () => {
  assert.equal(desiringGodChapterUrl('John', 3), 'https://www.desiringgod.org/scripture/john/3/messages')
  assert.equal(desiringGodChapterUrl('1 Peter', 2), 'https://www.desiringgod.org/scripture/1-peter/2/messages')
  assert.equal(desiringGodChapterUrl('Esther', 1), null)
  assert.equal(desiringGodChapterUrl('Nahum', 2), null)
  assert.equal(desiringGodChapterUrl('John', 0), null)
  assert.equal(BOOKS.filter((b) => desiringGodChapterUrl(b, 1) === null).join(','), 'Esther,Nahum')
})

test('Ligonier and Grace to You: one page per book', () => {
  assert.equal(ligonierBookUrl('1 Peter'), 'https://learn.ligonier.org/scripture/1-peter')
  assert.equal(ligonierBookUrl('Song of Solomon'), 'https://learn.ligonier.org/scripture/song-of-solomon')
  assert.equal(graceToYouBookUrl('1 Peter'), 'https://www.gty.org/sermons/scripture/1%20Peter')
  assert.equal(graceToYouBookUrl('Psalms'), 'https://www.gty.org/sermons/scripture/Psalms')
  assert.equal(ligonierBookUrl(''), null)
  assert.equal(new Set(BOOKS.map(graceToYouBookUrl)).size, 66, 'every book has its own address')
  assert.equal(new Set(BOOKS.map(ligonierBookUrl)).size, 66)
})

test('SermonCentral: its own spellings for the Psalms and the Song of Solomon', () => {
  assert.equal(sermonCentralChapterUrl('John', 3), 'https://www.sermoncentral.com/sermons/sermons-about-john-chapter-3')
  assert.equal(sermonCentralChapterUrl('1 Peter', 2), 'https://www.sermoncentral.com/sermons/sermons-about-1-peter-chapter-2')
  assert.equal(sermonCentralChapterUrl('Psalms', 23), 'https://www.sermoncentral.com/sermons/sermons-about-psalm-chapter-23')
  assert.equal(sermonCentralChapterUrl('Song of Solomon', 2), 'https://www.sermoncentral.com/sermons/sermons-about-song-of-songs-chapter-2')
  assert.equal(sermonCentralChapterUrl('John', 0), null)
})

const snapshot = JSON.parse(readFileSync(new URL('../../public/data/sermon-chapters.json', import.meta.url), 'utf8'))

test('SermonIndex: a chapter page link and a count, for the 66 books in order', () => {
  assert.equal(snapshot.sermonIndex.books.length, 66)
  assert.deepEqual(snapshot.sermonIndex.books.map((b) => b.name).filter((n, i) => bookFor(n) !== i + 1), [], 'book order matches the app\'s numbering')
  const john3 = sermonIndexChapter(snapshot, 43, 3)
  assert.equal(john3.url, 'https://www.sermonindex.net/bible/BSB/JHN/3/#sec-sermons')
  assert.ok(john3.count > 1000)
  assert.equal(sermonIndexChapter(snapshot, 43, 99), null)
  assert.equal(sermonIndexChapter(null, 43, 3), null)
})

test('the sermon count is rounded down, never up', () => {
  assert.equal(sermonCountPhrase(4625), 'More than 3,500 sermons')   // 4,312 distinct sermons in John 3
  assert.equal(sermonCountPhrase(621), 'More than 450 sermons')      // 542 in Jude
  assert.equal(sermonCountPhrase(75), 'More than 60 sermons')        // 60 in Philemon
  assert.equal(sermonCountPhrase(14), 'More than 10 sermons')
  assert.equal(sermonCountPhrase(9), 'A few sermons')
  assert.equal(sermonCountPhrase(0), '')
})

test('Open the Bible: a link only for the chapters it has a page for', () => {
  assert.equal(openTheBibleChapterUrl(snapshot, 'John', 3), 'https://openthebible.org/scripture/john-3/?filter-post_type=sermon')
  assert.equal(openTheBibleChapterUrl(snapshot, 'Psalms', 23), 'https://openthebible.org/scripture/psalm-23/?filter-post_type=sermon')
  assert.equal(openTheBibleChapterUrl(snapshot, '1 John', 4), 'https://openthebible.org/scripture/1-john-4-1-john/?filter-post_type=sermon')
  assert.equal(openTheBibleChapterUrl(snapshot, '1 Corinthians', 15), 'https://openthebible.org/scripture/1-corinthians-15/?filter-post_type=sermon', 'the plain address wins when it exists')
  assert.equal(openTheBibleChapterUrl(snapshot, 'Esther', 1), null)
  assert.equal(openTheBibleChapterUrl(snapshot, 'John', 0), null)
  assert.ok(snapshot.openTheBible.chapters.length > 250)
})

test('Catena: a verse’s patristic page, or the chapter, using its own book codes', async () => {
  const { catenaUrl } = await import('./sermonSources.js')
  assert.equal(catenaUrl(bookFor('John'), 3, 16), 'https://catenabible.com/bible/nkjv/jn/3/16/patristics')
  assert.equal(catenaUrl(bookFor('John'), 3), 'https://catenabible.com/bible/nkjv/jn/3')
  assert.equal(catenaUrl(bookFor('Revelation'), 22), 'https://catenabible.com/bible/nkjv/rv/22')
  assert.equal(catenaUrl(bookFor('Song of Solomon'), 2, 4), 'https://catenabible.com/bible/nkjv/sg/2/4/patristics')
  assert.equal(catenaUrl(bookFor('1 Peter'), 1), 'https://catenabible.com/bible/nkjv/1pt/1')
  assert.equal(catenaUrl(bookFor('Joshua'), 1), 'https://catenabible.com/bible/nkjv/jo/1')
  assert.equal(catenaUrl(0, 1), null)
})
