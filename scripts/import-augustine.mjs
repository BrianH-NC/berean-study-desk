#!/usr/bin/env node
// Builds public/data/augustine-sermons.json: Augustine's sermons and expositions on Scripture on New Advent
// (the Nicene and Post-Nicene Fathers translations, public domain), each with the passage it preaches on and a
// link to it -- the same shape as chrysostom-homilies.json, so Bible Study matches them the same way.
//
//   node scripts/import-augustine.mjs public/data/augustine-sermons.json [--cache <dir>]
//
// Sources, and how each one states its passage:
//   Tractates on John (1701)          the work's index lists each tractate's passage beside it
//   Homilies on 1 John (1702)         the same
//   Sermon on the Mount (1601)        two books: Matthew 5 and Matthew 6-7
//   Expositions on the Psalms (1801)  one page per psalm, numbered as in the Septuagint and Vulgate, which is how
//                                     Augustine knew them; converted here to the numbering a modern Bible uses
//   Sermons on the New Testament (1603)  each opens "On the words of the Gospel, Matthew 6:19, ..."; the first
//                                     reference on the page is the passage. Read from 97 pages; those that name
//                                     none (a sermon on a feast, say) are listed at the end and left out.
// Every passage is checked against the real verse counts. Pages are fetched one at a time with a pause, using an
// identifying User-Agent (New Advent's robots.txt allows this). --cache keeps them, so a re-run is free.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chapterCount, verseCount } from '../src/lib/verseCounts.js'
import { bookFor } from '../src/lib/scriptureBooks.js'

const args = process.argv.slice(2)
const option = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null }
const out = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--cache')
if (!out) { console.error('usage: import-augustine.mjs <out.json> [--cache <dir>]'); process.exit(2) }
const cacheDir = option('--cache')
if (cacheDir) mkdirSync(cacheDir, { recursive: true })

const BASE = 'https://www.newadvent.org/fathers/'
const UA = 'BereanStudyDesk-importer/1.0 (personal Bible study app; one-time metadata import)'
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

// "John 2:23-3:5" -> a checked reference string, or null if those verses don't exist.
function checked(bookName, c, v, ec, ev) {
  const book = bookFor(bookName)
  if (!book) return null
  const name = bookName
  c = Number(c); v = Number(v)
  if (!(c >= 1 && c <= chapterCount(book)) || !(v >= 1 && v <= verseCount(book, c))) return null
  if (ec && ev) {
    ec = Number(ec); ev = Number(ev)
    return ec > c && ec <= chapterCount(book) && ev >= 1 && ev <= verseCount(book, ec) ? `${name} ${c}:${v}-${ec}:${ev}` : `${name} ${c}:${v}`
  }
  if (ev) { ev = Math.min(Number(ev), verseCount(book, c)); return ev > v ? `${name} ${c}:${v}-${ev}` : `${name} ${c}:${v}` }
  return `${name} ${c}:${v}`
}
const REFERENCE = String.raw`((?:[1-3]\s)?[A-Z][a-z]+)\.?\s+(\d+):(\d+)(?:\s*[-–]\s*(?:(\d+):(\d+)|(\d+)))?`
function firstReference(string) {
  for (const m of string.matchAll(new RegExp(REFERENCE, 'g'))) {
    if (!bookFor(m[1])) continue
    const ref = m[5] ? checked(m[1], m[2], m[3], m[4], m[5]) : checked(m[1], m[2], m[3], null, m[4] || m[6])
    if (ref) return ref
  }
  return null
}

const SOURCE_TYPOS = { 1701094: 'John 16:4-7' }
const sermons = []
const unread = []
const add = (reference, title, id) => sermons.push({ reference, title, url: `${BASE}${id}.htm` })
const counts = {}

// Index lists: <a href="../fathers/1701001.htm"><strong>Tractate 1</strong></a> John 1:1-5
async function fromIndex(workId, label, titleFor) {
  const index = await page(workId)
  if (!index) throw new Error(`no index page for ${workId}`)
  let n = 0
  for (const [, id, name, after] of index.matchAll(/<a href="\.\.\/fathers\/(\d+)\.htm"><strong>([^<]+)<\/strong><\/a>([^<]*)/g)) {
    if (!id.startsWith(workId) || id.length === workId.length) continue
    // Tractate 94's index entry reads "John 16:44-47" for John 16:4-7 (the page opens on 16:4-5); "John 9" is the whole chapter.
    const stated = SOURCE_TYPOS[id] || text(after)
    const chapterOnly = stated.match(/^((?:[1-3]\s)?[A-Z][a-z]+)\s+(\d+)$/)
    const ref = chapterOnly && bookFor(chapterOnly[1]) && Number(chapterOnly[2]) <= chapterCount(bookFor(chapterOnly[1])) ? `${chapterOnly[1]} ${chapterOnly[2]}` : firstReference(stated)
    if (!ref) { unread.push(`${name} (${id}): "${text(after)}"`); continue }
    add(ref, titleFor(name), id); n++
  }
  counts[label] = n
}
await fromIndex('1701', 'Tractates on John', (name) => `${name} on the Gospel of John`)
await fromIndex('1702', 'Homilies on 1 John', (name) => `${name} on the First Epistle of John`)

// The Sermon on the Mount: two books, on Matthew 5 and on Matthew 6-7 (checked against the verse counts).
const MATTHEW = bookFor('Matthew')
if (verseCount(MATTHEW, 5) !== 48 || verseCount(MATTHEW, 7) !== 29) throw new Error('Matthew verse counts changed')
add('Matthew 5:1-48', 'On the Sermon on the Mount, Book I', '16011')
add('Matthew 6:1-7:29', 'On the Sermon on the Mount, Book II', '16012')
counts['Sermon on the Mount'] = 2

// The Psalms. Augustine numbers them as the Septuagint and Vulgate do. Where that differs from the Hebrew numbering
// a modern Bible follows (Psalms 9-147), his Psalm n is Hebrew n+1, with a few that split or join.
const PSALM = (n) => {
  if (n <= 8 || n >= 148) return [String(n)]
  if (n === 9) return ['9', '10']
  if (n <= 112) return [String(n + 1)]
  if (n === 113) return ['114', '115']
  if (n === 114 || n === 115) return ['116']
  if (n <= 145) return [String(n + 1)]
  return ['147']   // 146 and 147
}
counts.Psalms = 0
for (let n = 1; n <= 150; n++) {
  const hebrew = PSALM(n)
  if (hebrew.some((p) => Number(p) > chapterCount(bookFor('Psalms')))) throw new Error(`Psalm ${n} maps outside the Psalter`)
  const id = `1801${String(n).padStart(3, '0')}`
  const title = `Exposition on ${hebrew.length > 1 ? `Psalms ${hebrew[0]}-${hebrew[1]}` : `Psalm ${hebrew[0]}`}${hebrew[0] === String(n) && hebrew.length === 1 ? '' : ` (his Psalm ${n})`}`
  add(hebrew.length > 1 ? `Psalm ${hebrew[0]}-${hebrew[1]}` : `Psalm ${hebrew[0]}`, title, id); counts.Psalms++
}

// Sermons on the New Testament: the passage is the first reference on the page.
const list = await page('1603')
const sermonIds = [...list.matchAll(/<a href="\.\.\/fathers\/(1603\d+)\.htm"><strong>(Sermon \d+)<\/strong>/g)].map((m) => [m[1], m[2]])
counts['Sermons on the New Testament'] = 0
for (const [id, name] of sermonIds) {
  const html = await page(id)
  if (!html) { unread.push(`${name} (${id}): page not found`); continue }
  const body = text(html.slice(html.indexOf('</em></p>') + 9))
  const ref = firstReference(body.slice(0, 500))
  if (!ref) { unread.push(`${name} (${id}): ${body.slice(0, 90)}`); continue }
  add(ref, `${name} on the New Testament`, id); counts['Sermons on the New Testament']++
}

for (const [label, n] of Object.entries(counts)) console.log(`${label.padEnd(30)} ${n}`)
writeFileSync(out, JSON.stringify({
  source: BASE,
  author: 'Augustine',
  note: "Augustine's sermons and expositions on Scripture, Nicene and Post-Nicene Fathers (public domain), from New Advent. Metadata only: no text is copied.",
  retrieved: new Date().toISOString().slice(0, 10),
  sermons,
}))
console.log(`\nWrote ${out}: ${sermons.length} entries`)
if (unread.length) console.log(`\n${unread.length} without a readable passage (left out):\n  ${unread.join('\n  ')}`)
