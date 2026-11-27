// "Save to my Sermons" for a SermonIndex sermon: fetches its full record from the open SermonIndex API (no key,
// CORS open), keeps the timed VTT transcript when there is one, and saves it into the reader's own library, where the
// usual Scripture indexing, study guide and Notes links take over.
import { parsePrimaryText } from './primaryText'
import { supabase } from './supabase'
import { parseReference } from './bsb'
import { parseTimedTranscript } from './sermonModel'
import { saveSermon, transcriptFields } from './sermons'
import { primaryScripture, sermonApiUrl, sermonIndexValues } from './sermonIndexData'

const MAX_TRANSCRIPT = 1000000 // the sermons table's own limit

// The id of a sermon already saved from this SermonIndex page, or null.
export async function savedSermonId(userId, sourceUrl) {
  const { data, error } = await supabase.from('sermons').select('id').eq('user_id', userId).eq('source_url', sourceUrl).limit(1)
  if (error) throw error
  return data?.[0]?.id || null
}

async function getJson(url) {
  const res = await fetch(url, { credentials: 'omit', signal: AbortSignal.timeout(20000) })
  if (!res.ok) throw new Error(res.status === 404 ? 'SermonIndex no longer lists this sermon.' : `SermonIndex did not respond (${res.status}). Try again.`)
  return res.json()
}

async function transcriptFor(detail) {
  if (detail.vttUrl) {
    try {
      const res = await fetch(detail.vttUrl, { credentials: 'omit', signal: AbortSignal.timeout(20000) })
      if (res.ok) {
        const timed = parseTimedTranscript(await res.text())
        if (timed.text.length <= MAX_TRANSCRIPT) return timed
      }
    } catch { /* fall back to the plain transcript in the record */ }
  }
  const text = String(detail.transcript || '').trim().slice(0, MAX_TRANSCRIPT)
  return text ? { text, cues: [] } : null
}

// Returns { id, existing } -- existing is true when the sermon was already in the library.
export async function saveSermonIndexSermon(userId, sermonIndexId, passage) {
  const detail = await getJson(sermonApiUrl(sermonIndexId))
  const already = await savedSermonId(userId, detail.url)
  if (already) return { id: already, existing: true }
  const primaryText = primaryScripture(detail, passage)
  const primaryRef = primaryText ? parsePrimaryText(primaryText, parseReference) : null
  const values = sermonIndexValues(detail, { primaryText: primaryRef ? primaryText : '', primaryRef })
  const transcript = await transcriptFor(detail)
  const id = crypto.randomUUID()
  await saveSermon(userId, id, { ...values, ...(transcript ? transcriptFields(transcript.text, transcript.cues) : {}) })
  return { id, existing: false }
}
