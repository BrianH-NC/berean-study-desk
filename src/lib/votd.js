// Verse of the Day for the Home screen. The day's reference comes from
// BibleGateway's free VOTD feed (via the votd Edge Function, which only
// exists to work around the feed sending no CORS headers) -- but the actual
// verse text shown is looked up in the app's own local BSB copy rather than
// BibleGateway's NIV text, so this stays free of their text-attribution
// requirements beyond crediting the daily pick itself in the UI.
import { authHeaders } from './functionAuth'
import { parseReference, fetchVerseRange, formatReference } from './bsb'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const FUNCTIONS_BASE = SUPABASE_URL + '/functions/v1'
const CACHE_KEY_PREFIX = 'bsd-votd-'

function todayKey() {
  const d = new Date()
  return CACHE_KEY_PREFIX + d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()
}

// Returns { reference, book, chapter, verseStart, verseEnd, text }, cached
// in localStorage for the rest of the day so Home doesn't re-fetch (the edge
// function, and the BSB lookup behind it) every time it mounts.
export async function fetchVerseOfTheDay() {
  const key = todayKey()
  const cached = localStorage.getItem(key)
  if (cached) {
    try {
      return JSON.parse(cached)
    } catch {
      // fall through and re-fetch if the cached value is somehow corrupt
    }
  }

  const res = await fetch(`${FUNCTIONS_BASE}/votd`, { headers: await authHeaders() })
  const data = await res.json()
  if (!res.ok || data.error) {
    throw new Error(data.error || `votd request failed (${res.status})`)
  }

  const parsed = parseReference(data.reference)
  if (!parsed) throw new Error(`Couldn't parse today's reference "${data.reference}"`)

  const rows = await fetchVerseRange(parsed.book, parsed.chapter, parsed.verseStart || 1, parsed.verseEnd || parsed.verseStart || 1)
  const result = {
    reference: formatReference(parsed.book, parsed.chapter, parsed.verseStart, parsed.verseEnd),
    book: parsed.book,
    chapter: parsed.chapter,
    verseStart: parsed.verseStart,
    verseEnd: parsed.verseEnd,
    text: rows.map((r) => r.text).join(' '),
  }

  // Best-effort cache -- a quota error or disabled storage shouldn't break
  // showing the verse that was just successfully fetched.
  try {
    localStorage.setItem(key, JSON.stringify(result))
  } catch {
    // ignore
  }
  return result
}
