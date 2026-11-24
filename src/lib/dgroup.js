// D-Group sessions: one per week, five documents each, drafted by the dgroup-generate Edge Function.
export const DGROUP_DOCS = [
  { id: 'exegetical', title: 'Exegetical study guide', sub: 'Your personal study' },
  { id: 'booklet', title: 'Inductive booklet', sub: 'Landscape, two columns, ESV' },
  { id: 'prep', title: '4-day prep guide', sub: 'Monday to Thursday' },
  { id: 'script', title: 'Facilitator script', sub: 'Leader only' },
  { id: 'text', title: 'Group text', sub: 'Casual reminder' },
]

export function docStatus(session, docId, now = Date.now()) {
  const started = session?.generating?.[docId]
  if (started && now - Date.parse(started) < 300000) return 'generating'
  const doc = session?.docs?.[docId]
  if (!doc?.markdown) return 'empty'
  return doc.status === 'ready' ? 'ready' : 'draft'
}

export const STATUS_LABELS = { empty: 'Not started', generating: 'Generating…', draft: 'Draft', ready: 'Ready' }

// The Friday on or after a date (the group meets Fridays).
export function nextFriday(day) {
  const date = new Date(`${day}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + ((5 - date.getUTCDay() + 7) % 7))
  return date.toISOString().slice(0, 10)
}

// Split the booklet's Markdown into passage sections ("## 1 Peter 2:11-12") and the rest.
export function bookletSections(markdown = '') {
  const sections = []
  let current = { ref: null, body: [] }
  for (const line of String(markdown).split('\n')) {
    const m = line.match(/^##\s+(.+?)\s*$/)
    if (m) {
      if (current.ref || current.body.some(l => l.trim())) sections.push(current)
      const ref = m[1].trim()
      current = { ref: /\d+:\d+/.test(ref) ? ref : null, heading: ref, body: [] }
    } else current.body.push(line)
  }
  if (current.ref || current.body.some(l => l.trim())) sections.push(current)
  return sections.map(s => ({ ref: s.ref, heading: s.heading || null, markdown: s.body.join('\n').trim() }))
}
