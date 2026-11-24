// D-Group sessions: one per week, two guides each (the men's discussion guide and the leader guide),
// drafted as structured JSON by the dgroup-generate Edge Function, reviewed section by section, printed to PDF.
export const DGROUP_DOCS = [
  { id: 'discussion', title: 'Discussion guide', sub: 'For the men · about 5 pages' },
  { id: 'leader', title: 'Leader guide', sub: 'For you · with cut-out cards' },
]

// The leader guide's parts, in print order. Each can be edited or redrafted on its own.
export const LEADER_PARTS = [
  { key: 'overview', title: 'The aim for Friday' },
  { key: 'timing', title: 'Timing' },
  { key: 'running_short', title: 'Running short?' },
  { key: 'before_friday', title: 'Before Friday' },
  { key: 'background', title: 'Background' },
  { key: 'answers', title: 'Answer key' },
  { key: 'facilitation', title: 'Section by section' },
  { key: 'guardrails', title: 'Guardrails' },
  { key: 'sermon_flags', title: 'Sermon notes to handle gently' },
  { key: 'cards', title: 'Scenario cards' },
]

// The exercise types the generator can choose from. New types go here and in Exercise.jsx.
export const EXERCISE_TYPES = ['rating', 'dial', 'spectrum', 'table', 'checklist', 'match', 'nametags', 'booths', 'road', 'putoff', 'chain', 'circles', 'write']

export function docStatus(session, docId, now = Date.now()) {
  const started = session?.generating?.[docId]
  if (started && now - Date.parse(started) < 300000) return 'generating'
  const doc = session?.docs?.[docId]
  if (!doc?.data) return 'empty'
  return doc.status === 'ready' ? 'ready' : 'draft'
}

export const STATUS_LABELS = { empty: 'Not started', generating: 'Generating…', draft: 'Draft', ready: 'Ready' }

// The Friday on or after a date (the group meets Fridays).
export function nextFriday(day) {
  const date = new Date(`${day}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + ((5 - date.getUTCDay() + 7) % 7))
  return date.toISOString().slice(0, 10)
}

// Every exercise in a discussion guide, wherever it sits.
export function guideExercises(data) {
  const out = []
  for (const s of data?.sections || []) {
    if (s.kind === 'interpret') for (const m of s.movements || []) if (m?.exercise) out.push(m.exercise)
    if (Array.isArray(s.exercises)) out.push(...s.exercises.filter(Boolean))
  }
  return out
}

// Distinct known exercise types used, so the review screen can show the mix at a glance.
export function exerciseMix(data) {
  return [...new Set(guideExercises(data).map(e => e?.type).filter(t => EXERCISE_TYPES.includes(t)))]
}

// Minutes covered by a timing table such as [{minutes:'0-5'},{minutes:'5-15'}].
export function timingTotal(rows = []) {
  return rows.reduce((sum, r) => {
    const m = String(r?.minutes || '').match(/(\d+)\s*[–-]\s*(\d+)/)
    return m ? sum + Math.max(0, Number(m[2]) - Number(m[1])) : sum
  }, 0)
}

// A readable label for a field key in the generic editor: "running_short" -> "Running short".
export function fieldLabel(key) {
  const s = String(key).replace(/_/g, ' ')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// A passage for display. Older sessions stored the sermon's parsed reference
// object, sometimes as a JSON string; turn either into "1 Peter 2:15–17".
export function passageLabel(p) {
  let v = p
  if (typeof v === 'string' && v.trim().startsWith('{')) { try { v = JSON.parse(v) } catch { return v } }
  if (!v) return ''
  if (typeof v === 'string') return v
  if (typeof v !== 'object' || !v.book) return ''
  const verses = v.verseStart ? `:${v.verseStart}${v.verseEnd && v.verseEnd !== v.verseStart ? `–${v.verseEnd}` : ''}` : ''
  return `${v.book}${v.chapter ? ` ${v.chapter}${verses}` : ''}`
}
