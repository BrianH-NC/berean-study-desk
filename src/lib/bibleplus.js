// Client for the licensed API.Bible translations, backed by
// the bibleplus-chapter Edge Function the same way esv.js backs ESV -- these
// are copyrighted, so the key stays server-side and this only ever sends a
// bibleId + chapterId, never the key itself.
import { authHeaders } from './functionAuth'
import { bookCodeFor } from './helloao'
import { versesFromContent } from './bibleplusParse'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const FUNCTIONS_BASE = SUPABASE_URL + '/functions/v1'

// Bible IDs are opaque per-account identifiers from API.Bible's own catalog
// (GET /v1/bibles) -- not guessable, and specific to which translations this
// app's API key is actually licensed for.
export const BIBLEPLUS_TRANSLATIONS = [
  { id: 'NIV', bibleId: '78a9f6124f344018-01', name: 'New International Version', short: 'NIV' },
  { id: 'NLT', bibleId: 'd6e14a625393b4da-01', name: 'New Living Translation', short: 'NLT' },
  { id: 'CSB', bibleId: 'a556c5305ee15c3f-01', name: 'Christian Standard Bible', short: 'CSB' },
  { id: 'NKJV', bibleId: '63097d2a0a2f7db3-01', name: 'New King James Version', short: 'NKJV' },
  { id: 'MSG', bibleId: '6f11a7de016f942e-01', name: 'The Message', short: 'MSG' },
  { id: 'AMP', bibleId: 'a81b73293d3080c9-01', name: 'Amplified Bible', short: 'AMP' },
  { id: 'CEV', bibleId: '555fef9a6cb31151-01', name: 'Contemporary English Version', short: 'CEV' },
  { id: 'NASB2020', bibleId: 'a761ca71e0b3ddcf-01', name: 'New American Standard Bible 2020', short: 'NASB 2020' },
]

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

  // Joining the pieces of each verse (poetry lines, styled runs) is bibleplusParse.js's job.
  const verses = versesFromContent(data.content)
  verses.copyright = typeof data.copyright === 'string' ? data.copyright : ''
  return verses
}
