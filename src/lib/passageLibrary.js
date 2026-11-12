// Finds library books about the Bible book being read, and Doctrine Checks
// that cite a passage. Kept free of React/Supabase so it can be unit-tested.
import { findReferences } from './scriptureTagger.js'
import { overlaps } from './dailyStudyModel.js'

const NUMBER_FORMS = { 1: ['1', 'I', 'First'], 2: ['2', 'II', 'Second'], 3: ['3', 'III', 'Third'] }
const EXTRA_NAMES = { Psalms: ['Psalm'], 'Song of Solomon': ['Song of Songs', 'Canticles'] }
// Book names that are also common words or people's names ("John Calvin",
// "Revelation Through Science") only count in a title when context says the
// title is about the Bible book.
const AMBIGUOUS = new Set(['Numbers', 'Judges', 'Ruth', 'Kings', 'Esther', 'Job', 'Daniel', 'Joel', 'Amos', 'Jonah', 'Micah', 'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Timothy', 'Titus', 'Peter', 'James', 'Jude', 'Revelation', 'Samuel', 'Chronicles', 'Joshua', 'Ezra'])
// A title starting "John Calvin…" or "Revelation Through…" is not about the book.
const NOT_AFTER = ['calvin', 'piper', 'macarthur', 'owen', 'bunyan', 'wesley', 'newton', 'stott', 'knox', 'murray', 'frame', 'gill', 'edwards', 'flavel', 'sproul', 'chrysostom', 'through', 'and']
const GOSPELS = new Set(['Matthew', 'Mark', 'Luke', 'John'])
const OT_LAST = 'Malachi'
const GENERAL_SUBJECTS = ['commentaries', 'commentary', 'biblical commentary', 'bible commentary', 'bible commentaries']

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')
const ordinal = '(?:[123]|I{1,3}|First|Second|Third)\\s+'

function nameForms(bibleBook) {
  const m = bibleBook.match(/^([123]) (.+)$/)
  if (m) return { base: m[2], forms: NUMBER_FORMS[m[1]].map((n) => `${n} ${m[2]}`), numbered: true }
  return { base: bibleBook, forms: [bibleBook, ...(EXTRA_NAMES[bibleBook] || [])], numbered: false }
}

function patternsFor(bibleBook) {
  const { base, forms, numbered } = nameForms(bibleBook)
  const any = forms.map(esc).join('|')
  // A bare name must not be the tail of a numbered book ("John" vs "1 John").
  const bare = `(?<!${ordinal})(?:${any})`
  const context = '(?:gospel|book|letters?|epistles?|prophecy|stud(?:y|ies)|commentary|exposition|sermons?|reading)\\s+(?:of|on|to|according\\s+to|in|through)\\s+(?:the\\s+)?(?:saint\\s+|st\\.?\\s+)?'
  const notAfter = `(?![’']?s?\\s+(?:${NOT_AFTER.join('|')})\\b)`
  const strong = [
    new RegExp(`^(?:the\\s+)?(?:book\\s+of\\s+)?${bare}\\b${notAfter}`, 'i'),
    new RegExp(`\\b${context}${bare}\\b`, 'i'),
    new RegExp(`\\breading\\s+${bare}\\s+in\\s+context\\b`, 'i'),
  ]
  if (GOSPELS.has(bibleBook)) strong.push(new RegExp(`\\b${bare}[’']s\\s+(?:story|gospel)\\b`, 'i'))
  // "Letters/Epistles of John" covers 1–3 John; "Corinthians" alone covers both.
  if (numbered) strong.push(new RegExp(`\\b(?:letters|epistles)\\s+(?:of|to)\\s+(?:the\\s+)?${esc(base)}\\b`, 'i'))
  if (numbered && !AMBIGUOUS.has(base)) strong.push(new RegExp(`(?<!${ordinal})\\b${esc(base)}\\b`, 'i'))
  const loose = !numbered && !AMBIGUOUS.has(base) ? new RegExp(`\\b${bare}\\b`, 'i') : null
  return { strong, loose, exact: new Set(forms.map((f) => f.toLowerCase())) }
}

const cache = new Map()
function cachedPatterns(bibleBook) {
  if (!cache.has(bibleBook)) cache.set(bibleBook, patternsFor(bibleBook))
  return cache.get(bibleBook)
}

function textMatches(text, p) {
  return !!text && (p.strong.some((r) => r.test(text)) || (p.loose ? p.loose.test(text) : false))
}

// Returns 'title' | 'subject' | 'tag' | null for why a library book is about bibleBook.
export function bookAboutReason(book, bibleBook) {
  const p = cachedPatterns(bibleBook)
  // "From Genesis to Revelation" means the whole Bible, not either book.
  const title = (book.title || '').replace(/\bgenesis\s+to\s+revelation\b/gi, '')
  if (textMatches(title, p)) return 'title'
  const labelMatch = (label) => p.exact.has(String(label).trim().toLowerCase()) || textMatches(label, p)
  if ((book.subjects || []).some(labelMatch)) return 'subject'
  if ((book.tags || []).some(labelMatch)) return 'tag'
  return null
}

export function testamentOf(bibleBook, canonicalBooks) {
  const i = canonicalBooks.indexOf(bibleBook)
  if (i < 0) return null
  return i <= canonicalBooks.indexOf(OT_LAST) ? 'Old Testament' : 'New Testament'
}

// Splits the library into books about this Bible book and broader resources
// (testament-wide or general commentaries) so the panel can show both.
export function libraryForPassage(books, bibleBook, canonicalBooks, linkedIds = new Set()) {
  const testament = testamentOf(bibleBook, canonicalBooks)
  const broadLabels = new Set([...GENERAL_SUBJECTS, ...(testament === 'New Testament' ? ['new testament', 'greek new testament'] : ['old testament', 'hebrew bible'])])
  if (GOSPELS.has(bibleBook) || bibleBook === 'Acts') broadLabels.add('jesus, the gospels & acts')
  const direct = [], broader = []
  for (const book of books) {
    const reason = linkedIds.has(book.id) ? 'notes' : bookAboutReason(book, bibleBook)
    if (reason) { direct.push({ ...book, reason }); continue }
    const labels = [...(book.subjects || []), ...(book.tags || [])].map((s) => String(s).toLowerCase())
    if (labels.some((l) => broadLabels.has(l)) || (testament && (book.title || '').toLowerCase().includes(testament.toLowerCase()))) broader.push(book)
  }
  const byTitle = (a, b) => (a.title || '').localeCompare(b.title || '')
  return { direct: direct.sort(byTitle), broader: broader.sort(byTitle), testament }
}

const checkTexts = (c) => [
  c.summary, c.denominational_note, c.alternative_suggestion, c.alt_summary,
  ...(Array.isArray(c.strengths) ? c.strengths : []), ...(Array.isArray(c.concerns) ? c.concerns : []),
  ...(Array.isArray(c.followups) ? c.followups.flatMap((f) => [f?.question, f?.answer]) : []),
].filter((t) => typeof t === 'string')

// Doctrine Checks whose findings or follow-up answers cite the passage.
export function checksCitingPassage(checks, passage) {
  return checks.filter((c) => checkTexts(c).some((t) => findReferences(t).some((r) => overlaps(r, passage))))
}
