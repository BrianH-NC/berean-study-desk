#!/usr/bin/env node
// Builds public/data/chrysostom-homilies.json: for each of John Chrysostom's New Testament homilies on
// New Advent (the Nicene and Post-Nicene Fathers translations, public domain), the passage it preaches on
// and a link to it -- the same shape as spurgeon-sermons.json, so Bible Study matches them the same way.
//
//   node scripts/import-chrysostom.mjs public/data/chrysostom-homilies.json [--cache <dir>] [--limit <n>]
//
// It reads each work's index page, then each homily's page. The passage is stated in the first short
// paragraph, in one of a few styles (see readHeading). Every passage is checked against the real verse
// counts; a homily whose passage can't be read (the introductory "Argument" homilies, mostly) is listed at
// the end and left out, not guessed. About 480 pages, fetched one at a time with a pause, using an
// identifying User-Agent (New Advent's robots.txt allows this). --cache keeps the pages, so a re-run is free.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chapterCount, verseCount } from '../src/lib/verseCounts.js'
import { bookFor } from '../src/lib/scriptureBooks.js'

const args = process.argv.slice(2)
const out = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--cache' && args[args.indexOf(a) - 1] !== '--limit')
const option = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null }
if (!out) { console.error('usage: import-chrysostom.mjs <out.json> [--cache <dir>] [--limit <n>]'); process.exit(2) }
const cacheDir = option('--cache')
const limit = Number(option('--limit') || 0)
if (cacheDir) mkdirSync(cacheDir, { recursive: true })

const BASE = 'https://www.newadvent.org/fathers/'
const UA = 'BereanStudyDesk-importer/1.0 (personal Bible study app; one-time metadata import)'
// New Advent's work number, the book it preaches through (number as the app counts them), the book's
// name, and the code New Advent's own Bible links use for it ("gal001.htm" is Galatians 1).
const WORKS = [
  ['2001', 40, 'Matthew', 'mat'], ['2101', 44, 'Acts', 'act'], ['2102', 45, 'Romans', 'rom'], ['2201', 46, '1 Corinthians', '1co'], ['2202', 47, '2 Corinthians', '2co'],
  ['2301', 49, 'Ephesians', 'eph'], ['2302', 50, 'Philippians', 'phi'], ['2303', 51, 'Colossians', 'col'], ['2304', 52, '1 Thessalonians', '1th'], ['2305', 53, '2 Thessalonians', '2th'],
  ['2306', 54, '1 Timothy', '1ti'], ['2307', 55, '2 Timothy', '2ti'], ['2308', 56, 'Titus', 'tit'], ['2309', 57, 'Philemon', 'phm'], ['2310', 48, 'Galatians', 'gal'],
  ['2401', 43, 'John', 'joh'], ['2402', 58, 'Hebrews', 'heb'],
]

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
async function page(id) {
  const file = cacheDir && join(cacheDir, `${id}.html`)
  if (file && existsSync(file)) return readFileSync(file, 'utf8')
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(`${BASE}${id}.htm`, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(30000) })
      if (res.status === 404) return null
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const html = await res.text()
      if (file) writeFileSync(file, html)
      await wait(700)
      return html
    } catch (error) {
      if (attempt === 3) throw new Error(`${id}: ${error.message}`)
      await wait(2000 * attempt)
    }
  }
}

const decode = (s) => s.replace(/&nbsp;/g, ' ').replace(/&#151;|&mdash;/g, '—').replace(/&#8211;|&ndash;/g, '-').replace(/&amp;/g, '&').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
const text = (html) => decode(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()
const ROMAN = { i: 1, v: 5, x: 10, l: 50, c: 100 }
const fromRoman = (s) => { const r = s.toLowerCase(); let n = 0; for (let i = 0; i < r.length; i++) n += ROMAN[r[i + 1]] > ROMAN[r[i]] ? -ROMAN[r[i]] : ROMAN[r[i]]; return n }
const lastNumber = (tail) => { const n = (tail || '').match(/\d+/g); return n ? Number(n.at(-1)) : 0 }

// A checked passage string ("John 1:49-2:4"), or null if those verses don't exist.
function passage(bookName, bookNumber, c, v, endChapter, endVerse) {
  c = Number(c); v = Number(v)
  if (!(c >= 1 && c <= chapterCount(bookNumber)) || !(v >= 1 && v <= verseCount(bookNumber, c))) return null
  if (endChapter && endVerse) {
    const [ec, ev] = [Number(endChapter), Number(endVerse)]
    return ec > c && ec <= chapterCount(bookNumber) && ev >= 1 && ev <= verseCount(bookNumber, ec) ? `${bookName} ${c}:${v}-${ec}:${ev}` : `${bookName} ${c}:${v}`
  }
  if (endVerse) { const e = Math.min(Number(endVerse), verseCount(bookNumber, c)); return e > v ? `${bookName} ${c}:${v}-${e}` : `${bookName} ${c}:${v}` }
  return `${bookName} ${c}:${v}`
}

const VERSE_TAIL = String.raw`((?:\s*(?:-{1,2}|–|,)\s*\d+)*)`
const BOOK = String.raw`((?:[1-3]\s)?[A-Z][a-z]+)`
// The passages a heading states, in the styles New Advent uses:
//   "Romans 1:1-2"   "Colossians 1:1, 2"   "John 1:49-2:4"        the passage in full
//   "Matt. I. 1"     "Philemon i. 1-3"                            a Roman-numeral chapter
//   "Chapter I. Verses 1-2"   "Verse 1-3"                         the book is the work's; for "Verse", the chapter
//                                                                  comes from the page's own Bible link
// `chapterHint` is that chapter (from "gal001.htm"), used only for headings that give just verses.
function readHeading(heading, bookName, bookNumber, chapterHint) {
  // "MATT. XV. 32": New Advent sometimes capitalises the book name, and "Matt" is what the book table knows.
  heading = heading.replace(/\b([A-Z])([A-Z]{2,})\b(?=\.?\s+[IVXLCivxlc]+\.)/g, (_, a, b) => a + b.toLowerCase())
  const found = []
  const add = (p) => { if (p) found.push(p) }
  const full = new RegExp(`${BOOK}\\.?\\s+(\\d+):(\\d+)(?:\\s*[-–]\\s*(\\d+):(\\d+)|${VERSE_TAIL})`, 'g')
  for (const m of heading.matchAll(full)) {
    if (bookFor(m[1]) !== bookNumber) continue
    add(m[5] ? passage(bookName, bookNumber, m[2], m[3], m[4], m[5]) : passage(bookName, bookNumber, m[2], m[3], null, lastNumber(m[6])))
  }
  if (!found.length) {
    const roman = new RegExp(`${BOOK}\\.?\\s+([IVXLCivxlc]+)\\.?\\s+(\\d+)${VERSE_TAIL}`, 'g')
    for (const m of heading.matchAll(roman)) if (bookFor(m[1]) === bookNumber) add(passage(bookName, bookNumber, fromRoman(m[2]), m[3], null, lastNumber(m[4])))
  }
  if (!found.length) {
    const chapter = new RegExp(`Chapter\\s+([IVXLC]+)\\.?,?\\s*Verses?\\s+(\\d+)${VERSE_TAIL}`, 'gi')
    for (const m of heading.matchAll(chapter)) add(passage(bookName, bookNumber, fromRoman(m[1]), m[2], null, lastNumber(m[3])))
  }
  if (!found.length && chapterHint) {
    const m = heading.match(new RegExp(`^Verses?\\s+(\\d+)${VERSE_TAIL}`, 'i'))
    if (m) add(passage(bookName, bookNumber, chapterHint, m[1], null, lastNumber(m[2])))
  }
  return [...new Set(found)]
}

// Headings on New Advent's own pages that name a passage the homily isn't on (a Roman numeral misread in the
// transcription), corrected from the text each homily quotes. Keyed by page, so a fixed page is simply ignored.
const SOURCE_TYPOS = {
  200154: 'Matthew 16:13',   // heading says "XIV. 13"; the homily is on "the coasts of Caesarea Philippi"
  200174: 'Matthew 23:29',   // no heading: it opens on "Woe unto you, because ye build the tombs of the prophets"
  210227: 'Romans 16:25-27', // heading says "XIV. 25-27"; Romans 14 has 23 verses, and this is the last homily
}
const sermons = []
const report = { works: {}, unread: [], indexMismatches: [] }
for (const [workId, bookNumber, bookName, bibleCode] of WORKS) {
  const index = await page(workId)
  if (!index) { console.error(`no index page for ${workId}`); continue }
  // Homily links, with whatever follows them ("John 1:6-8" on the John index).
  let homilies = [...index.matchAll(/<a href="\.\.\/fathers\/(\d+)\.htm">(?:<strong>)?([^<]+)(?:<\/strong>)?<\/a>([^<]*)/g)]
    .filter((m) => m[1].startsWith(workId) && m[1].length > workId.length)
  if (limit) homilies = homilies.slice(0, limit)
  const stat = (report.works[bookName] = { homilies: homilies.length, withPassage: 0, noPassage: 0 })
  for (const [, id, label, afterLink] of homilies) {
    const html = await page(id)
    if (!html) { stat.noPassage++; report.unread.push(`${bookName} ${label.trim()} (${id}): page not found`); continue }
    const title = text(html.match(/<h1>([\s\S]*?)<\/h1>/)?.[1] || label)
    // the first paragraph after New Advent's appeal paragraph is where the passage is stated
    const body = html.slice(html.indexOf('</em></p>') + 9)
    const firstHtml = body.match(/<p[^>]*>([\s\S]*?)<\/p>/)?.[1] || ''
    const first = text(firstHtml)
    // the chapter, from the heading's own Bible link or else the first link to this book in the homily
    const link = new RegExp(`\\.\\./bible/${bibleCode}(\\d{3})\\.htm`)
    const chapterHint = Number((firstHtml.match(link) || body.match(link) || [])[1] || 0)
    let refs = SOURCE_TYPOS[id] ? [SOURCE_TYPOS[id]] : first.length <= 140 ? readHeading(first, bookName, bookNumber, chapterHint)
      // a long paragraph is a heading only when it opens with one ('MATT. XV. 32. "But Jesus called..."'), then quotes the verse
      : /^[A-Za-z]+\.?\s+[IVXLC]+\.\s+\d+/.test(first) ? readHeading(first.slice(0, 50), bookName, bookNumber, chapterHint) : []
    const stated = afterLink.trim() ? readHeading(`${bookName} ${afterLink.replace(/^\s*(?:John\s*)?/, '')}`, bookName, bookNumber, 0) : []
    if (stated.length && refs.length && stated.join(';') !== refs.join(';')) report.indexMismatches.push(`${title}: index says ${stated.join('; ')}, page says ${refs.join('; ')}`)
    if (!refs.length && stated.length) refs = stated
    else if (stated.length === 1 && refs.length === 1 && stated[0].split('-')[0] === refs[0].split('-')[0]) refs = stated   // same start: the index gives the homily's whole range
    if (!refs.length) { stat.noPassage++; report.unread.push(`${title} (${id}): ${first.slice(0, 70) || '(no heading)'}`); continue }
    stat.withPassage++
    sermons.push({ reference: refs.join('; '), title, url: `${BASE}${id}.htm` })
  }
  console.log(`${bookName.padEnd(16)} ${stat.homilies} homilies, ${stat.withPassage} with a passage`)
}
writeFileSync(out, JSON.stringify({
  source: BASE,
  author: 'John Chrysostom',
  note: "John Chrysostom's homilies on the New Testament, Nicene and Post-Nicene Fathers (public domain), from New Advent. Metadata only: no homily text is copied.",
  retrieved: new Date().toISOString().slice(0, 10),
  sermons,
}))
console.log(`\nWrote ${out}: ${sermons.length} homilies`)
if (report.indexMismatches.length) console.log(`\n${report.indexMismatches.length} where the index and the page disagree:\n  ${report.indexMismatches.join('\n  ')}`)
if (report.unread.length) console.log(`\n${report.unread.length} homilies without a readable passage (left out):\n  ${report.unread.join('\n  ')}`)
