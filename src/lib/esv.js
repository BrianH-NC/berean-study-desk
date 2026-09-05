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
