// Builds public/data/sermonindex/{1-66}.json: for every chapter, the SermonIndex sermons best suited to it, small
// enough for the "Sermons for this passage" card to list without touching SermonIndex's per-chapter API files
// (Romans 8 alone is 17 MB there).
//
// Source: SermonIndex's own bulk download, which its API pages ask readers to use instead of crawling
// (https://www.sermonindex.net/api/downloads/), plus its list of the 500 most-listened sermons. No key; attribution
// is encouraged, and the card names SermonIndex on every row.
//
// Usage:
//   curl -o sermonindex.db https://api.sermonindex.net/downloads/sermonindex.db      (about 170 MB)
//   node scripts/snapshot-sermonindex-passages.mjs sermonindex.db [outDir]
//
// SermonIndex publishes no listen counts per sermon, so the order is about fit to the chapter:
//   +4  the chapter holds the sermon's first (main) reference
//   +1  for each verse of the chapter it cites, up to 4
//   +2  it cites three chapters or fewer in all, so it is about this passage rather than ranging widely
//   +3  it is one of SermonIndex's 500 most-listened sermons
//   +1  it has a transcript, +1 it has audio or video
import { mkdirSync, writeFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'

const [dbPath, outDir = 'public/data/sermonindex'] = process.argv.slice(2)
if (!dbPath) throw new Error('Usage: node scripts/snapshot-sermonindex-passages.mjs sermonindex.db [outDir]')
const PER_CHAPTER = 15

const CODES = 'GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB PSA PRO ECC SNG ISA JER LAM EZK DAN HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV'.split(' ')
// Codes in the index that mean a known book. Ambiguous ones (COR, PET, SAM, TIM...) and the Apocrypha are skipped.
const ALIAS = { EZE: 'EZK', MAR: 'MRK' }

const res = await fetch('https://api.sermonindex.net/v2/sermons/popular', { headers: { 'User-Agent': 'BereanStudyDesk/1.0 (passage sermon snapshot)' } })
if (!res.ok) throw new Error(`popular list: ${res.status}`)
const popularJson = await res.json()
const popular = new Set((popularJson.sermons || popularJson).map((s) => s.id))

// Chapter counts, to drop references to chapters a book doesn't have (a few in the index are mistyped).
const root = await (await fetch('https://api.sermonindex.net/v2/scripture')).json()
const chapterCount = new Map(root.books.map((b) => [CODES.indexOf(b.bookId) + 1, b.chapters]))
if (chapterCount.size !== 66) throw new Error(`expected 66 books, got ${chapterCount.size}`)

const db = new DatabaseSync(dbPath, { readOnly: true })
const sermons = new Map(db.prepare('SELECT id, slug, title, speaker_slug, speaker, duration, media_type, has_audio, has_transcript, url FROM sermon').all().map((s) => [s.id, s]))
const speakers = new Map(db.prepare('SELECT slug, name, image FROM speaker').all().map((s) => [s.slug, s]))

// Each sermon's references in the order SermonIndex lists them (rowid order), so the first is its main text.
const refs = new Map()
for (const r of db.prepare('SELECT sermon_id, book_id, chapter, verse FROM sermon_scripture ORDER BY rowid').iterate()) {
  const code = ALIAS[r.book_id] || r.book_id
  const book = CODES.indexOf(code) + 1
  if (!book || !(r.chapter > 0) || r.chapter > chapterCount.get(book) || !sermons.has(r.sermon_id)) continue
  if (!refs.has(r.sermon_id)) refs.set(r.sermon_id, [])
  refs.get(r.sermon_id).push({ book, chapter: r.chapter, verse: r.verse > 0 ? r.verse : 0 })
}

// book -> chapter -> [{ id, score, verses }]
const index = new Map()
for (const [id, list] of refs) {
  const s = sermons.get(id)
  const chapters = new Map()
  for (const r of list) {
    const key = `${r.book}:${r.chapter}`
    if (!chapters.has(key)) chapters.set(key, new Set())
    if (r.verse) chapters.get(key).add(r.verse)
  }
  const first = `${list[0].book}:${list[0].chapter}`
  for (const [key, verses] of chapters) {
    const [book, chapter] = key.split(':').map(Number)
    const score = (key === first ? 4 : 0) + Math.min(verses.size, 4) + (chapters.size <= 3 ? 2 : 0) + (popular.has(id) ? 3 : 0)
      + (s.has_transcript ? 1 : 0) + (s.media_type === 'AUDIO' || s.media_type === 'VIDEO' ? 1 : 0)
    if (!index.has(book)) index.set(book, new Map())
    const byChapter = index.get(book)
    if (!byChapter.has(chapter)) byChapter.set(chapter, [])
    byChapter.get(chapter).push({ id, score, verses: [...verses].sort((a, b) => a - b) })
  }
}

mkdirSync(outDir, { recursive: true })
const retrieved = new Date().toISOString().slice(0, 10)
let rows = 0
for (let book = 1; book <= 66; book++) {
  const used = new Map()
  const chapters = {}
  for (const [chapter, list] of [...(index.get(book) || [])].sort((a, b) => a[0] - b[0])) {
    list.sort((a, b) => b.score - a.score || sermons.get(a.id).title.localeCompare(sermons.get(b.id).title))
    chapters[chapter] = {
      total: list.length,
      sermons: list.slice(0, PER_CHAPTER).map(({ id, verses }) => {
        const s = sermons.get(id)
        const sp = speakers.get(s.speaker_slug)
        used.set(s.speaker_slug, [sp?.name || s.speaker, sp?.image && !sp.image.includes('default-si-speaker') ? sp.image : null])
        rows++
        // [id, title, speaker slug, page path under /speakers/, duration, a(udio)|v(ideo)|t(ext), has transcript, verses cited]
        return [id, s.title, s.speaker_slug, s.url.replace('https://www.sermonindex.net/speakers/', ''), s.duration || '', s.media_type === 'AUDIO' ? 'a' : s.media_type === 'VIDEO' ? 'v' : 't', s.has_transcript ? 1 : 0, verses]
      }),
    }
  }
  writeFileSync(`${outDir}/${book}.json`, JSON.stringify({ book: CODES[book - 1], retrieved, source: 'https://www.sermonindex.net/api/downloads/', speakers: Object.fromEntries(used), chapters }))
}
console.log(`Wrote ${outDir}: ${rows} sermon rows across ${[...index.values()].reduce((n, m) => n + m.size, 0)} chapters`)
