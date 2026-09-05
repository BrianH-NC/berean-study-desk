// Fetch wrapper for the identify-book-image Edge Function -- same calling
// convention as shelfPhoto.js, but identifies a single book from a cover or
// listing photo instead of many spines on a shelf.

import { authHeaders } from './functionAuth'
import { fileToBase64 } from './shelfPhoto'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const FUNCTIONS_BASE = SUPABASE_URL + '/functions/v1'

// Returns { title, author, isbn, confidence } (any field may be null) or throws.
export async function identifyBookImage(file) {
  const image_base64 = await fileToBase64(file)
  const res = await fetch(`${FUNCTIONS_BASE}/identify-book-image`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ image_base64, media_type: file.type }),
  })
  const data = await res.json()
  if (!res.ok || data.error) {
    throw new Error(data.error || `identify-book-image request failed (${res.status})`)
  }
  return data
}
