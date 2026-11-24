import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Pencil, Plus, Printer, RefreshCw, Sparkles, Users } from 'lucide-react'
import { useAuth } from '../App'
import { supabase } from '../lib/supabase'
import { ownedRows, saveOwned, removeOwned } from '../lib/dailyStudyData'
import { localDay } from '../lib/dailyStudyModel'
import { DGROUP_DOCS, LEADER_PARTS, STATUS_LABELS, docStatus, exerciseMix, nextFriday, passageLabel, timingTotal } from '../lib/dgroup'
import { DiscussionClosing, DiscussionOpening, DiscussionSection, ESV_NOTICE, FieldEditor, LeaderPart } from '../components/DGroupGuide'
import { authHeaders } from '../lib/functionAuth'
import './DGroup.css'

const FUNCTIONS_BASE = import.meta.env.VITE_SUPABASE_URL + '/functions/v1'
const longDate = day => day ? new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) : 'No date set'

export async function createSessionFromSermon(userId, sermon) {
  return saveOwned('dgroup_sessions', userId, null, { sermon_id: sermon?.id || null, title: sermon?.title || 'D-Group session', passage: sermon?.primary_text || passageLabel(sermon?.primary_ref), meeting_date: nextFriday(localDay()), docs: {} })
}

async function generate(sessionId, doc, extra = {}) {
  const res = await fetch(`${FUNCTIONS_BASE}/dgroup-generate`, { method: 'POST', headers: await authHeaders(), body: JSON.stringify({ sessionId, doc, ...extra }) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.error) throw new Error(data.error || `Generation failed (${res.status}).`)
  return data.session
}

function StatusPill({ status }) { return <span className={`dg-status is-${status}`}>{STATUS_LABELS[status]}</span> }

export function DGroupIndex() {
  const user = useAuth()
  const navigate = useNavigate()
  const [sessions, setSessions] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { let active = true; ownedRows('dgroup_sessions', user.id).then(rows => { if (active) setSessions(rows.sort((a, b) => (b.meeting_date || '').localeCompare(a.meeting_date || ''))) }).catch(e => { if (active) { setSessions([]); setError(e.message) } }); return () => { active = false } }, [user.id])
  async function create() { setBusy(true); try { const row = await createSessionFromSermon(user.id, null); navigate(`/dgroup/${row.id}`) } catch (e) { setError(e.message) } finally { setBusy(false) } }
  return <div className="page dg-page">
    <header className="dg-head"><div><Link className="dg-back" to="/sermons"><ArrowLeft size={16} aria-hidden="true" />Sermons</Link><h1>D-Group</h1><p className="dg-muted">Friday 7:15 AM. Start a session from a sermon, or a blank one here.</p></div><button className="btn btn-primary" disabled={busy} onClick={create}><Plus size={16} aria-hidden="true" />New session</button></header>
    {error && <p role="alert">{error}</p>}
    {sessions === null ? <p role="status">Loading sessions…</p> : sessions.length === 0 ? <section className="dg-card dg-empty"><Users size={28} aria-hidden="true" /><h2>No sessions yet</h2><p className="dg-muted">Open a sermon and choose Build this week’s D-Group session. The discussion guide and leader guide are drafted from the sermon and its passage.</p><Link className="btn btn-secondary" to="/sermons">Go to Sermons</Link></section>
      : <ul className="dg-list">{sessions.map(s => { const done = DGROUP_DOCS.filter(d => docStatus(s, d.id) === 'ready').length; return <li key={s.id}><Link to={`/dgroup/${s.id}`}><span><strong>{s.title || 'Untitled session'}</strong><small>{[passageLabel(s.passage), longDate(s.meeting_date)].filter(Boolean).join(' · ')}</small></span><span className="dg-muted">{done} of {DGROUP_DOCS.length} ready</span></Link></li> })}</ul>}
  </div>
}

// The reviewable pieces of a guide: each can be edited, and most redrafted on their own.
function guideItems(docId, data) {
  if (!data) return []
  if (docId === 'discussion') return [
    { id: 'opening', title: 'Title, big idea and psalms', pick: ['title', 'subtitle', 'big_idea', 'call_to_worship', 'benediction'] },
    ...(data.sections || []).map((sec, i) => ({ id: `s${i}`, title: sec?.title || `Section ${i + 1}`, section: i })),
  ]
  return [{ id: 'title', title: 'Title', pick: ['title'] }, ...LEADER_PARTS.filter(p => data[p.key] !== undefined).map(p => ({ id: p.key, title: p.title, part: p.key }))]
}

function itemValue(item, data) {
  if (item.section !== undefined) return data.sections[item.section]
  if (item.part) return { [item.part]: data[item.part] }
  return Object.fromEntries(item.pick.map(k => [k, data[k] ?? (k === 'call_to_worship' || k === 'benediction' ? { ref: '' } : '')]))
}

function applyItem(item, data, value) {
  if (item.section !== undefined) return { ...data, sections: data.sections.map((x, i) => i === item.section ? value : x) }
  return { ...data, ...value }
}

function ItemPreview({ docId, item, data }) {
  if (docId === 'discussion') {
    if (item.section !== undefined) return <DiscussionSection s={data.sections[item.section]} />
    return <><h2 className="pk-title">{data.title}</h2>{data.subtitle && <p className="pk-muted">{data.subtitle}</p>}<DiscussionOpening data={data} /><DiscussionClosing data={data} /></>
  }
  if (item.part) return <LeaderPart k={item.part} value={data[item.part]} title={item.title} />
  return <h2 className="pk-title">{data.title}</h2>
}

export function DGroupSession() {
  const user = useAuth()
  const navigate = useNavigate()
  const { id } = useParams()
  const [session, setSession] = useState(null)
  const [sermon, setSermon] = useState(null)
  const [error, setError] = useState('')
  const [working, setWorking] = useState({})
  const [openDoc, setOpenDoc] = useState('discussion')
  const [editing, setEditing] = useState(null)
  const [fields, setFields] = useState(null)

  useEffect(() => {
    let active = true
    supabase.from('dgroup_sessions').select('*').eq('id', id).eq('user_id', user.id).maybeSingle().then(({ data, error: e }) => {
      if (!active) return
      if (e || !data) { setError('This session could not be found.'); return }
      setSession(data); setFields({ title: data.title, passage: passageLabel(data.passage), meeting_date: data.meeting_date || '', notes: data.notes })
      if (data.sermon_id) supabase.from('sermons').select('id,title,speaker,series,primary_ref').eq('id', data.sermon_id).maybeSingle().then(({ data: s }) => { if (active) setSermon(s) })
    })
    return () => { active = false }
  }, [id, user.id])

  const dirty = useMemo(() => session && fields && (fields.title !== session.title || fields.passage !== passageLabel(session.passage) || (fields.meeting_date || null) !== (session.meeting_date || null) || fields.notes !== session.notes), [session, fields])
  if (error && !session) return <div className="page dg-page"><p role="alert">{error}</p><Link to="/dgroup">Back to D-Group</Link></div>
  if (!session || !fields) return <div className="page dg-page"><p role="status">Loading session…</p></div>

  async function saveFields() { try { const row = await saveOwned('dgroup_sessions', user.id, session, { ...fields, meeting_date: fields.meeting_date || null }); setSession(row); setError('') } catch (e) { setError(e.message) } }
  async function run(docId, extra = {}, key = docId) {
    if (dirty) await saveFields()
    setWorking(w => ({ ...w, [key]: true })); setError('')
    try { const row = await generate(session.id, docId, extra); setSession(row); setOpenDoc(docId); setEditing(null) } catch (e) { setError(e.message) } finally { setWorking(w => ({ ...w, [key]: false })) }
  }
  async function saveDoc(docId, changes) {
    try { const docs = { ...session.docs, [docId]: { ...(session.docs?.[docId] || {}), ...changes, edited_at: new Date().toISOString() } }; const row = await saveOwned('dgroup_sessions', user.id, session, { docs }); setSession(row); setError(''); return true } catch (e) { setError(e.message); return false }
  }
  async function remove() { if (!confirm('Delete this D-Group session and its guides? The sermon stays.')) return; try { await removeOwned('dgroup_sessions', user.id, session); navigate('/dgroup') } catch (e) { setError(e.message) } }

  const current = DGROUP_DOCS.find(d => d.id === openDoc)
  const data = session.docs?.[openDoc]?.data
  const status = docStatus(session, openDoc)
  const busy = working[openDoc] || status === 'generating'
  const needsDiscussion = openDoc === 'leader' && !session.docs?.discussion?.data
  const mix = exerciseMix(session.docs?.discussion?.data)
  const items = guideItems(openDoc, data)
  return <div className="page dg-page">
    <header className="dg-head"><div><Link className="dg-back" to="/dgroup"><ArrowLeft size={16} aria-hidden="true" />D-Group</Link><h1>{session.title || 'D-Group session'}</h1><p className="dg-muted">{[passageLabel(session.passage), longDate(session.meeting_date)].filter(Boolean).join(' · ')}{sermon && <> · from <Link to={`/sermons/${sermon.id}`}>{sermon.title}</Link></>}</p></div>
      <div className="dg-actions"><button className="btn btn-ghost" onClick={remove}>Delete</button></div></header>
    {error && <p role="alert" className="dg-error">{error}</p>}
    <div className="dg-layout">
      <aside className="dg-side">
        <nav className="dg-card dg-docs" aria-label="Guides">{DGROUP_DOCS.map(d => { const st = docStatus(session, d.id); return <button key={d.id} type="button" className={`dg-doc ${openDoc === d.id ? 'is-open' : ''}`} aria-current={openDoc === d.id ? 'true' : undefined} onClick={() => { setOpenDoc(d.id); setEditing(null) }}><span><strong>{d.title}</strong><small>{d.sub}</small></span><StatusPill status={working[d.id] ? 'generating' : st} /></button> })}</nav>
        {mix.length > 0 && <section className="dg-card"><p className="dg-label">Exercises this week</p><p className="dg-muted">{mix.join(', ')}</p></section>}
        <section className="dg-card">
          <label className="dg-field">Title<input className="input" value={fields.title} maxLength={200} onChange={e => setFields(f => ({ ...f, title: e.target.value }))} /></label>
          <label className="dg-field">Passage<input className="input" value={fields.passage} maxLength={200} placeholder="1 Peter 2:13-17" onChange={e => setFields(f => ({ ...f, passage: e.target.value }))} /></label>
          <label className="dg-field">Meets<input className="input" type="date" value={fields.meeting_date} onChange={e => setFields(f => ({ ...f, meeting_date: e.target.value }))} /></label>
          <details className="dg-notes"><summary>Your notes for the drafts</summary><textarea className="input" rows={5} maxLength={20000} value={fields.notes} placeholder="Emphases, questions from last week, men’s situations to keep in mind, next Sunday’s passage…" onChange={e => setFields(f => ({ ...f, notes: e.target.value }))} /></details>
          {dirty && <button className="btn btn-secondary" onClick={saveFields}>Save details</button>}
        </section>
      </aside>
      <section className="dg-main" aria-labelledby="doc-title">
        <div className="dg-card dg-doc-head"><div><h2 id="doc-title">{current.title}</h2>{data && <p className="dg-muted">{openDoc === 'leader' && data.timing ? `Timing adds to ${timingTotal(data.timing)} minutes · ` : ''}Review each section, then print.</p>}</div>
          <div className="dg-actions">
            {data && <><Link className="btn btn-ghost" to={`/dgroup/${session.id}/print/${openDoc}`}><Printer size={16} aria-hidden="true" />Print / PDF</Link>
              <button className="btn btn-secondary" onClick={() => saveDoc(openDoc, { status: status === 'ready' ? 'draft' : 'ready' })}><Check size={16} aria-hidden="true" />{status === 'ready' ? 'Mark as draft' : 'Mark ready'}</button></>}
            <button className="btn btn-primary" disabled={busy || needsDiscussion || !fields.passage.trim()} onClick={() => { if (data && !confirm(`Replace the whole ${current.title.toLowerCase()} with a new draft? Your edits to it will be lost.`)) return; void run(openDoc) }}>{data ? <RefreshCw size={16} aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />}{busy ? 'Drafting…' : data ? 'Redraft all' : 'Draft it'}</button>
          </div></div>
        {!data ? <div className="dg-card"><p className="dg-muted">{!fields.passage.trim() ? 'Add the passage first, then draft.' : needsDiscussion ? 'Draft the discussion guide first. The leader guide is built from it, with answer keys, timing and the cut-out cards.' : busy ? 'Drafting from the sermon. This takes a minute or two.' : `Not drafted yet. Draft builds it from ${fields.passage}${sermon ? ` and “${sermon.title}”` : ''}, with exercises picked for this week.`}</p></div>
          : <>{items.map(item => {
            const key = `${openDoc}:${item.id}`
            const isEditing = editing?.key === key
            const canRedraft = item.section !== undefined || item.part
            return <article key={key} className={`dg-card dg-item ${isEditing ? 'is-editing' : ''}`}>
              <div className="dg-item-head"><h3>{item.title}</h3>{!isEditing && <div className="dg-actions">
                <button className="btn btn-ghost" onClick={() => setEditing({ key, value: itemValue(item, data) })}><Pencil size={16} aria-hidden="true" />Edit</button>
                {canRedraft && <button className="btn btn-ghost" disabled={working[key] || busy} onClick={() => run(openDoc, item.section !== undefined ? { section: item.section } : { part: item.part }, key)}><RefreshCw size={16} aria-hidden="true" />{working[key] ? 'Redrafting…' : 'Redraft'}</button>}
              </div>}</div>
              {isEditing ? <div className="dg-editor"><FieldEditor value={editing.value} onChange={value => setEditing(ed => ({ ...ed, value }))} /><div className="dg-actions"><button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button><button className="btn btn-primary" onClick={async () => { if (await saveDoc(openDoc, { data: applyItem(item, data, editing.value) })) setEditing(null) }}>Save</button></div></div>
                : <div className="pk pk-screen"><ItemPreview docId={openDoc} item={item} data={data} /></div>}
            </article>
          })}<p className="dg-muted dg-ai">AI-drafted from the passage{sermon ? ' and the sermon' : ''}. Check it against Scripture before you use it.</p></>}
      </section>
    </div>
  </div>
}

export function DGroupPrint() {
  const user = useAuth()
  const { id, doc: docId } = useParams()
  const [session, setSession] = useState(null)
  useEffect(() => { let active = true; supabase.from('dgroup_sessions').select('*').eq('id', id).eq('user_id', user.id).maybeSingle().then(({ data }) => { if (active) setSession(data || false) }); return () => { active = false } }, [id, user.id])
  const spec = DGROUP_DOCS.find(d => d.id === docId)
  if (session === null) return <p role="status">Loading…</p>
  const data = session?.docs?.[docId]?.data
  if (!session || !spec || !data) return <div className="page"><p>This guide isn’t available.</p><Link to={`/dgroup/${id}`}>Back to the session</Link></div>
  const leader = docId === 'leader'
  return <div className="pk pk-print">
    <div className="pk-print-bar"><Link to={`/dgroup/${id}`}><ArrowLeft size={16} aria-hidden="true" />Back</Link><span>Choose Print, then Save as PDF. Turn on background graphics for the shaded boxes.</span><button className="btn btn-primary" onClick={() => window.print()}><Printer size={16} aria-hidden="true" />Print</button></div>
    <header className="pk-head"><div className="pk-kicker">Parkside Baptist Church · D-Group{leader ? ' · Leader guide' : ''}</div><h1>{data.title || session.title}</h1><p>{[!leader && data.subtitle, passageLabel(session.passage), session.meeting_date && longDate(session.meeting_date)].filter(Boolean).join(' · ')}</p></header>
    {leader ? <>{data.overview && <LeaderPart k="overview" value={data.overview} title="The aim for Friday" />}{LEADER_PARTS.filter(p => p.key !== 'overview' && data[p.key] !== undefined).map(p => <LeaderPart key={p.key} k={p.key} value={data[p.key]} title={p.title} />)}</>
      : <><DiscussionOpening data={data} />{(data.sections || []).map((sec, i) => <DiscussionSection key={i} s={sec} />)}<DiscussionClosing data={data} /><p className="pk-copyright">{ESV_NOTICE}</p></>}
  </div>
}

// On a sermon: open this sermon's D-Group session, or build one prefilled from it.
export function DGroupButton({ sermon }) {
  const user = useAuth()
  const navigate = useNavigate()
  const [existing, setExisting] = useState(undefined)
  const [busy, setBusy] = useState(false)
  useEffect(() => { let active = true; if (!sermon?.id) return; supabase.from('dgroup_sessions').select('id').eq('user_id', user.id).eq('sermon_id', sermon.id).order('created_at', { ascending: false }).limit(1).then(({ data }) => { if (active) setExisting(data?.[0] || null) }); return () => { active = false } }, [sermon?.id, user.id])
  if (!sermon?.id || existing === undefined) return null
  if (existing) return <Link className="btn btn-secondary" to={`/dgroup/${existing.id}`}><Users size={16} aria-hidden="true" />D-Group session</Link>
  return <button className="btn btn-primary" disabled={busy} onClick={async () => { setBusy(true); try { const row = await createSessionFromSermon(user.id, sermon); navigate(`/dgroup/${row.id}`) } catch (e) { alert(e.message) } finally { setBusy(false) } }}><Users size={16} aria-hidden="true" />Build this week’s D-Group session</button>
}
