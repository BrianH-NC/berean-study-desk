// Pure helpers for the commentary comparison view.
//
// A commentary chapter (Free Use Bible API) is a list of blocks
// { number, content: [paragraph, ...] }. A block starts at verse `number` and covers
// everything up to the next block. Granularity varies a lot: for John 3, Gill and
// Barnes write on every verse, Calvin on runs of five or six, Matthew Henry on whole
// sections (verses 1-21 and 22-36).

export const MAX_COMPARED = 4
export const MIN_COMPARED = 2
// Offered first when nothing has been chosen: commentaries that write on each verse, which
// compare well side by side. Henry and Calvin write on whole sections (John 3:16 gets a
// 6,000-word note on verses 1-21), so they come after, one click away.
const PREFERRED_ORDER = ['john-gill', 'jamieson-fausset-brown', 'adam-clarke', 'barnes', 'john-calvin', 'matthew-henry']

// [{ from, to, text }] -- `to` is null for the last block, which runs to the chapter's end.
export function blockSpans(content) {
  const blocks = (content || []).filter((b) => Number.isFinite(b?.number))
  return blocks.map((block, i) => {
    const next = blocks[i + 1]?.number
    return {
      from: block.number,
      to: next == null ? null : Math.max(block.number, next - 1),
      text: (block.content || []).filter((p) => typeof p === 'string' && p.trim()).join('\n\n').trim(),
    }
  }).filter((span) => span.text)
}

// The distinct blocks that cover any of the given verses, in chapter order.
export function spansForVerses(content, verses) {
  const wanted = (verses || []).filter(Number.isFinite)
  return blockSpans(content).filter((span) => wanted.some((v) => v >= span.from && (span.to == null || v <= span.to)))
}

// The wanted verses that none of the spans cover -- a commentary can skip a verse (the
// Jamieson-Fausset-Brown notes on Genesis 1 begin at verse 2).
export function uncoveredVerses(spans, verses) {
  return [...new Set((verses || []).filter(Number.isFinite))].sort((a, b) => a - b)
    .filter((v) => !spans.some((span) => v >= span.from && (span.to == null || v <= span.to)))
}

// "Verse 16", "Verses 13–18", "Verses 22–end".
export function spanLabel(span) {
  if (span.to === span.from) return `Verse ${span.from}`
  return `Verses ${span.from}–${span.to == null ? 'end' : span.to}`
}

// The selected verses as a person would say them: "16", "13–18" or "14, 16, 20–21".
export function verseSummary(verses) {
  const sorted = [...new Set((verses || []).filter(Number.isFinite))].sort((a, b) => a - b)
  const runs = []
  for (const v of sorted) {
    const last = runs[runs.length - 1]
    if (last && v === last[1] + 1) last[1] = v
    else runs.push([v, v])
  }
  return runs.map(([a, b]) => (a === b ? String(a) : `${a}–${b}`)).join(', ')
}

// Paragraphs of a note, for display.
export function paragraphs(text) {
  return text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
}

// Which commentaries to compare: the saved choice limited to those that exist for this
// book, topped up from the preferred order to at least MIN_COMPARED (three if it can),
// never more than MAX_COMPARED. `available` is the ids offered for the book, in display order.
export function chooseCompared(available, saved = []) {
  const chosen = saved.filter((id, i) => available.includes(id) && saved.indexOf(id) === i).slice(0, MAX_COMPARED)
  if (chosen.length >= MIN_COMPARED) return chosen
  const fill = [...PREFERRED_ORDER, ...available].filter((id, i, all) => available.includes(id) && all.indexOf(id) === i && !chosen.includes(id))
  return [...chosen, ...fill].slice(0, Math.min(3, available.length))
}

// Toggling a commentary on or off, honouring the maximum.
export function toggleCompared(chosen, id, available) {
  if (chosen.includes(id)) return chosen.length > 1 ? chosen.filter((c) => c !== id) : chosen
  if (chosen.length >= MAX_COMPARED) return chosen
  return available.filter((a) => a === id || chosen.includes(a))   // keep the display order
}
