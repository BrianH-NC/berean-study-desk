// Fetch wrapper for the identify-shelf-photo Edge Function -- same calling
// convention as theologyCheck.js / esv.js (plain fetch, anon key auth, key
// stays server-side).

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
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
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ image_base64, media_type: file.type }),
  })
  const data = await res.json()
  if (!res.ok || data.error) {
    throw new Error(data.error || `identify-shelf-photo request failed (${res.status})`)
  }
  return data
}
