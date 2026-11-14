// Pure helpers for curated reading lists (e.g. the Akin Library): working out which
// entries a reader already owns or has on their wishlist, grouping them for browsing,
// and picking the recommendations for a Bible book. No React or Supabase in here so
// it can be unit-tested.

const STOP = new Set(['a', 'an', 'the', 'of', 'and', 'in', 'on', 'to', 'for', 'with', 'by', 'from', 'at'])
const SUFFIXES = new Set(['jr', 'sr', 'ii', 'iii', 'iv'])

const plain = (text) => String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
export const words = (text) => plain(text).replace(/&/g, ' and ').replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)
export const titleTokens = (title) => words(title).filter((w) => !STOP.has(w))
// The part of a title before its subtitle ("Knowing God: 20th Anniversary" -> "Knowing God").
const mainTitle = (title) => String(title || '').split(/[:(]/)[0]

// Last meaningful word of a name: "Victor P. Hamilton" -> "hamilton", "Beasley-Murray" -> "murray".
export function surnameKey(name) {
  const tokens = words(name).filter((t) => !SUFFIXES.has(t) && t.length > 1)
  return tokens.length ? tokens[tokens.length - 1] : ''
}

// Every surname that could belong to a library book's author string, in either
// "First Last" or "Last, First" order and for several authors.
export function authorSurnames(author) {
  const keys = new Set()
  for (const part of String(author || '').split(/;|&|\band\b|\by\b|,/i)) {
    const key = surnameKey(part)
    if (key) keys.add(key)
  }
  // "Hamilton, Victor P." also reads as the single surname before the comma.
  const inverted = String(author || '').match(/^([^,]+),\s*\S/)
  if (inverted) { const key = surnameKey(inverted[1]); if (key) keys.add(key) }
  return [...keys]
}

export function buildLibraryIndex(books = [], wishlist = []) {
  const index = new Map()
  const add = (kind, row) => {
    const tokens = titleTokens(row.title)
    const entry = { kind, row, tokens: new Set(tokens), full: tokens.join(' '), main: titleTokens(mainTitle(row.title)).join(' ') }
    for (const key of authorSurnames(row.author)) {
      if (!index.has(key)) index.set(key, [])
      index.get(key).push(entry)
    }
  }
  books.forEach((b) => add('book', b))
  wishlist.forEach((w) => add('wish', w))
  return index
}

function compare(item, candidate) {
  if (!item.tokens.size || !candidate.tokens.size) return null
  if (item.main && (item.main === candidate.main || item.full === candidate.full)) return 'exact'
  // "How God Became Jesus" vs "How God Became Jesus The Real Origins…": a multi-word title the other one starts with.
  if (item.main.includes(' ') && (candidate.full.startsWith(`${item.main} `) || candidate.main.startsWith(`${item.main} `))) return 'exact'
  if (candidate.main.includes(' ') && item.full.startsWith(`${candidate.main} `)) return 'exact'
  let shared = 0
  for (const t of item.tokens) if (candidate.tokens.has(t)) shared++
  const jaccard = shared / (item.tokens.size + candidate.tokens.size - shared)
  if (jaccard >= 0.8) return 'exact'
  if (jaccard >= 0.5 || (shared >= 1 && (shared === item.tokens.size || shared === candidate.tokens.size))) return 'maybe'
  return null
}

// status: 'owned' (in the library), 'wishlist', 'maybe' (a similar title by the same author is in the
// library, so worth a look) or 'none'. `book` is the library book behind owned / maybe.
export function matchItem(item, index) {
  const key = surnameKey(item.author_surname || item.author)
  const candidates = key ? index.get(key) || [] : []
  if (!candidates.length) return { status: 'none' }
  const tokens = titleTokens(item.title)
  const probe = { tokens: new Set(tokens), full: tokens.join(' '), main: titleTokens(mainTitle(item.title)).join(' ') }
  let owned = null, wish = null, maybe = null
  for (const candidate of candidates) {
    const result = compare(probe, candidate)
    if (!result) continue
    if (candidate.kind === 'book') { if (result === 'exact') owned = owned || candidate.row; else maybe = maybe || candidate.row }
    else if (result === 'exact') wish = wish || candidate.row
  }
  if (owned) return { status: 'owned', book: owned }
  if (wish) return { status: 'wishlist', wish }
  if (maybe) return { status: 'maybe', book: maybe }
  return { status: 'none' }
}

// The same book can be listed under several topics ("Hosea-Jonah" under each of the prophets),
// so counts of "works" collapse those.
export const workKey = (item) => `${surnameKey(item.author_surname || item.author)}|${titleTokens(item.title).join(' ')}|${item.series || ''}`

export function statusMap(items, index) {
  const cache = new Map()
  const result = new Map()
  for (const item of items) {
    const key = workKey(item)
    if (!cache.has(key)) cache.set(key, matchItem(item, index))
    result.set(item.id, cache.get(key))
  }
  return result
}

const tally = () => ({ works: 0, owned: 0, wishlist: 0, firstPicks: 0, firstPicksOwned: 0 })
function addWork(counts, item, status) {
  counts.works++
  if (status === 'owned') counts.owned++
  if (status === 'wishlist') counts.wishlist++
  if (item.is_first_pick) { counts.firstPicks++; if (status === 'owned') counts.firstPicksOwned++ }
}

// Counts per section plus overall, over distinct works.
export function summarize(items, statuses) {
  const total = tally()
  const sections = new Map()
  const seen = new Set()
  for (const item of items) {
    const key = workKey(item)
    const status = statuses.get(item.id)?.status || 'none'
    if (!sections.has(item.section)) sections.set(item.section, { name: item.section, ...tally(), seenKeys: new Set() })
    const section = sections.get(item.section)
    if (!section.seenKeys.has(key)) { section.seenKeys.add(key); addWork(section, item, status) }
    if (!seen.has(key)) { seen.add(key); addWork(total, item, status) }
  }
  return { total, sections: [...sections.values()].map(({ seenKeys, ...s }) => s) }
}

export function filterItems(items, filters, statuses) {
  const { q = '', level = '', firstOnly = false, status = '', section = '', book = '' } = filters
  const terms = words(q)
  return items.filter((item) => {
    if (section && item.section !== section) return false
    if (book && !(item.bible_books || []).includes(book)) return false
    if (firstOnly && !item.is_first_pick) return false
    if (level && !(item.levels || []).includes(level)) return false
    if (status) {
      const s = statuses.get(item.id)?.status || 'none'
      if (status === 'missing' ? (s === 'owned' || s === 'wishlist') : s !== status) return false
    }
    if (terms.length) {
      const hay = words([item.title, item.author, item.series, item.series_name, item.publisher, item.subsection, item.topic].filter(Boolean).join(' '))
      if (!terms.every((t) => hay.some((h) => h.startsWith(t)))) return false
    }
    return true
  })
}

// Items in list order, grouped under their subsection / topic heading.
export function groupItems(items) {
  const groups = []
  let current = null
  for (const item of items) {
    const heading = [item.section, item.subsection, item.topic].filter(Boolean)
    const key = heading.join(' › ')
    if (!current || current.key !== key) { current = { key, section: item.section, subsection: item.subsection, topic: item.topic, items: [] }; groups.push(current) }
    current.items.push(item)
  }
  return groups
}

const STATUS_ORDER = { none: 0, maybe: 1, wishlist: 2, owned: 3 }
// Recommendations for one Bible book: entries about that book (direct) and about a group it belongs to
// (the Pentateuch, the Minor Prophets). First picks come first, then the ones you don't have yet.
export function recommendedForBook(items, bibleBook, statuses) {
  const seen = new Set()
  const pick = (scope) => items
    .filter((item) => item.bible_scope === scope && (item.bible_books || []).includes(bibleBook))
    .filter((item) => { const key = workKey(item); if (seen.has(key)) return false; seen.add(key); return true })
    .sort((a, b) => (b.is_first_pick - a.is_first_pick)
      || (STATUS_ORDER[statuses.get(a.id)?.status || 'none'] - STATUS_ORDER[statuses.get(b.id)?.status || 'none'])
      || (b.pub_year || 0) - (a.pub_year || 0) || a.title.localeCompare(b.title))
  return { direct: pick('book'), group: pick('group') }
}

export const levelLabel = (code, legend = {}) => legend[String(code).toUpperCase()]?.label || code
export const citation = (item) => [item.publisher, item.pub_year].filter(Boolean).join(', ')
