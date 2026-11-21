// Builds public/data/sermon-chapters.json, the small snapshot behind two "Sermons for this passage" cards:
//
//   SermonIndex   how many of its free sermons are indexed to each chapter, from its open API
//                 (https://www.sermonindex.net/api/ : no key, "please cache", attribution encouraged). Only the
//                 per-book files are read, about 2 KB each; the per-chapter files list every sermon and run to megabytes.
//   Open the Bible  which chapters have a page of Pastor Colin Smith's teaching, from the "Sermons by Scripture"
//                 index at https://openthebible.org/browse-sermons/ (robots.txt allows it; one request).
//
// Usage: node scripts/snapshot-sermon-chapters.mjs [out.json]
import { writeFileSync } from 'node:fs'

const out = process.argv[2] || 'public/data/sermon-chapters.json'
const UA = 'BereanStudyDesk/1.0 (+https://bereanstudydesk.app; yearly sermon-count snapshot)'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function get(url, asJson) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: asJson ? 'application/json' : 'text/html' } })
  if (!res.ok) throw new Error(`${url}: ${res.status}`)
  return asJson ? res.json() : res.text()
}

const root = await get('https://api.sermonindex.net/v2/scripture', true)
const books = []
for (const b of root.books.sort((a, c) => a.order - c.order)) {
  const book = await get(`https://api.sermonindex.net/v2/scripture/${b.bookId}`, true)
  const counts = Array.from({ length: book.chapters }, () => 0)
  for (const c of book.chaptersWithSermons) counts[c.chapter - 1] = c.sermonCount
  books.push({ id: b.bookId, name: b.name, counts })
  await sleep(250)
}
if (books.length !== 66) throw new Error(`expected 66 books, got ${books.length}`)

const html = await get('https://openthebible.org/browse-sermons/', false)
const slugs = [...new Set([...html.matchAll(/href="https:\/\/openthebible\.org\/scripture\/([a-z0-9-]+)\/\?filter-post_type=sermon"/g)].map((m) => m[1]))]
  // Chapters only: "jude-22-23" and "numbers-22-24" are verse ranges. The three "…-1-john" style slugs are chapters whose
  // plain address is taken by something else, and are kept as they are.
  .filter((s) => /^(?:[1-3]-)?[a-z]+(?:-of-[a-z]+)?-\d+(?:-(?:[1-3]-)?[a-z]+)?$/.test(s))
  .sort()

writeFileSync(out, JSON.stringify({
  retrieved: new Date().toISOString().slice(0, 10),
  sermonIndex: { source: 'https://www.sermonindex.net/api/', totalReferences: root.totalReferences, books },
  openTheBible: { source: 'https://openthebible.org/browse-sermons/', chapters: slugs },
}))
console.log(`Wrote ${out}: ${books.length} books, ${books.reduce((n, b) => n + b.counts.filter(Boolean).length, 0)} chapters with SermonIndex sermons, ${slugs.length} Open the Bible chapters`)
