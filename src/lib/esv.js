// Fetch wrapper for the esv-passage Edge Function — same calling convention
// as theologyCheck.js (plain fetch, anon key auth, key stays server-side).

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const FUNCTIONS_BASE = SUPABASE_URL + '/functions/v1'

// Returns { text, canonical } or throws.
export async function fetchEsvPassage(reference) {
  const res = await fetch(`${FUNCTIONS_BASE}/esv-passage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ reference }),
  })
  const data = await res.json()
  if (!res.ok || data.error) {
    throw new Error(data.error || `esv-passage request failed (${res.status})`)
  }
  return data
}
