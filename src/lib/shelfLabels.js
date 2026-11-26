// Physical shelf labels: the taxonomy, label text, filing names, shelf order
// and the classification seed review. Pure functions, no I/O.
//
// Books store stable keys (shelf_category, shelf_subcategory) plus a filing
// name (shelf_author). Codes and captions live only here, so a caption can
// change without relabeling anything. Ranks follow the approved shelf plan.
import { extractSortLastName } from './authorSort.js'
import { normalizeISBN } from './isbn.js'

const sub = (key, code, name) => ({ key, code, name })

// Full Protestant canon in canonical order, for commentaries and book studies.
const CANON = [
  ['gen', 'GEN', 'Genesis'], ['exod', 'EXOD', 'Exodus'], ['lev', 'LEV', 'Leviticus'], ['num', 'NUM', 'Numbers'], ['deut', 'DEUT', 'Deuteronomy'],
  ['josh', 'JOSH', 'Joshua'], ['judg', 'JUDG', 'Judges'], ['ruth', 'RUTH', 'Ruth'], ['1sam', '1 SAM', '1 Samuel'], ['2sam', '2 SAM', '2 Samuel'],
  ['1kgs', '1 KGS', '1 Kings'], ['2kgs', '2 KGS', '2 Kings'], ['1chr', '1 CHR', '1 Chronicles'], ['2chr', '2 CHR', '2 Chronicles'], ['ezra', 'EZRA', 'Ezra'],
  ['neh', 'NEH', 'Nehemiah'], ['esth', 'ESTH', 'Esther'], ['job', 'JOB', 'Job'], ['ps', 'PS', 'Psalms'], ['prov', 'PROV', 'Proverbs'],
  ['eccl', 'ECCL', 'Ecclesiastes'], ['song', 'SONG', 'Song of Solomon'], ['isa', 'ISA', 'Isaiah'], ['jer', 'JER', 'Jeremiah'], ['lam', 'LAM', 'Lamentations'],
  ['ezek', 'EZEK', 'Ezekiel'], ['dan', 'DAN', 'Daniel'], ['hos', 'HOS', 'Hosea'], ['joel', 'JOEL', 'Joel'], ['amos', 'AMOS', 'Amos'],
  ['obad', 'OBAD', 'Obadiah'], ['jonah', 'JONAH', 'Jonah'], ['mic', 'MIC', 'Micah'], ['nah', 'NAH', 'Nahum'], ['hab', 'HAB', 'Habakkuk'],
  ['zeph', 'ZEPH', 'Zephaniah'], ['hag', 'HAG', 'Haggai'], ['zech', 'ZECH', 'Zechariah'], ['mal', 'MAL', 'Malachi'],
  ['matt', 'MATT', 'Matthew'], ['mark', 'MARK', 'Mark'], ['luke', 'LUKE', 'Luke'], ['john', 'JOHN', 'John'], ['acts', 'ACTS', 'Acts'],
  ['rom', 'ROM', 'Romans'], ['1cor', '1 COR', '1 Corinthians'], ['2cor', '2 COR', '2 Corinthians'], ['gal', 'GAL', 'Galatians'], ['eph', 'EPH', 'Ephesians'],
  ['phil', 'PHIL', 'Philippians'], ['col', 'COL', 'Colossians'], ['1thess', '1 THESS', '1 Thessalonians'], ['2thess', '2 THESS', '2 Thessalonians'],
  ['1tim', '1 TIM', '1 Timothy'], ['2tim', '2 TIM', '2 Timothy'], ['titus', 'TITUS', 'Titus'], ['phlm', 'PHLM', 'Philemon'], ['heb', 'HEB', 'Hebrews'],
  ['jas', 'JAS', 'James'], ['1pet', '1 PET', '1 Peter'], ['2pet', '2 PET', '2 Peter'], ['1john', '1 JOHN', '1 John'], ['2john', '2 JOHN', '2 John'],
  ['3john', '3 JOHN', '3 John'], ['jude', 'JUDE', 'Jude'], ['rev', 'REV', 'Revelation'],
]
// Combined and period groups, each placed right after the book it is anchored to.
const COMM_GROUPS = [
  ['nah', sub('nah_zeph', 'NAH–ZEPH', 'Nahum–Zephaniah')],
  ['mal', sub('postexilic', 'POSTEXILIC', 'Postexilic Prophets')],
  ['1cor', sub('cor', 'COR', 'Corinthians')],
  ['phil', sub('phil_phlm', 'PHIL–PHLM', 'Philippians–Philemon')],
]
const commentarySubs = CANON.flatMap(([key, code, name]) => [sub(key, code, name), ...COMM_GROUPS.filter(([anchor]) => anchor === key).map(([, g]) => g)])

export const SHELF_TAXONOMY = [
  { key: 'bible', code: 'BIBLE', name: 'Bibles & translations', subs: [sub('kjv', 'KJV', 'King James Version'), sub('csb', 'CSB', 'Christian Standard Bible'), sub('phillips', 'PHILLIPS', 'J. B. Phillips New Testament'), sub('esv', 'ESV', 'English Standard Version'), sub('nasb', 'NASB', 'New American Standard Bible'), sub('nkjv', 'NKJV', 'New King James Version'), sub('niv', 'NIV', 'New International Version'), sub('nlt', 'NLT', 'New Living Translation')] },
  { key: 'ref', code: 'REF', name: 'Bible study methods & reference', subs: [sub('method', 'METHOD', 'Study methods & overviews'), sub('geog', 'GEOG', 'Geography & reference'), sub('bible_q', 'BIBLE Q', 'Bible difficulties & questions')] },
  { key: 'comm', code: 'COMM', name: 'Commentaries & Bible-book studies', subs: commentarySubs },
  { key: 'bib', code: 'BIB', name: 'Biblical studies, manuscripts & languages', subs: [sub('context', 'CONTEXT', 'Context & ancient sources'), sub('lang', 'LANG', 'Greek & Hebrew'), sub('text_crit', 'TEXT CRIT', 'Textual criticism & translation')] },
  { key: 'doct', code: 'DOCT', name: 'Doctrine & confessions', subs: [sub('god_christ', 'GOD & CHRIST', 'God & Christ'), sub('salvation', 'SALVATION', 'Salvation, Reformed theology & confessions'), sub('last_things', 'LAST THINGS', 'Heaven, prophecy & spiritual warfare')] },
  { key: 'church', code: 'CHURCH', name: 'Church, ordinances & worship', subs: [sub('ordinances', 'ORDINANCES', 'Baptism & Lord’s Supper'), sub('church_life', 'CHURCH LIFE', 'Church life & worship')] },
  { key: 'apol', code: 'APOL', name: 'Apologetics, evangelism & world religions', subs: [sub('general', 'GENERAL', 'General apologetics'), sub('evidence', 'EVIDENCE', 'Bible reliability & historical Jesus'), sub('outreach', 'OUTREACH', 'Evangelism & world religions')] },
  { key: 'sci', code: 'SCI', name: 'Creation, evolution & science', subs: [sub('creation', 'CREATION', 'Creation, origins & science'), sub('evolution', 'EVOLUTION', 'Evolution & scientific perspectives')] },
  { key: 'hist', code: 'HIST', name: 'Church history, biography & missions', subs: [sub('history', 'HISTORY', 'Church history & biography'), sub('missions', 'MISSIONS', 'Missions & persecution')] },
  { key: 'life', code: 'LIFE', name: 'Christian living, discipleship & family', subs: [sub('growth', 'GROWTH', 'Discipleship & spiritual growth'), sub('family', 'FAMILY', 'Men, marriage & family'), sub('ethics', 'ETHICS', 'Ethics & culture')] },
  { key: 'dev', code: 'DEV', name: 'Prayer, devotionals & sermons', subs: [sub('devotion', 'DEVOTION', 'Prayer, meditation & devotionals'), sub('sermons', 'SERMONS', 'Sermons')] },
  { key: 'lit', code: 'LIT', name: 'Christian fiction & collected works', subs: [sub('fiction', 'FICTION', 'Fiction'), sub('collected', 'COLLECTED', 'Collected works')] },
]

const CATEGORY = new Map(SHELF_TAXONOMY.map((c, rank) => [c.key, { ...c, rank, subIndex: new Map(c.subs.map((s, r) => [s.key, { ...s, rank: r }])) }]))

export function shelfCategory(key) { return CATEGORY.get(key) || null }
export function shelfSubcategory(categoryKey, subKey) { return CATEGORY.get(categoryKey)?.subIndex.get(subKey) || null }
export function isValidShelfPair(categoryKey, subKey) { return Boolean(shelfSubcategory(categoryKey, subKey)) }

// Resolve printed codes (as in the seed file) to keys.
export function keysFromCodes(categoryCode, subCode) {
  const norm = v => String(v || '').trim().replace(/-/g, '–').toUpperCase()
  const cat = SHELF_TAXONOMY.find(c => c.code === norm(categoryCode))
  const s = cat?.subs.find(x => x.code === norm(subCode))
  return cat && s ? { category: cat.key, subcategory: s.key } : null
}

// Filing name: trimmed, whitespace collapsed, one line, uppercase for display.
export function normalizeFilingName(value) { return String(value ?? '').replace(/\s+/g, ' ').trim().toUpperCase() }

export function hasShelfLabel(book) { return Boolean(book?.shelf_category && book?.shelf_subcategory && book?.shelf_author) }

// The three printed lines for a book, or null when it has no valid label.
export function shelfLabelLines(book) {
  if (!hasShelfLabel(book)) return null
  const cat = shelfCategory(book.shelf_category), s = shelfSubcategory(book.shelf_category, book.shelf_subcategory)
  if (!cat || !s) return null
  return [cat.code, s.code, normalizeFilingName(book.shelf_author)]
}
export function shelfLabelText(book) { return shelfLabelLines(book)?.join(' / ') || '' }

// Validates a label before save. Returns the values to write, or throws.
export function shelfLabelValues({ category, subcategory, author }) {
  if (!category && !subcategory && !String(author || '').trim()) return { shelf_category: null, shelf_subcategory: null, shelf_author: null }
  if (!shelfCategory(category)) throw new Error('Choose a main category.')
  if (!isValidShelfPair(category, subcategory)) throw new Error(`Choose a subcategory under ${shelfCategory(category).code}.`)
  const name = normalizeFilingName(author)
  if (!name) throw new Error('Enter the author filing name.')
  if (name.length > 60) throw new Error('Keep the filing name under 60 characters.')
  return { shelf_category: category, shelf_subcategory: subcategory, shelf_author: name }
}

// Organizations filed under a short name.
const ORG_FILING = new Map([['answers in genesis', 'AIG'], ['aig', 'AIG'], ['new scientist', 'NEW SCIENTIST'], ['westminster assembly', 'WESTMINSTER ASSEMBLY']])
const HONORIFICS = /^(dr\.?|rev\.?|pastor|prof\.?|sir|brother|sister|fr\.?)\s+/i

// A conservative surname suggestion from the catalog author credit. The first
// credited author is used; the owner can always edit it.
export function suggestFilingName(author) {
  const first = String(author || '').split(/\s*[|;]\s*|\s+&\s+|\s+and\s+/i).map(s => s.trim()).find(s => s && s !== '—') || ''
  if (!first) return ''
  const org = ORG_FILING.get(first.toLowerCase())
  if (org) return org
  if (first.includes(',')) return normalizeFilingName(first.split(',')[0])
  const clean = first.replace(HONORIFICS, '')
  const words = clean.split(/\s+/)
  while (words.length > 1 && /^(jr|junior|sr|senior|ii|iii|iv|v|phd|md|esq)$/i.test(words[words.length - 1].replace(/[.,]/g, ''))) words.pop()
  // Keep the original spelling of the surname tokens (accents, apostrophes, hyphens).
  const last = extractSortLastName(clean)
  const n = last ? last.split(' ').length : 1
  return normalizeFilingName(words.slice(-n).join(' ').replace(/[.,]+$/, ''))
}

const ARTICLES = /^(the|a|an)\s+/i
const sortTitle = b => String(b.title || '').replace(ARTICLES, '').trim()
const volumeOf = b => { const m = /\b(?:vol(?:ume)?\.?|book|part)\s*(\d+)/i.exec(b.title || ''); return m ? Number(m[1]) : null }

// Physical shelf order: category, subcategory, filing name, title, volume,
// year, then id. Unlabeled books go last, in title order.
export function compareShelfOrder(a, b) {
  const la = hasShelfLabel(a), lb = hasShelfLabel(b)
  if (la !== lb) return la ? -1 : 1
  if (la) {
    const ca = shelfCategory(a.shelf_category)?.rank ?? 999, cb = shelfCategory(b.shelf_category)?.rank ?? 999
    if (ca !== cb) return ca - cb
    const sa = shelfSubcategory(a.shelf_category, a.shelf_subcategory)?.rank ?? 999, sb = shelfSubcategory(b.shelf_category, b.shelf_subcategory)?.rank ?? 999
    if (sa !== sb) return sa - sb
    const fa = normalizeFilingName(a.shelf_author).localeCompare(normalizeFilingName(b.shelf_author), undefined, { sensitivity: 'base' })
    if (fa) return fa
  }
  const t = sortTitle(a).replace(/\s*\b(?:vol(?:ume)?\.?|book|part)\s*\d+.*$/i, '').localeCompare(sortTitle(b).replace(/\s*\b(?:vol(?:ume)?\.?|book|part)\s*\d+.*$/i, ''), undefined, { sensitivity: 'base', numeric: true })
  if (t) return t
  const va = volumeOf(a), vb = volumeOf(b)
  if (va !== vb) return (va ?? -1) - (vb ?? -1)
  const full = sortTitle(a).localeCompare(sortTitle(b), undefined, { sensitivity: 'base', numeric: true })
  if (full) return full
  const ya = parseInt(a.pub_date, 10) || 0, yb = parseInt(b.pub_date, 10) || 0
  if (ya !== yb) return ya - yb
  return String(a.id).localeCompare(String(b.id))
}
export function sortShelfOrder(books) { return [...books].sort(compareShelfOrder) }

// ISBN-10 and ISBN-13 for the same book compare equal.
export function canonicalISBN(value) {
  const isbn = normalizeISBN(value).replace(/[^0-9X]/g, '')
  if (/^97[89]\d{10}$/.test(isbn)) return isbn
  if (/^\d{9}[\dX]$/.test(isbn)) {
    const core = '978' + isbn.slice(0, 9)
    const check = (10 - ([...core].reduce((s, d, i) => s + Number(d) * (i % 2 ? 3 : 1), 0) % 10)) % 10
    return core + check
  }
  return isbn
}

export const SEED_HEADER = ['isbn', 'category', 'subcategory', 'filing_author', 'title', 'catalog_author']

// Parses the classification seed (tab-separated, header row first).
export function parseShelfSeed(text) {
  const lines = String(text || '').replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim())
  if (!lines.length) return { rows: [], error: 'The file is empty.' }
  const header = lines[0].split('\t').map(h => h.trim().toLowerCase())
  const missing = SEED_HEADER.slice(0, 4).filter(h => !header.includes(h))
  if (missing.length) return { rows: [], error: `The header is missing ${missing.join(', ')}. Expected columns: ${SEED_HEADER.join(', ')}.` }
  const col = name => header.indexOf(name)
  const rows = lines.slice(1).map((line, i) => {
    const cells = line.split('\t')
    const get = name => col(name) >= 0 ? (cells[col(name)] ?? '').trim() : ''
    const row = { line: i + 2, isbn: get('isbn'), categoryCode: get('category'), subCode: get('subcategory'), author: normalizeFilingName(get('filing_author')), title: get('title'), catalogAuthor: get('catalog_author') }
    const keys = keysFromCodes(row.categoryCode, row.subCode)
    const problems = []
    if (!canonicalISBN(row.isbn)) problems.push('no ISBN')
    if (!keys) problems.push(`unknown category/subcategory ${row.categoryCode} / ${row.subCode}`)
    if (!row.author) problems.push('no filing name')
    return { ...row, key: canonicalISBN(row.isbn), label: keys ? { ...keys, author: row.author } : null, problem: problems.join('; ') }
  })
  return { rows, error: '' }
}

export const SEED_STATUSES = [
  ['ready', 'Ready to assign'], ['same', 'Already labeled the same'], ['differs', 'Has a different label'],
  ['ambiguous', 'More than one copy'], ['nomatch', 'Not in your Library'], ['invalid', 'Problem in the file'],
]

// Dry run against the owner's books: ISBN is the only automatic match key.
export function planShelfSeed(rows, books) {
  const byIsbn = new Map()
  for (const b of books) { const k = canonicalISBN(b.isbn); if (k) byIsbn.set(k, [...(byIsbn.get(k) || []), b]) }
  return rows.map(row => {
    if (row.problem) return { row, status: 'invalid', books: [] }
    const matches = byIsbn.get(row.key) || []
    if (!matches.length) return { row, status: 'nomatch', books: [] }
    if (matches.length > 1) return { row, status: 'ambiguous', books: matches }
    const book = matches[0]
    if (!hasShelfLabel(book)) return { row, status: 'ready', books: matches }
    const same = book.shelf_category === row.label.category && book.shelf_subcategory === row.label.subcategory && normalizeFilingName(book.shelf_author) === row.label.author
    return { row, status: same ? 'same' : 'differs', books: matches }
  })
}
