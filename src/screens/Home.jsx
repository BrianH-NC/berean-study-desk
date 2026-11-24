import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, ChevronRight, LibraryBig, Mic, NotebookPen, Play, Plus, ShieldCheck, Users } from 'lucide-react'
import { useAuth } from '../App'
import { supabase } from '../lib/supabase'
import { fetchVerseOfTheDay } from '../lib/votd'
import { ownedRows, saveOwned } from '../lib/dailyStudyData'
import { localDay, planQueue } from '../lib/dailyStudyModel'
import { MCHEYNE_DAYS, MCHEYNE_TITLE, isMcheynePlan, mcheynePlanItems, mcheyneStart, mcheyneStatus, readingUrl, toggleMcheyneReading } from '../lib/mcheyne'
import { verdictClass } from '../lib/verdict'
import { DGROUP_DOCS, docStatus } from '../lib/dgroup'
import './Today.css'

const greeting = (date = new Date()) => date.getHours() < 12 ? 'Good morning' : date.getHours() < 17 ? 'Good afternoon' : 'Good evening'
const dayOfYear = (date = new Date()) => Math.min(MCHEYNE_DAYS, Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 0)) / 864e5))
const shortDate = value => value ? new Date(value.length === 10 ? `${value}T12:00:00` : value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''

function PlanSetup({ onStart, busy }) {
  const [day, setDay] = useState(dayOfYear())
  return <section className="today-card today-plan" aria-labelledby="plan-heading">
    <div className="today-kicker">M’Cheyne (Modified)</div>
    <h2 id="plan-heading" className="today-plan-title">Read through the Bible this year</h2>
    <p className="today-muted">Three readings a day, from the plan you follow on YouVersion. Tell me which day you’re on and I’ll start there; earlier days count as read.</p>
    <form className="today-setup" onSubmit={event => { event.preventDefault(); onStart(day) }}>
      <label htmlFor="mcheyne-day">I’m on day</label>
      <input id="mcheyne-day" className="input" type="number" min="1" max={MCHEYNE_DAYS} required value={day} onChange={event => setDay(event.target.value)} />
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Starting…' : 'Start reading'}</button>
    </form>
  </section>
}

function PlanCard({ plan, onToggle, busy, others }) {
  const status = mcheyneStatus(plan, localDay())
  if (status.finished) return <section className="today-card today-plan"><div className="today-kicker">{MCHEYNE_TITLE}</div><h2 className="today-plan-title">You finished all {MCHEYNE_DAYS} days.</h2><p className="today-muted">Start a new year from <Link to="/reading-plans">Reading plans</Link>.</p></section>
  const next = status.readings.find(r => !r.done)
  return <section className="today-card today-plan" aria-labelledby="plan-heading">
    <div className="today-plan-head">
      <div><div className="today-kicker">{MCHEYNE_TITLE} · Day {status.index + 1}</div><h2 id="plan-heading" className="today-plan-title">Today’s readings</h2></div>
      <div className="today-progress"><strong>{status.read} of {status.readings.length} read</strong><span className="today-bar"><span style={{ width: `${(status.read / status.readings.length) * 100}%` }} /></span>{status.behind > 0 && <small>{status.behind} {status.behind === 1 ? 'day' : 'days'} behind; this is the next unread day</small>}</div>
    </div>
    <ul className="today-readings">{status.readings.map(reading => <li key={reading.n} className={reading.done ? 'is-done' : ''}>
      <button type="button" className="today-check" disabled={busy} aria-pressed={reading.done} aria-label={`${reading.done ? 'Mark unread' : 'Mark read'}: ${reading.label}`} onClick={() => onToggle(status.index, reading.n)}>{reading.done && <Check size={14} strokeWidth={3} aria-hidden="true" />}</button>
      <Link to={readingUrl(plan, status.index, reading)}><span className="today-ref">{reading.label}</span><ChevronRight size={18} aria-hidden="true" /></Link>
    </li>)}</ul>
    <div className="today-plan-foot">
      {next ? <Link className="btn btn-primary" to={readingUrl(plan, status.index, next)}><Play size={16} aria-hidden="true" />{status.read ? `Continue with ${next.label}` : `Start with ${next.label}`}</Link> : <span className="today-muted">Day {status.index + 1} is done. Tomorrow’s readings will be here.</span>}
      {others.length > 0 && <span className="today-muted">Also: {others[0].plan.title} · {others.length} waiting <Link to="/reading-plans">Review</Link></span>}
    </div>
  </section>
}

export default function Home() {
  const user = useAuth()
  const navigate = useNavigate()
  const [plans, setPlans] = useState(null)
  const [planError, setPlanError] = useState('')
  const [busy, setBusy] = useState(false)
  const [data, setData] = useState(null)
  const [votd, setVotd] = useState(null)
  const [capture, setCapture] = useState('')
  const name = (user?.user_metadata?.display_name || user?.user_metadata?.full_name || '').trim().split(/\s+/)[0]

  useEffect(() => { let active = true; ownedRows('reading_plans', user.id).then(rows => { if (active) setPlans(rows) }).catch(e => { if (active) { setPlans([]); setPlanError(e.message) } }); return () => { active = false } }, [user.id])
  useEffect(() => { let active = true; fetchVerseOfTheDay().then(v => { if (active) setVotd(v) }).catch(() => { if (active) setVotd(false) }); return () => { active = false } }, [])
  useEffect(() => {
    let active = true
    Promise.all([
      supabase.from('books').select('id,title,author,updated_at').eq('user_id', user.id).eq('reading_status', 'in-progress').order('updated_at', { ascending: false }).limit(2),
      supabase.from('entries').select('id,title,created_at,ref').is('deleted_at', null).eq('user_id', user.id).order('created_at', { ascending: false }).limit(2),
      supabase.from('theology_checks').select('id,title,name,verdict,created_at').order('created_at', { ascending: false }).limit(3),
      supabase.from('sermons').select('id,title,speaker,series,sermon_date,primary_ref,study_guide_generated_at').eq('user_id', user.id).order('sermon_date', { ascending: false, nullsFirst: false }).limit(1),
      supabase.from('dgroup_sessions').select('id,title,passage,meeting_date,docs,generating').eq('user_id', user.id).gte('meeting_date', localDay()).order('meeting_date', { ascending: true }).limit(1),
    ]).then(([books, notes, checks, sermons, groups]) => { if (active) setData({ books: books.data || [], notes: notes.data || [], checks: checks.data || [], sermon: sermons.data?.[0] || null, group: groups.data?.[0] || null }) }).catch(() => { if (active) setData({ books: [], notes: [], checks: [], sermon: null, group: null, error: true }) })
    return () => { active = false }
  }, [user.id])

  const mcheyne = useMemo(() => plans?.find(isMcheynePlan) || null, [plans])
  const others = useMemo(() => plans ? planQueue(plans) : [], [plans])

  async function start(dayNumber) {
    setBusy(true); setPlanError('')
    try { const row = await saveOwned('reading_plans', user.id, null, { title: MCHEYNE_TITLE, kind: 'bible', interval_days: 1, items: mcheynePlanItems(), ...mcheyneStart(dayNumber, localDay()) }); setPlans(rows => [...rows, row]) }
    catch (e) { setPlanError(e.message) } finally { setBusy(false) }
  }
  async function toggle(dayIndex, n) {
    if (busy) return
    setBusy(true); setPlanError('')
    try { const row = await saveOwned('reading_plans', user.id, mcheyne, { completed: toggleMcheyneReading(mcheyne, dayIndex, n) }); setPlans(rows => rows.map(p => p.id === row.id ? row : p)) }
    catch (e) { setPlanError(e.message) } finally { setBusy(false) }
  }

  const verseTo = votd ? `/bible?book=${encodeURIComponent(votd.book)}&chapter=${votd.chapter}${votd.verseStart ? `&verse=${votd.verseStart}` : ''}${votd.verseEnd ? `&verseEnd=${votd.verseEnd}` : ''}` : '/bible'
  const today = new Date()
  return <div className="page today">
    <header className="today-header">
      <div><p className="today-greeting">{greeting(today)}{name ? `, ${name}` : ''}</p><h1>{today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</h1></div>
      <div className="today-actions"><Link className="btn btn-secondary" to="/notebook/new"><Plus size={16} aria-hidden="true" />New note</Link><Link className="btn btn-secondary" to="/checks"><ShieldCheck size={16} aria-hidden="true" />Doctrine Check</Link></div>
    </header>
    {planError && <p role="alert" className="today-error">{planError}</p>}
    <div className="today-layout">
      <div className="today-main">
        {plans === null ? <section className="today-card" role="status">Loading your readings…</section> : mcheyne ? <PlanCard plan={mcheyne} onToggle={toggle} busy={busy} others={others} /> : <PlanSetup onStart={start} busy={busy} />}
        {(data?.sermon || data?.group) && <section className="today-card" aria-labelledby="week-heading"><h2 id="week-heading" className="today-h2">This week</h2><div className="today-week">
          {data.sermon && <Link className="today-tile" to={`/sermons/${data.sermon.id}`}><span className="today-tile-icon"><Mic size={20} aria-hidden="true" /></span><span><span className="today-muted">Latest sermon{data.sermon.series ? ` · ${data.sermon.series}` : ''}</span><strong>{data.sermon.title || 'Untitled sermon'}</strong><span className="today-muted">{[data.sermon.speaker, data.sermon.primary_ref, data.sermon.study_guide_generated_at && 'Study guide ready'].filter(Boolean).join(' · ')}</span></span></Link>}
          {data.group ? <Link className="today-tile" to={`/dgroup/${data.group.id}`}><span className="today-tile-icon today-tile-ochre"><Users size={20} aria-hidden="true" /></span><span><span className="today-muted">D-Group · {new Date(`${data.group.meeting_date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long' })}</span><strong>{data.group.passage || data.group.title}</strong><span className="today-muted">{DGROUP_DOCS.filter(d => docStatus(data.group, d.id) === 'ready').length} of {DGROUP_DOCS.length} guides ready</span></span></Link>
            : data.sermon && <Link className="today-tile" to={`/sermons/${data.sermon.id}`}><span className="today-tile-icon today-tile-ochre"><Users size={20} aria-hidden="true" /></span><span><span className="today-muted">D-Group · Friday</span><strong>No session yet</strong><span className="today-muted">Build one from this sermon</span></span></Link>}
        </div></section>}
        {data && (data.books.length > 0 || data.notes.length > 0) && <section className="today-card" aria-labelledby="pickup-heading"><h2 id="pickup-heading" className="today-h2">Pick up where you left off</h2>
          <ul className="today-list">
            {data.books.map(book => <li key={book.id}><Link to={`/reading/${book.id}`}><LibraryBig size={18} aria-hidden="true" /><span><strong>{book.title}</strong><small>{book.author ? `${book.author} · ` : ''}Book · updated {shortDate(book.updated_at)}</small></span></Link></li>)}
            {data.notes.map(note => <li key={note.id}><Link to={`/notebook/${note.id}`}><NotebookPen size={18} aria-hidden="true" /><span><strong>{note.title || 'Untitled note'}</strong><small>Note{note.ref ? ` · ${note.ref}` : ''} · {shortDate(note.created_at)}</small></span></Link></li>)}
          </ul></section>}
      </div>
      <aside className="today-side" aria-label="More for today">
        <section className="today-card"><div className="today-kicker today-kicker-muted">Verse of the day</div>{votd ? <><p className="today-verse">“{votd.text}”</p><div className="today-row"><Link to={verseTo}>{votd.reference} · BSB</Link><Link to="/notebook/new" state={{ ref: votd.reference, body: `“${votd.text}”` }}>Reflect in a note</Link></div><small className="today-muted">Daily pick via <a href="https://www.biblegateway.com/" target="_blank" rel="noreferrer">BibleGateway</a></small></> : votd === false ? <p className="today-muted">The verse of the day could not load.</p> : <p className="today-muted" role="status">Loading…</p>}</section>
        <section className="today-card"><h2 className="today-h2"><label htmlFor="quick-capture">Quick capture</label></h2>
          <form onSubmit={event => { event.preventDefault(); if (capture.trim()) navigate('/notebook/new', { state: { body: capture.trim() } }) }}><textarea id="quick-capture" className="input" rows={3} placeholder="A thought, a verse, a question…" value={capture} onChange={event => setCapture(event.target.value)} /><div className="today-row today-row-end"><button className="btn btn-secondary" disabled={!capture.trim()}>Open as a note</button></div></form></section>
        {data?.checks?.length > 0 && <section className="today-card"><div className="today-row"><h2 className="today-h2">Recent checks</h2><Link to="/checks">All checks</Link></div>
          <ul className="today-checks">{data.checks.map(check => <li key={check.id}><Link to={`/checks/${check.id}`}>{check.title || check.name || 'Untitled'}</Link><span className={`tag ${verdictClass(check.verdict)}`}>{check.verdict || 'Not assessed'}</span></li>)}</ul></section>}
      </aside>
    </div>
  </div>
}
