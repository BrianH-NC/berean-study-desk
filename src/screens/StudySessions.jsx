import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../App'
import { listStudySessions, deleteStudySession } from '../lib/studySessions'
import './StudySessions.css'
export default function StudySessions(){
  const user=useAuth(),[rows,setRows]=useState(null),[error,setError]=useState(''),[query,setQuery]=useState(''),[busy,setBusy]=useState(false)
  async function load(){setError('');try{setRows(await listStudySessions(user.id))}catch(e){setError(e.message)}}
  useEffect(()=>{let active=true;listStudySessions(user.id).then(data=>{if(active)setRows(data)}).catch(err=>{if(active)setError(err.message)});return()=>{active=false}},[user.id])
  async function remove(row){if(!confirm(`Delete the saved session “${row.title}”? Its notes and sermon will be kept.`))return;setBusy(true);try{await deleteStudySession(user.id,row.id);setRows(old=>old.filter(s=>s.id!==row.id))}catch(e){setError(e.message)}finally{setBusy(false)}}
  const filtered=(rows||[]).filter(row=>`${row.title} ${row.state.book} ${row.state.chapter}`.toLowerCase().includes(query.toLowerCase()))
  return <div className="page study-sessions"><header><div><h1>Study Sessions</h1><p>Return to your passage, sermon, commentary, and notes.</p></div><Link className="btn btn-primary" to="/bible?study=new">+ New Study Session</Link></header><input className="input" type="search" aria-label="Search study sessions" placeholder="Find a study session…" value={query} onChange={e=>setQuery(e.target.value)}/>{error&&<p role="alert">{error} <button onClick={load}>Retry</button></p>}{rows===null&&!error?<p>Loading sessions…</p>:<div className="session-list">{filtered.map(row=><article className="card" key={row.id}><h2>{row.title}</h2><p>{row.state.book} {row.state.chapter}{row.state.verseRange?`:${row.state.verseRange.start}–${row.state.verseRange.end}`:''} · {row.state.translation}</p><small>Saved {new Date(row.updated_at).toLocaleString()}</small><div className="session-actions"><Link className="btn btn-primary" to={`/bible?session=${row.id}`}>Resume study</Link><button disabled={busy} className="btn btn-ghost" onClick={()=>remove(row)}>Delete session</button></div></article>)}</div>}{rows&&!filtered.length&&<p>{rows.length?'No matching sessions.':'Save a session from Bible Study to return to it here.'}</p>}</div>
}
