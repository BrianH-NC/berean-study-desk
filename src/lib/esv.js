// Fetch wrapper for the esv-passage Edge Function — same calling convention
// as theologyCheck.js (plain fetch, real user session auth, key stays
// server-side).

import { authHeaders } from './functionAuth'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const FUNCTIONS_BASE = SUPABASE_URL + '/functions/v1'

// Returns { text, canonical } or throws.
export async function fetchEsvPassage(reference) {
  const res = await fetch(`${FUNCTIONS_BASE}/esv-passage`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ reference }),
  })
  const data = await res.json()
  if (!res.ok || data.error) {
    throw new Error(data.error || `esv-passage request failed (${res.status})`)
  }
  return data
}

// The edge function requests `include-first-verse-numbers: true`, so every
// verse in a passage's text comes back marked "[16] For God so loved...".
function parseEsvVerses(text) {
  const parts = text.split(/\[(\d+)\]/)
  const verses = []
  for (let i = 1; i < parts.length; i += 2) {
    verses.push({ number: parseInt(parts[i], 10), text: (parts[i + 1] || '').trim() })
  }
  return verses
}

// Returns [{ number, text }, ...] for a whole chapter -- lets the Bible Study
// reader treat ESV the same as the other comparison translations (fetch once
// per chapter, filter to the current selection client-side) instead of
// needing its own per-verse request shape.
export async function fetchEsvChapterVerses(bookName, chapter) {
  const result = await fetchEsvPassage(`${bookName} ${chapter}`)
  return parseEsvVerses(result.text)
}
