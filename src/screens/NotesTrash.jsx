import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../App'
import AccountLink from '../components/AccountLink'
import { listTrash, restoreTrashedNote } from '../lib/noteHistory'
import './StudySessions.css'
export default function NotesTrash(){
  const user=useAuth(),[rows,setRows]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(''),[restored,setRestored]=useState(null)
  async function load(){setError('');try{setRows(await listTrash(user.id))}catch(err){setError(err.message)}}
  useEffect(()=>{let active=true;listTrash(user.id).then(data=>{if(active)setRows(data)}).catch(err=>{if(active)setError(err.message)});return()=>{active=false}},[user.id])
  async function restore(row){setBusy(row.id);setError('');try{await restoreTrashedNote(row.id);setRows(old=>old.filter(n=>n.id!==row.id));setRestored(row)}catch(err){setError(err.message)}finally{setBusy('')}}
  return <div className="page study-sessions"><header><div><h1>Notes Trash</h1><p>Recover your notes, including their formatting and links. Nothing is automatically purged.</p></div><AccountLink user={user}/></header><Link className="btn btn-secondary" to="/notebook">← My Notes</Link>{error&&<p role="alert">{error} <button onClick={load}>Retry</button></p>}{restored&&<p role="status">Restored “{restored.title}”. <Link to={`/notebook/${restored.id}`}>Open note →</Link></p>}{rows===null&&!error?<p>Loading Trash…</p>:rows?.length?<div className="session-list">{rows.map(row=><article className="card" key={row.id}><h2>{row.title||'Untitled note'}</h2><p>{row.ref}</p><p>Moved to Trash {new Date(row.deleted_at).toLocaleString()}</p><p>{row.body?.slice(0,180)}</p><button className="btn btn-primary" disabled={!!busy} onClick={()=>restore(row)}>{busy===row.id?'Restoring…':'Restore note'}</button></article>)}</div>:!error&&<p>Your Trash is empty.</p>}</div>
}
