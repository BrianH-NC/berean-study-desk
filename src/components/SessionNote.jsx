import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../App'
import { getEntry } from '../lib/entries'
import NoteWorkspaceEditor from './NoteWorkspaceEditor'
import '../screens/Notes.css'
export default function SessionNote({id,saveRef}){
  const user=useAuth(),[note,setNote]=useState(null),[loading,setLoading]=useState(true),[retry,setRetry]=useState(0)
  useEffect(()=>{let active=true;getEntry(id).then(row=>{if(active){setNote(row);setLoading(false)}});return()=>{active=false}},[id,retry])
  return <aside className="session-note" aria-label="Session note">{loading?<p>Opening note…</p>:note?<><NoteWorkspaceEditor key={note.id} note={note} userId={user.id} notes={[note]} books={[]} checks={[]} saveRef={saveRef} onSaved={setNote} onOpen={()=>{}} sessionMode/><Link to={`/notebook/${id}`} onClick={e=>{if(saveRef.current?.dirty()){e.preventDefault();saveRef.current.flush().then(()=>{window.location.assign(`/notebook/${id}`)}).catch(()=>{})}}}>Open full Notes workspace →</Link></>:<div className="card"><p>This note is unavailable or in Trash. Select another note or restore it from <Link to="/notebook/trash">Notes Trash</Link>.</p><button onClick={()=>setRetry(n=>n+1)}>Retry</button></div>}</aside>
}
