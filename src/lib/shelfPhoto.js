// Fetch wrapper for the identify-shelf-photo Edge Function -- same calling
// convention as theologyCheck.js / esv.js (plain fetch, real user session
// auth, key stays server-side).

import { authHeaders } from './functionAuth'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const FUNCTIONS_BASE = SUPABASE_URL + '/functions/v1'

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1]) // strip the data: URL prefix
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Returns { books: [{ title, author, confidence }, ...] } or throws.
export async function identifyShelfPhoto(file) {
  const image_base64 = await fileToBase64(file)
  const res = await fetch(`${FUNCTIONS_BASE}/identify-shelf-photo`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ image_base64, media_type: file.type }),
  })
  const data = await res.json()
  if (!res.ok || data.error) {
    throw new Error(data.error || `identify-shelf-photo request failed (${res.status})`)
  }
  return data
}
