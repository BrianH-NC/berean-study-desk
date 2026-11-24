import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, ChevronRight } from 'lucide-react'
import { useAuth } from '../App'
import { supabase } from '../lib/supabase'
import { saveOwned } from '../lib/dailyStudyData'
import { isMcheynePlan, readingDone, readingUrl, toggleMcheyneReading } from '../lib/mcheyne'

// Shown above the text when a reading was opened from Today: where you are in the plan, and Mark read.
export default function PlanReadingBar({ planId, dayIndex, readingIndex }) {
  const user = useAuth()
  const navigate = useNavigate()
  const [plan, setPlan] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let active = true
    supabase.from('reading_plans').select('*').eq('id', planId).eq('user_id', user.id).maybeSingle()
      .then(({ data, error: e }) => { if (!active) return; if (e || !data || !isMcheynePlan(data)) setError('This reading plan could not be loaded.'); else setPlan(data) })
    return () => { active = false }
  }, [planId, user.id])

  const day = plan?.items?.[dayIndex]
  if (error) return <p className="plan-bar plan-bar-error" role="status">{error} <Link to="/">Back to Today</Link></p>
  if (!day || !day.readings[readingIndex]) return null
  const readings = day.readings.map((reading, n) => ({ ...reading, n, done: readingDone(plan, dayIndex, n) }))
  const current = readings[readingIndex]
  const next = readings.find(r => !r.done && r.n !== readingIndex)

  async function markRead() {
    if (busy) return
    setBusy(true); setError('')
    try {
      const saved = await saveOwned('reading_plans', user.id, plan, { completed: toggleMcheyneReading(plan, dayIndex, readingIndex) })
      setPlan(saved)
      if (!current.done) navigate(next ? readingUrl(saved, dayIndex, next) : '/', { replace: false })
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  return <div className="plan-bar" role="region" aria-label="Reading plan">
    <span className="plan-bar-where"><strong>{plan.title} · Day {dayIndex + 1}</strong><span>Reading {readingIndex + 1} of {readings.length}: {current.label}</span></span>
    <span className="plan-bar-steps" aria-hidden="true">{readings.map(r => <span key={r.n} className={`${r.done ? 'is-done' : ''} ${r.n === readingIndex ? 'is-current' : ''}`} />)}</span>
    {current.done
      ? <><span className="plan-bar-done"><Check size={16} aria-hidden="true" />Read</span>{next ? <Link className="btn btn-secondary" to={readingUrl(plan, dayIndex, next)}>Next: {next.label}<ChevronRight size={16} aria-hidden="true" /></Link> : <Link className="btn btn-secondary" to="/">Back to Today</Link>}<button type="button" className="btn btn-ghost" disabled={busy} onClick={markRead}>Undo</button></>
      : <button type="button" className="btn btn-primary" disabled={busy} onClick={markRead}><Check size={16} aria-hidden="true" />{next ? 'Mark read and continue' : 'Mark read and finish the day'}</button>}
  </div>
}
