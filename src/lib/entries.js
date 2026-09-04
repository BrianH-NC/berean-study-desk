import { supabase } from './supabase'

// Entry-numbering algorithm ported verbatim from digging-deep-notebook
// (index.html:1786-1831): a new entry takes the lowest whole number not
// currently in use, rather than always counting up — deleting an entry frees
// its number for reuse immediately. Manual collisions get a lettered suffix
// (125, 125a, 125b, ...) stored as a small decimal (125 + 0.001*n) so normal
// numeric sort/compare still works everywhere; only display formatting knows
// about the letters.
export function nextGapNumber(existingNumbers) {
  const taken = new Set(existingNumbers.map((n) => Math.floor(n)))
  let n = 1
  while (taken.has(n)) n++
  return n
}

export function nextSuffixedNumber(base, existingNumbers) {
  const taken = new Set(existingNumbers)
  for (let i = 1; i <= 26; i++) {
    const candidate = Math.round((base + i * 0.001) * 1000) / 1000
    if (!taken.has(candidate)) return candidate
  }
  return base + Math.random()
}

export function formatEntryNum(id) {
  if (typeof id !== 'number' || Number.isNaN(id)) return String(id)
  if (Number.isInteger(id)) return String(id)
  const base = Math.floor(id)
  const thousandths = Math.round((id - base) * 1000)
  if (thousandths >= 1 && thousandths <= 26 && Math.abs((id - base) * 1000 - thousandths) < 1e-6) {
    return base + String.fromCharCode(96 + thousandths)
  }
  return String(id)
}

// Lightweight scripture-book extraction for the Topics-by-scripture index —
// pulls the leading book name off a free-text reference like "Romans 8:28"
// or "1 Corinthians 13". Simplified from digging-deep-notebook's full
// canonical-order book list: groups alphabetically rather than in canon
// order, which is an intentional scope-cut for this pass.
export function bookNameForRef(ref) {
  if (!ref) return null
  const m = ref.trim().match(/^([1-3]?\s*[A-Za-z]+(?:\s+of\s+[A-Za-z]+)?)\.?\s*\d/)
  return m ? m[1].trim().replace(/\s+/g, ' ') : null
}

export async function listEntries(userId) {
  const { data, error } = await supabase.from('entries').select('*').eq('user_id', userId).order('number')
  if (error) throw new Error(error.message)
  return data || []
}

export async function getEntry(id) {
  const { data, error } = await supabase.from('entries').select('*').eq('id', id).single()
  if (error) return null
  return data
}

// "See also" (this entry -> others) and "Referenced by" (others -> this
// entry) — one row per link, direction stored once, both directions queried
// at display time. Mirrors the asymmetric-storage/symmetric-display pattern
// from digging-deep-notebook (index.html:2891-2904) as a proper join table.
export async function getLinksFor(entryId) {
  const [{ data: seeAlso }, { data: referencedBy }] = await Promise.all([
    supabase.from('entry_links').select('related_entry_id, entries:related_entry_id(id, number, title)').eq('entry_id', entryId),
    supabase.from('entry_links').select('entry_id, entries:entry_id(id, number, title)').eq('related_entry_id', entryId),
  ])
  return {
    seeAlso: (seeAlso || []).map((r) => r.entries).filter(Boolean),
    referencedBy: (referencedBy || []).map((r) => r.entries).filter(Boolean),
  }
}

export async function createEntry(userId, fields) {
  const { data: existing } = await supabase.from('entries').select('number').eq('user_id', userId)
  const number = nextGapNumber((existing || []).map((e) => e.number))
  const { data, error } = await supabase
    .from('entries')
    .insert({ user_id: userId, number, ...fields })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateEntry(id, values) {
  const { error } = await supabase.from('entries').update(values).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteEntry(id) {
  const { error } = await supabase.from('entries').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function setRelated(entryId, relatedIds) {
  await supabase.from('entry_links').delete().eq('entry_id', entryId)
  if (relatedIds.length === 0) return
  const { data: entry } = await supabase.from('entries').select('user_id').eq('id', entryId).single()
  const rows = relatedIds.map((relatedId) => ({ user_id: entry.user_id, entry_id: entryId, related_entry_id: relatedId }))
  const { error } = await supabase.from('entry_links').insert(rows)
  if (error) throw new Error(error.message)
}
