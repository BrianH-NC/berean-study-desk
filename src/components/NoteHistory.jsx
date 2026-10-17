import { useEffect, useRef, useState } from 'react'
import { listRevisions, restoreRevision } from '../lib/noteHistory'
import '../screens/StudySessions.css'

export default function NoteHistory({ entryId, getNote, onRestored, onClose }) {
  const dialog=useRef(null)
  const [rows,setRows]=useState([]),[selected,setSelected]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(true),[more,setMore]=useState(false)
  async function load(offset=0) {
    setBusy(true);setError('')
    try { const next=await listRevisions(getNote().id,offset);setRows(old=>offset?[...old,...next]:next);setMore(next.length===30) }
    catch(err){setError(err.message)}finally{setBusy(false)}
  }
  useEffect(()=>{let active=true;dialog.current.showModal();listRevisions(entryId).then(next=>{if(active){setRows(next);setMore(next.length===30)}}).catch(err=>{if(active)setError(err.message)}).finally(()=>{if(active)setBusy(false)});return()=>{active=false}},[entryId])
  async function restore() {
    setBusy(true);setError('')
    try{onRestored(await restoreRevision(getNote(),selected));onClose()}catch(err){setError(err.message);setBusy(false)}
  }
  return <dialog ref={dialog} className="study-dialog" aria-labelledby="history-title" onCancel={e=>{if(busy)e.preventDefault();else onClose()}}>
    <header><h2 id="history-title">Note history</h2><button className="btn btn-secondary" disabled={busy} onClick={onClose}>Close</button></header>
    <p>Previous saved versions. Restoring brings back the text, formatting, and saved details; your note number and manual links stay unchanged.</p>
    {error&&<p role="alert">{error} <button disabled={busy} onClick={()=>load()}>Retry</button></p>}
    <div className="history-layout"><nav aria-label="Previous note versions">{rows.map(row=><button key={row.id} aria-pressed={selected?.id===row.id} onClick={()=>setSelected(row)}><strong>{new Date(row.saved_at).toLocaleString()}</strong><span>{row.snapshot.title||'Untitled note'}</span>{row.snapshot.deleted_at&&<small>In Trash</small>}</button>)}{!rows.length&&!busy&&!error&&<p>No previous versions yet. History begins with edits made after this feature was added.</p>}{more&&<button disabled={busy} onClick={()=>load(rows.length)}>Load older versions</button>}{busy&&<p role="status">Loading…</p>}</nav>
    <section>{selected?<><h3>{selected.snapshot.title||'Untitled note'}</h3><p>{selected.snapshot.ref} · {(selected.snapshot.tags||[]).join(', ')}</p><p className="history-preview">{selected.snapshot.body||'(Empty note)'}</p><button className="btn btn-primary" disabled={busy} onClick={restore}>Restore this version</button></>:<p>Select a version to preview its text. Rich formatting is preserved when restored.</p>}</section></div>
  </dialog>
}
