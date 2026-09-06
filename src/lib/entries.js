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

// Full 66-book Protestant canon, OT then NT, in canonical order.
export const CANONICAL_BOOKS = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth',
  '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah',
  'Esther', 'Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah',
  'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah',
  'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
  'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians',
  'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians',
  '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter',
  '1 John', '2 John', '3 John', 'Jude', 'Revelation',
]

// Common name/abbreviation variants -> canonical name, so "Rom", "Ps", "Song
// of Songs" etc. all group under the same canonical book.
const BOOK_ALIASES = {
  gen: 'Genesis', ge: 'Genesis', exo: 'Exodus', ex: 'Exodus', lev: 'Leviticus', le: 'Leviticus',
  num: 'Numbers', nu: 'Numbers', deut: 'Deuteronomy', deu: 'Deuteronomy', dt: 'Deuteronomy',
  josh: 'Joshua', jos: 'Joshua', judg: 'Judges', jdg: 'Judges', ru: 'Ruth',
  '1sam': '1 Samuel', '1sa': '1 Samuel', '2sam': '2 Samuel', '2sa': '2 Samuel',
  '1kgs': '1 Kings', '1ki': '1 Kings', '2kgs': '2 Kings', '2ki': '2 Kings',
  '1chr': '1 Chronicles', '1ch': '1 Chronicles', '2chr': '2 Chronicles', '2ch': '2 Chronicles',
  ezr: 'Ezra', neh: 'Nehemiah', est: 'Esther', jb: 'Job',
  ps: 'Psalms', psa: 'Psalms', psalm: 'Psalms', prov: 'Proverbs', pr: 'Proverbs',
  eccl: 'Ecclesiastes', ecc: 'Ecclesiastes', qoheleth: 'Ecclesiastes',
  song: 'Song of Solomon', sos: 'Song of Solomon', 'songofsongs': 'Song of Solomon', canticles: 'Song of Solomon',
  isa: 'Isaiah', jer: 'Jeremiah', lam: 'Lamentations', ezek: 'Ezekiel', eze: 'Ezekiel',
  dan: 'Daniel', hos: 'Hosea', jl: 'Joel', am: 'Amos', obad: 'Obadiah', ob: 'Obadiah',
  jon: 'Jonah', mic: 'Micah', nah: 'Nahum', hab: 'Habakkuk', zeph: 'Zephaniah', zep: 'Zephaniah',
  hag: 'Haggai', zech: 'Zechariah', zec: 'Zechariah', mal: 'Malachi',
  matt: 'Matthew', mt: 'Matthew', mk: 'Mark', mrk: 'Mark', lk: 'Luke', luk: 'Luke',
  jn: 'John', joh: 'John', act: 'Acts', ac: 'Acts', rom: 'Romans', ro: 'Romans',
  '1cor': '1 Corinthians', '1co': '1 Corinthians', '2cor': '2 Corinthians', '2co': '2 Corinthians',
  gal: 'Galatians', eph: 'Ephesians', phil: 'Philippians', php: 'Philippians',
  col: 'Colossians', '1thess': '1 Thessalonians', '1th': '1 Thessalonians',
  '2thess': '2 Thessalonians', '2th': '2 Thessalonians', '1tim': '1 Timothy', '1ti': '1 Timothy',
  '2tim': '2 Timothy', '2ti': '2 Timothy', tit: 'Titus', phlm: 'Philemon', phm: 'Philemon',
  heb: 'Hebrews', jas: 'James', jam: 'James', '1pet': '1 Peter', '1pe': '1 Peter',
  '2pet': '2 Peter', '2pe': '2 Peter', '1jn': '1 John', '1jo': '1 John',
  '2jn': '2 John', '2jo': '2 John', '3jn': '3 John', '3jo': '3 John', jud: 'Jude',
  rev: 'Revelation', re: 'Revelation', apoc: 'Revelation',
}
CANONICAL_BOOKS.forEach((b) => {
  BOOK_ALIASES[b.toLowerCase().replace(/[^a-z0-9]/g, '')] = b
})

// Extracts the leading book name off a free-text reference like "Romans
// 8:28", "1 Cor 13", or "Song of Solomon 2:1", and normalizes it to its
// canonical form so variant spellings/abbreviations group together.
export function bookNameForRef(ref) {
  if (!ref) return null
  const m = ref.trim().match(/^([1-3]?\s*[A-Za-z]+(?:\s+of\s+[A-Za-z]+)?)\.?\s*\d/)
  if (!m) return null
  const key = m[1].toLowerCase().replace(/[^a-z0-9]/g, '')
  return BOOK_ALIASES[key] || m[1].trim().replace(/\s+/g, ' ')
}

// Resolves a bare book name/abbreviation (no chapter attached) to its
// canonical form, or null if it isn't recognized. Shares BOOK_ALIASES with
// bookNameForRef above rather than duplicating the alias table -- used by
// the Bible Study tab's reference parser (src/lib/bsb.js).
export function resolveBookName(input) {
  if (!input) return null
  const key = input.toLowerCase().replace(/[^a-z0-9]/g, '')
  return BOOK_ALIASES[key] || null
}

// Alias keys excluded from bookNamePatterns below -- real book abbreviations
// (Amos, Obadiah, Revelation, Exodus, Acts, Ruth, Deuteronomy, Numbers,
// Leviticus, Genesis, Proverbs, Joel, Job) that are also ordinary short
// English words or word fragments, too risky to auto-detect in arbitrary
// prose even though they're fine for a dedicated reference-search box where
// the user is deliberately typing a reference. Longer or digit-prefixed
// aliases ("jn", "ps", "1cor") aren't real words and stay in.
const TAGGER_EXCLUDED_ALIASES = new Set(['am', 'ob', 're', 'ex', 'ac', 'ru', 'dt', 'nu', 'le', 'ge', 'pr', 'jl', 'jb'])

// Regex source fragments for spotting a real book name inline in free-flowing
// prose (used by scriptureTagger.js to auto-link references in Notebook
// entries) -- built from the same alias table as everything else here rather
// than a second hand-maintained list.
let _bookNamePatterns = null
export function bookNamePatterns() {
  if (_bookNamePatterns) return _bookNamePatterns
  const entries = []
  for (const [key, canonical] of Object.entries(BOOK_ALIASES)) {
    if (TAGGER_EXCLUDED_ALIASES.has(key)) continue
    const m = key.match(/^([123])(.+)$/)
    const pattern = m ? `${m[1]}\\s?${m[2]}` : key
    entries.push({ pattern, canonical, length: key.length })
  }
  // Alias keys have all punctuation/spacing stripped, so multi-word
  // canonical names ("Song of Solomon") only exist there as one run-together
  // token that won't match real spaced text -- add the properly spaced form
  // directly from CANONICAL_BOOKS too.
  CANONICAL_BOOKS.forEach((name) => {
    const pattern = name.replace(/^([123]) /, '$1\\s?').replace(/\s+/g, '\\s+')
    entries.push({ pattern, canonical: name, length: name.length })
  })
  // Longest first, so e.g. "Song of Solomon" or "Psalms" is tried before a
  // shorter overlapping alias further down the alternation could shadow it.
  entries.sort((a, b) => b.length - a.length)
  _bookNamePatterns = entries
  return _bookNamePatterns
}

export function canonicalIndex(bookName) {
  const i = CANONICAL_BOOKS.indexOf(bookName)
  return i === -1 ? 999 : i
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

// Notes taken during a focused reading session on a specific shelf book
// (entries.shelf_book_id), newest first.
export async function listEntriesForBook(userId, bookId) {
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .eq('user_id', userId)
    .eq('shelf_book_id', bookId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data || []
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
