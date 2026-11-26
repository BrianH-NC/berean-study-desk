// The owner's author rules and the verdict a book shows. A rule ("Beeke is
// Baptism/Polity Distinctive") beats an AI Doctrine Check; without a rule the
// latest check counts; otherwise the book has no verdict.
import { suggestFilingName } from './shelfLabels.js'

export const VERDICTS = ['Sound', 'Caution', 'Concern', 'Baptism/Polity Distinctive', 'Unable to Assess']

// Colors for the printed bar. Strong, distinct and readable on a shelf.
const BAR = { Sound: '#2E7D32', Caution: '#E0A100', Concern: '#C62828', 'Baptism/Polity Distinctive': '#1E5BC6', 'Unable to Assess': '#9E9E9E' }
export function verdictBarColor(verdict) {
  if (!verdict) return null
  const v = String(verdict).toLowerCase()
  if (v.startsWith('sound')) return BAR.Sound
  if (v.startsWith('caution')) return BAR.Caution
  if (v.startsWith('concern')) return BAR.Concern
  if (v.startsWith('unable')) return BAR['Unable to Assess']
  return BAR['Baptism/Polity Distinctive']
}

const fold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const credits = author => String(author || '').split(/\s*[|;]\s*|\s+&\s+|\s+and\s+/i).map(s => s.trim()).filter(Boolean)

// One word ("Beeke") matches the book's filing name or the first credited
// author's surname. More than one word ("Michael P.V. Barrett") must match a
// credited author's full name, so two people with one surname stay apart.
export function ruleMatches(rule, book) {
  const name = fold(rule?.author)
  if (!name) return false
  if (!name.includes(' ')) {
    if (book.shelf_author && fold(book.shelf_author) === name) return true
    return fold(suggestFilingName(book.author)) === name
  }
  return credits(book.author).some(c => fold(c) === name || fold(c.replace(/^(dr|rev|pastor|prof)\.?\s+/i, '')) === name)
}

// The most specific matching rule: full names before surnames.
export function ruleFor(book, rules) {
  let best = null
  for (const r of rules || []) if (ruleMatches(r, book) && (!best || fold(r.author).length > fold(best.author).length)) best = r
  return best
}

export function effectiveVerdict(book, rules, check) {
  const rule = ruleFor(book, rules)
  if (rule) return { verdict: rule.verdict, source: 'rule', rule, check: check || null }
  if (check?.verdict) return { verdict: check.verdict, source: 'check', rule: null, check }
  return { verdict: null, source: null, rule: null, check: check || null }
}
