// Thin fetch wrappers around the theology-checker Edge Functions, matching
// theology-checker/index.html's exact calling convention (same headers, same
// action names, same payload shapes) rather than the Supabase client — these
// two functions are the app's only Anthropic-backed calls, and both keep the
// API key server-side.

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const FUNCTIONS_BASE = SUPABASE_URL + '/functions/v1'

async function callFunction(name, body) {
  const res = await fetch(`${FUNCTIONS_BASE}/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok || data.error) {
    throw new Error(data.error || `${name} request failed (${res.status})`)
  }
  return data
}

// subject: { kind: 'book', title, authors, description, isbn } | { kind: 'person', name }
export function assessSubject(subject) {
  return callFunction('theology-check', { action: 'assess', ...subject })
}

export function compareConfession(subject, confessionName, wideScope) {
  return callFunction('theology-check', { action: 'compareConfession', confessionName, wideScope, ...subject })
}

export function askFollowup(checkContext, question) {
  return callFunction('theology-check', { action: 'followup', checkContext, question })
}

export function checksList() {
  return callFunction('checks-api', { action: 'list' })
}

export function checksInsert(row) {
  return callFunction('checks-api', { action: 'insert', row })
}

export function checksUpdate(id, values) {
  return callFunction('checks-api', { action: 'update', id, values })
}

export function listHolyShelfUnchecked() {
  return callFunction('checks-api', { action: 'listHolyShelfUnchecked' })
}

// The seven confessions theology-checker actually supports (from its own
// index.html) — the design doc's summary list is incomplete, this is the
// authoritative one, preserved verbatim per "domain vocabulary."
export const CONFESSIONS = [
  { slug: '1689', name: '1689 London Baptist Confession', wideScope: true },
  { slug: 'abstract1858', name: 'Abstract of Principles (1858)', wideScope: true },
  { slug: 'dort1619', name: 'Canons of Dort (1619)', wideScope: false },
  { slug: 'nh1833', name: 'New Hampshire Confession (1833)', wideScope: true },
  { slug: 'chicago1978', name: 'Chicago Statement on Biblical Inerrancy (1978)', wideScope: false },
  { slug: 'nicene', name: 'Nicene Creed', wideScope: false },
  { slug: 'danvers1987', name: 'Danvers Statement (1987)', wideScope: false },
]

// Maps the edge function's camelCase assessment response onto the DB's
// snake_case columns (see theology-checker/supabase/functions/theology-check).
export function mapAssessmentToRow(assessment) {
  return {
    verdict: assessment.verdict ?? null,
    summary: assessment.summary ?? null,
    strengths: assessment.strengths ?? [],
    concerns: assessment.concerns ?? [],
    denominational_note: assessment.denominationalNote ?? null,
    confidence: assessment.confidence ?? null,
    confidence_note: assessment.confidenceNote ?? null,
    creation_view: assessment.creationView ?? null,
    alternative_suggestion: assessment.alternativeSuggestion ?? null,
  }
}
