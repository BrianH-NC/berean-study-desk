// Client for the licensed API.Bible translations (NIV, NLT, CSB), backed by
// the bibleplus-chapter Edge Function the same way esv.js backs ESV -- these
// are copyrighted, so the key stays server-side and this only ever sends a
// bibleId + chapterId, never the key itself.
import { authHeaders } from './functionAuth'
import { bookCodeFor } from './helloao'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const FUNCTIONS_BASE = SUPABASE_URL + '/functions/v1'

// Bible IDs are opaque per-account identifiers from API.Bible's own catalog
// (GET /v1/bibles) -- not guessable, and specific to which translations this
// app's API key is actually licensed for.
export const BIBLEPLUS_TRANSLATIONS = [
  { id: 'NIV', bibleId: '78a9f6124f344018-01', name: 'New International Version', short: 'NIV' },
  { id: 'NLT', bibleId: 'd6e14a625393b4da-01', name: 'New Living Translation', short: 'NLT' },
  { id: 'CSB', bibleId: 'a556c5305ee15c3f-01', name: 'Christian Standard Bible', short: 'CSB' },
]

// Recursively walks API.Bible's USX-derived content tree, collecting text
// runs by the verse they belong to. Verse-number label nodes (the bare
// digit rendered by the "verse" tag itself) carry no verseId and are
// naturally skipped; only nodes with attrs.verseId are real body text,
// whether they sit directly in a paragraph or nested inside a styled run
// (e.g. "wj" for words-of-Jesus).
function collectVerseText(node, out) {
  if (node.type === 'text') {
    if (node.attrs?.verseId) {
      const number = parseInt(node.attrs.verseId.split('.').pop(), 10)
      out[number] = (out[number] || '') + node.text
    }
    return
  }
  if (node.type === 'tag' && Array.isArray(node.items)) {
    node.items.forEach((child) => collectVerseText(child, out))
  }
}

// The first verseId found (depth-first) inside a top-level content block --
// each block is one USX paragraph, and paragraphs only ever break at a verse
// boundary, so this identifies which verse starts that paragraph.
function firstVerseNumberIn(node) {
  if (node.type === 'text') return node.attrs?.verseId || null
  if (node.type === 'tag' && Array.isArray(node.items)) {
    for (const child of node.items) {
      const found = firstVerseNumberIn(child)
      if (found) return found
    }
  }
  return null
}

// Returns [{ number, text, paragraphStart }, ...] for a whole chapter.
// paragraphStart marks the verses that begin one of the source's real USX
// paragraphs, letting the reader render actual paragraph breaks instead of
// one continuous run of verses.
export async function fetchBibleplusChapter(bibleplusId, bookName, chapter) {
  const meta = BIBLEPLUS_TRANSLATIONS.find((t) => t.id === bibleplusId)
  if (!meta) throw new Error(`Unknown translation "${bibleplusId}"`)
  const code = bookCodeFor(bookName)
  if (!code) throw new Error(`No book code for "${bookName}"`)

  const res = await fetch(`${FUNCTIONS_BASE}/bibleplus-chapter`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ bibleId: meta.bibleId, chapterId: `${code}.${chapter}` }),
  })
  const data = await res.json()
  if (!res.ok || data.error) {
    throw new Error(data.error || `bibleplus-chapter request failed (${res.status})`)
  }

  const byVerse = {}
  const paragraphStarts = new Set()
  data.content.forEach((block) => {
    collectVerseText(block, byVerse)
    const firstId = firstVerseNumberIn(block)
    if (firstId) paragraphStarts.add(parseInt(firstId.split('.').pop(), 10))
  })
  return Object.entries(byVerse)
    .map(([number, text]) => ({
      number: parseInt(number, 10),
      text: text.replace(/#/g, '').trim().replace(/\s+/g, ' '),
      paragraphStart: paragraphStarts.has(parseInt(number, 10)),
    }))
    .sort((a, b) => a.number - b.number)
}
