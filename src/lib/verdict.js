import { ShieldCheck, ShieldAlert, ShieldQuestion } from 'lucide-react'

// The Anthropic-backed edge function (theology-checker/supabase/functions/
// theology-check/index.ts) returns one of these five verdict strings; this
// maps each to the badge treatment defined in index.css.
export function verdictClass(verdict) {
  if (!verdict) return 'verdict-unassessed'
  const v = verdict.toLowerCase()
  if (v.startsWith('sound')) return 'verdict-sound'
  if (v.startsWith('caution')) return 'verdict-caution'
  if (v.startsWith('concern')) return 'verdict-concern'
  return 'verdict-distinctive' // "Baptism/Polity Distinctive", "Unable to Assess"
}

export function verdictIcon(verdict) {
  const cls = verdictClass(verdict)
  if (cls === 'verdict-sound') return ShieldCheck
  if (cls === 'verdict-caution' || cls === 'verdict-concern') return ShieldAlert
  return ShieldQuestion
}
