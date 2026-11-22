// SermonIndex sermons for a chapter (from the snapshot built by scripts/snapshot-sermonindex-passages.mjs) and the
// mapping that turns one SermonIndex sermon into a record in the reader's own Sermons library.
// No imports that need a browser or Supabase, so this can be tested under Node.

export const SERMON_INDEX_SITE = 'https://www.sermonindex.net'
export const SERMON_INDEX_API = 'https://api.sermonindex.net/v2'
const MEDIA = { a: 'Audio', v: 'Video', t: 'Text' }

// Rows of a chapter, as plain objects. Sermons that cite one of the selected verses come first, keeping the
// snapshot's order otherwise.
export function chapterSermons(data, chapter, selectedVerses = []) {
  const entry = data?.chapters?.[chapter]
  if (!entry) return { total: 0, sermons: [] }
  const chosen = new Set(selectedVerses)
  const sermons = entry.sermons.map(([id, title, speakerSlug, path, duration, media, transcript, verses], order) => {
    const [speaker, image] = data.speakers?.[speakerSlug] || [speakerSlug, null]
    return { id, title, speaker, speakerSlug, image, duration, media: MEDIA[media] || 'Audio', transcript: !!transcript, verses, order,
      url: `${SERMON_INDEX_SITE}/speakers/${path}`, onSelected: verses.some((v) => chosen.has(v)) }
  })
  if (chosen.size) sermons.sort((a, b) => Number(b.onSelected) - Number(a.onSelected) || a.order - b.order)
  return { total: entry.total, sermons }
}

// "8:28, 35, 37" -- the verses of the chapter a sermon cites.
export function versesLabel(chapter, verses) {
  return verses?.length ? `${chapter}:${verses.join(', ')}` : `ch. ${chapter}`
}

// The sermon's reference within the chapter being read, else its first reference: e.g. "Romans 8:28-39".
export function primaryScripture(detail, passage) {
  const list = Array.isArray(detail?.scripture) ? detail.scripture : []
  const here = passage && list.find((r) => r.book === passage.book && Number(r.chapter) === Number(passage.chapter))
  const pick = here || list[0]
  return pick ? String(pick.text || `${pick.book} ${pick.chapter}${pick.verse ? `:${pick.verse}` : ''}`) : ''
}

const DEFAULT_PORTRAIT = /default-si-speaker/
// Fields for saveSermon(). The transcript is added separately (it may need its own fetch).
export function sermonIndexValues(detail, { primaryText = '', primaryRef = null } = {}) {
  const media = detail.mediaType === 'VIDEO' ? 'video' : detail.mediaType === 'TEXT' ? 'text' : 'audio'
  const image = detail.speakerImage && !DEFAULT_PORTRAIT.test(detail.speakerImage) ? detail.speakerImage : (detail.thumbnailUrl || null)
  const listen = detail.mp3Url || detail.cdnMp3Url || detail.videoUrl || detail.mp4Url || ''
  return {
    title: String(detail.title || '').trim(),
    speaker: String(detail.speaker || '').trim(),
    series: '', church: '', sermon_date: null,
    source_url: detail.url,
    source_type: media,
    image_url: image,
    description: String(detail.summary || '').trim(),
    tags: [...new Set((detail.topics || []).map((t) => String(t.name || '').trim()).filter(Boolean))].slice(0, 12),
    primary_text: primaryText,
    primary_ref: primaryRef,
    notes: [`Saved from SermonIndex.net: ${detail.url}`, listen && `${media === 'video' ? 'Watch' : 'Listen'}: ${listen}`, detail.pdfUrl && `Transcript PDF: ${detail.pdfUrl}`,
      'The summary and topics were written by SermonIndex and may be machine-generated; check them against the sermon.'].filter(Boolean).join('\n'),
  }
}

export const sermonApiUrl = (id) => `${SERMON_INDEX_API}/sermons/${encodeURIComponent(id)}`
