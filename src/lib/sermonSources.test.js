import test from 'node:test'
import assert from 'node:assert/strict'
import { bookSlug, desiringGodChapterUrl, graceToYouBookUrl, ligonierBookUrl, sermonCentralChapterUrl } from './sermonSources.js'

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
