import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import DOMPurify from 'dompurify'
import { ArrowLeft, Check, Copy, Plus, Printer, RefreshCw, Sparkles, Users } from 'lucide-react'
import { useAuth } from '../App'
import { supabase } from '../lib/supabase'
import { ownedRows, saveOwned, removeOwned } from '../lib/dailyStudyData'
import { localDay } from '../lib/dailyStudyModel'
import { DGROUP_DOCS, STATUS_LABELS, bookletSections, docStatus, nextFriday } from '../lib/dgroup'
import { markdownToHtml } from '../lib/markdown'
import { authHeaders } from '../lib/functionAuth'
import { fetchEsvPassage } from '../lib/esv'
import './DGroup.css'

const FUNCTIONS_BASE = import.meta.env.VITE_SUPABASE_URL + '/functions/v1'
const longDate = day => day ? new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) : 'No date set'
export const Rendered = ({ markdown, className = 'dg-prose' }) => <div className={className} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(markdownToHtml(markdown)) }} />

export async function createSessionFromSermon(userId, sermon) {
  return saveOwned('dgroup_sessions', userId, null, { sermon_id: sermon?.id || null, title: sermon?.title || 'D-Group session', passage: sermon?.primary_ref || '', meeting_date: nextFriday(localDay()), docs: {} })
}

async function generate(sessionId, doc) {
  const res = await fetch(`${FUNCTIONS_BASE}/dgroup-generate`, { method: 'POST', headers: await authHeaders(), body: JSON.stringify({ sessionId, doc }) })
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
    {sessions === null ? <p role="status">Loading sessions…</p> : sessions.length === 0 ? <section className="dg-card dg-empty"><Users size={28} aria-hidden="true" /><h2>No sessions yet</h2><p className="dg-muted">Open a sermon and choose Build this week’s D-Group session. The five documents are drafted from the sermon and its passage.</p><Link className="btn btn-secondary" to="/sermons">Go to Sermons</Link></section>
      : <ul className="dg-list">{sessions.map(s => { const done = DGROUP_DOCS.filter(d => docStatus(s, d.id) === 'ready').length; return <li key={s.id}><Link to={`/dgroup/${s.id}`}><span><strong>{s.title || 'Untitled session'}</strong><small>{[s.passage, longDate(s.meeting_date)].filter(Boolean).join(' · ')}</small></span><span className="dg-muted">{done} of {DGROUP_DOCS.length} ready</span></Link></li> })}</ul>}
  </div>
}

export function DGroupSession() {
  const user = useAuth()
  const navigate = useNavigate()
  const { id } = useParams()
  const [session, setSession] = useState(null)
  const [sermon, setSermon] = useState(null)
  const [error, setError] = useState('')
  const [working, setWorking] = useState({})
  const [openDoc, setOpenDoc] = useState('exegetical')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [fields, setFields] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let active = true
    supabase.from('dgroup_sessions').select('*').eq('id', id).eq('user_id', user.id).maybeSingle().then(({ data, error: e }) => {
      if (!active) return
      if (e || !data) { setError('This session could not be found.'); return }
      setSession(data); setFields({ title: data.title, passage: data.passage, meeting_date: data.meeting_date || '', notes: data.notes })
      if (data.sermon_id) supabase.from('sermons').select('id,title,speaker,series,primary_ref').eq('id', data.sermon_id).maybeSingle().then(({ data: s }) => { if (active) setSermon(s) })
    })
    return () => { active = false }
  }, [id, user.id])

  const dirty = useMemo(() => session && fields && (fields.title !== session.title || fields.passage !== session.passage || (fields.meeting_date || null) !== (session.meeting_date || null) || fields.notes !== session.notes), [session, fields])
  if (error && !session) return <div className="page dg-page"><p role="alert">{error}</p><Link to="/dgroup">Back to D-Group</Link></div>
  if (!session || !fields) return <div className="page dg-page"><p role="status">Loading session…</p></div>

  async function saveFields() { try { const row = await saveOwned('dgroup_sessions', user.id, session, { ...fields, meeting_date: fields.meeting_date || null }); setSession(row); setError('') } catch (e) { setError(e.message) } }
  async function run(docId) {
    if (dirty) await saveFields()
    setWorking(w => ({ ...w, [docId]: true })); setError('')
    try { const row = await generate(session.id, docId); setSession(row); setOpenDoc(docId); setEditing(false) } catch (e) { setError(e.message) } finally { setWorking(w => ({ ...w, [docId]: false })) }
  }
  async function runMissing() { for (const d of DGROUP_DOCS) if (docStatus(session, d.id) === 'empty') await run(d.id) }
  async function saveDoc(changes) {
    try { const docs = { ...session.docs, [openDoc]: { ...(session.docs?.[openDoc] || {}), ...changes, edited_at: new Date().toISOString() } }; const row = await saveOwned('dgroup_sessions', user.id, session, { docs }); setSession(row); setError(''); return true } catch (e) { setError(e.message); return false }
  }
  async function remove() { if (!confirm('Delete this D-Group session and its documents? The sermon stays.')) return; try { await removeOwned('dgroup_sessions', user.id, session); navigate('/dgroup') } catch (e) { setError(e.message) } }

  const current = DGROUP_DOCS.find(d => d.id === openDoc)
  const doc = session.docs?.[openDoc]
  const status = docStatus(session, openDoc)
  const anyMissing = DGROUP_DOCS.some(d => docStatus(session, d.id) === 'empty')
  return <div className="page dg-page">
    <header className="dg-head"><div><Link className="dg-back" to="/dgroup"><ArrowLeft size={16} aria-hidden="true" />D-Group</Link><h1>{session.title || 'D-Group session'}</h1><p className="dg-muted">{[session.passage, longDate(session.meeting_date)].filter(Boolean).join(' · ')}{sermon && <> · from <Link to={`/sermons/${sermon.id}`}>{sermon.title}</Link></>}</p></div>
      <div className="dg-actions">{anyMissing && <button className="btn btn-primary" disabled={Object.values(working).some(Boolean) || !fields.passage.trim()} onClick={runMissing}><Sparkles size={16} aria-hidden="true" />Generate the missing documents</button>}<button className="btn btn-ghost" onClick={remove}>Delete</button></div></header>
    {error && <p role="alert" className="dg-error">{error}</p>}
    <div className="dg-layout">
      <aside className="dg-side">
        <section className="dg-card">
          <label className="dg-field">Title<input className="input" value={fields.title} maxLength={200} onChange={e => setFields(f => ({ ...f, title: e.target.value }))} /></label>
          <label className="dg-field">Passage<input className="input" value={fields.passage} maxLength={200} placeholder="1 Peter 2:13-17" onChange={e => setFields(f => ({ ...f, passage: e.target.value }))} /></label>
          <label className="dg-field">Meets<input className="input" type="date" value={fields.meeting_date} onChange={e => setFields(f => ({ ...f, meeting_date: e.target.value }))} /></label>
          <details className="dg-notes"><summary>Your notes for the drafts</summary><textarea className="input" rows={5} maxLength={20000} value={fields.notes} placeholder="Emphases, questions from last week, men’s situations to keep in mind…" onChange={e => setFields(f => ({ ...f, notes: e.target.value }))} /></details>
          {dirty && <button className="btn btn-secondary" onClick={saveFields}>Save details</button>}
        </section>
        <nav className="dg-card dg-docs" aria-label="Documents">{DGROUP_DOCS.map(d => { const st = docStatus(session, d.id); return <button key={d.id} type="button" className={`dg-doc ${openDoc === d.id ? 'is-open' : ''}`} aria-current={openDoc === d.id ? 'true' : undefined} onClick={() => { setOpenDoc(d.id); setEditing(false) }}><span><strong>{d.title}</strong><small>{d.sub}</small></span><StatusPill status={working[d.id] ? 'generating' : st} /></button> })}</nav>
      </aside>
      <section className="dg-card dg-main" aria-labelledby="doc-title">
        <div className="dg-doc-head"><h2 id="doc-title">{current.title}</h2>
          <div className="dg-actions">
            {doc?.markdown && !editing && <><button className="btn btn-ghost" onClick={() => { setDraft(doc.markdown); setEditing(true) }}>Edit</button>
              {openDoc === 'text' ? <button className="btn btn-ghost" onClick={() => { navigator.clipboard?.writeText(doc.markdown).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }) }}><Copy size={16} aria-hidden="true" />{copied ? 'Copied' : 'Copy'}</button> : <Link className="btn btn-ghost" to={`/dgroup/${session.id}/print/${openDoc}`}><Printer size={16} aria-hidden="true" />Print / PDF</Link>}
              <button className="btn btn-secondary" onClick={() => saveDoc({ status: status === 'ready' ? 'draft' : 'ready' })}><Check size={16} aria-hidden="true" />{status === 'ready' ? 'Mark as draft' : 'Mark ready'}</button></>}
            {!editing && <button className="btn btn-primary" disabled={working[openDoc] || status === 'generating' || !fields.passage.trim()} onClick={() => { if (doc?.markdown && !confirm(`Replace the current ${current.title.toLowerCase()} with a new draft?`)) return; void run(openDoc) }}>{doc?.markdown ? <RefreshCw size={16} aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />}{working[openDoc] || status === 'generating' ? 'Generating…' : doc?.markdown ? 'Regenerate' : 'Generate'}</button>}
          </div></div>
        {editing ? <div className="dg-editor"><textarea className="input" value={draft} onChange={e => setDraft(e.target.value)} aria-label={`Edit ${current.title}`} /><div className="dg-actions"><button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button><button className="btn btn-primary" onClick={async () => { if (await saveDoc({ markdown: draft })) setEditing(false) }}>Save</button></div><p className="dg-muted">Markdown: # heading, - list, **bold**, *italic*, &gt; quote.</p></div>
          : doc?.markdown ? <><Rendered markdown={doc.markdown} />{doc.truncated && <p className="dg-muted">This draft hit the length limit and may stop mid-section. Regenerate or edit the end.</p>}<p className="dg-muted dg-ai">AI-drafted from the passage{sermon ? ' and the sermon' : ''}. Check it against Scripture before you use it.</p></>
          : <p className="dg-muted">{fields.passage.trim() ? `Not drafted yet. Generate builds it from ${fields.passage}${sermon ? ` and “${sermon.title}”` : ''}; it takes about a minute.` : 'Add the passage first, then generate.'}</p>}
      </section>
    </div>
  </div>
}

function EsvText({ reference }) {
  const [state, setState] = useState({ status: 'loading' })
  useEffect(() => { let active = true; fetchEsvPassage(reference).then(r => { if (active) setState({ status: 'ok', text: r.text }) }).catch(() => { if (active) setState({ status: 'error' }) }); return () => { active = false } }, [reference])
  if (state.status === 'loading') return <p className="dg-muted">Loading {reference}…</p>
  if (state.status === 'error') return <p className="dg-muted">The ESV text for {reference} could not load. Reload to try again.</p>
  const parts = state.text.replace(/\s*\(ESV\)\s*$/, '').split(/\[(\d+)\]/)
  return <p className="dg-esv">{parts.map((part, i) => i % 2 ? <sup key={i}>{part}</sup> : <span key={i}>{part}</span>)}</p>
}

export function DGroupPrint() {
  const user = useAuth()
  const { id, doc: docId } = useParams()
  const [session, setSession] = useState(null)
  useEffect(() => { let active = true; supabase.from('dgroup_sessions').select('*').eq('id', id).eq('user_id', user.id).maybeSingle().then(({ data }) => { if (active) setSession(data || false) }); return () => { active = false } }, [id, user.id])
  const spec = DGROUP_DOCS.find(d => d.id === docId)
  if (session === null) return <p role="status">Loading…</p>
  const markdown = session?.docs?.[docId]?.markdown
  if (!session || !spec || !markdown) return <div className="page"><p>This document isn’t available.</p><Link to={`/dgroup/${id}`}>Back to the session</Link></div>
  const booklet = docId === 'booklet'
  return <div className={`dg-print ${booklet ? 'is-booklet' : ''}`}>
    {booklet && <style>{'@page { size: letter landscape; margin: 0.5in; }'}</style>}
    <div className="dg-print-bar"><Link to={`/dgroup/${id}`}><ArrowLeft size={16} aria-hidden="true" />Back</Link><span>Choose Print, then Save as PDF{booklet ? ', landscape' : ''}.</span><button className="btn btn-primary" onClick={() => window.print()}><Printer size={16} aria-hidden="true" />Print</button></div>
    <header className="dg-print-head"><div className="dg-print-kicker">Parkside Baptist Church · D-Group</div><h1>{booklet ? session.passage : spec.title}</h1><p>{[booklet ? 'Inductive study' : session.passage, session.meeting_date && longDate(session.meeting_date)].filter(Boolean).join(' · ')}</p></header>
    {booklet ? <>{bookletSections(markdown).map((s, i) => s.ref
      ? <section className="dg-print-pair" key={i}><div className="dg-print-text"><h2>{s.ref.replace(/-/g, '–')}</h2><EsvText reference={s.ref} /></div><div className="dg-print-questions"><Rendered markdown={s.markdown} className="dg-print-prose" /><div className="dg-lines" aria-hidden="true" /></div></section>
      : <section className="dg-print-wrap" key={i}>{s.heading && <h2>{s.heading}</h2>}<Rendered markdown={s.markdown} className="dg-print-prose" /></section>)}
      <p className="dg-copyright">Scripture quotations are from the ESV® Bible (The Holy Bible, English Standard Version®), © 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission. All rights reserved.</p></>
      : <Rendered markdown={markdown} className="dg-print-prose" />}
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
