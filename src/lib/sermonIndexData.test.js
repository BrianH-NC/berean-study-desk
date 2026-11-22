import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { chapterSermons, primaryScripture, sermonIndexValues, versesLabel } from './sermonIndexData.js'

const romans = JSON.parse(readFileSync('public/data/sermonindex/45.json', 'utf8'))

test('a chapter lists up to 15 sermons with speaker, link and the verses they cite', () => {
  const { total, sermons } = chapterSermons(romans, 8)
  assert.ok(total > 1000)
  assert.equal(sermons.length, 15)
  for (const s of sermons) {
    assert.match(s.id, /^[\w-]{16}$/)
    assert.ok(s.title && s.speaker)
    assert.match(s.url, /^https:\/\/www\.sermonindex\.net\/speakers\/[^/]+\/[^/]+\/$/)
    assert.ok(Array.isArray(s.verses))
  }
  assert.deepEqual(chapterSermons(romans, 999), { total: 0, sermons: [] })
})

test('sermons on the selected verses move to the top, keeping their order', () => {
  const plain = chapterSermons(romans, 8).sermons
  const picked = plain.find((s, i) => i > 0 && s.verses.length)
  const verse = picked.verses[0]
  const sorted = chapterSermons(romans, 8, [verse]).sermons
  assert.ok(sorted[0].verses.includes(verse))
  const firstOff = sorted.findIndex((s) => !s.onSelected)
  assert.ok(sorted.slice(firstOff).every((s) => !s.onSelected))
})

test('verse labels', () => {
  assert.equal(versesLabel(8, [28, 35]), '8:28, 35')
  assert.equal(versesLabel(8, []), 'ch. 8')
})

const detail = {
  id: 'GX7CRS1lybv-Zow8', title: ' 1 Kings 16-18 - Part 1 ', speaker: 'Leonard Ravenhill', url: 'https://www.sermonindex.net/speakers/leonard-ravenhill/1-kings-16-18-part-1/',
  speakerImage: 'https://www.sermonindex.net/images/speakers/l/leonardravenhill.png', summary: 'A call to know God.', description: 'In this video, the speaker…',
  mediaType: 'AUDIO', mp3Url: 'https://archive.org/x.mp3', pdfUrl: 'https://www.sermonindex.net/x.pdf',
  topics: [{ name: 'Christian Life', slug: 'christian-life' }, { name: 'Christian Life', slug: 'dup' }],
  scripture: [{ text: '1 Kings 17:1-18', book: '1 Kings', chapter: 17, verse: 1 }, { text: 'Matthew 4:4', book: 'Matthew', chapter: 4, verse: 4 }],
}

test('the main text is the reference in the chapter being read, else the sermon’s first', () => {
  assert.equal(primaryScripture(detail, { book: 'Matthew', chapter: 4 }), 'Matthew 4:4')
  assert.equal(primaryScripture(detail, { book: 'Romans', chapter: 8 }), '1 Kings 17:1-18')
  assert.equal(primaryScripture({ scripture: [] }), '')
})

test('a SermonIndex sermon maps to a library record, using its summary and naming the source', () => {
  const v = sermonIndexValues(detail, { primaryText: '1 Kings 17:1-18', primaryRef: { book: '1 Kings' } })
  assert.equal(v.title, '1 Kings 16-18 - Part 1')
  assert.equal(v.description, 'A call to know God.')
  assert.equal(v.source_url, detail.url)
  assert.equal(v.source_type, 'audio')
  assert.equal(v.image_url, detail.speakerImage)
  assert.deepEqual(v.tags, ['Christian Life'])
  assert.match(v.notes, /Saved from SermonIndex\.net/)
  assert.match(v.notes, /Listen: https:\/\/archive\.org\/x\.mp3/)
  assert.equal(sermonIndexValues({ ...detail, speakerImage: 'https://sermonindex1.b-cdn.net/default-si-speaker.png', mediaType: 'VIDEO', thumbnailUrl: 'https://img.youtube.com/t.jpg' }).image_url, 'https://img.youtube.com/t.jpg')
})
