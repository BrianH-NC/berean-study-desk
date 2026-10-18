import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../App'
import { ownedRows } from '../lib/dailyStudyData'
import { overlaps } from '../lib/dailyStudyModel'
import { findReferences } from '../lib/scriptureTagger'
import NoteWorkspaceEditor from './NoteWorkspaceEditor'
import '../screens/Notes.css'
import '../screens/DailyStudy.css'

export function usePassageConnections(userId,book,chapter,verseRange){
  const [data,setData]=useState({}),[errors,setErrors]=useState([]),[loading,setLoading]=useState(true),[retry,setRetry]=useState(0)
  useEffect(()=>{let active=true;const tables=['entries','sermons','study_sessions','books'];Promise.allSettled(tables.map(t=>ownedRows(t,userId,t==='sermons'?'id,title,speaker,primary_ref,detected_refs':t==='books'?'id,title,author,tags':'*'))).then(results=>{if(!active)return;setData(Object.fromEntries(results.map((r,i)=>[tables[i],r.status==='fulfilled'?r.value:[]])));setErrors(results.flatMap((r,i)=>r.status==='rejected'?[tables[i]]:[]));setLoading(false)});return()=>{active=false}},[userId,retry])
  const parsedNotes=useMemo(()=>(data.entries||[]).map(note=>({note,refs:findReferences(note.ref||'')})),[data.entries])
  const passage={book,chapter,verseStart:verseRange?.start,verseEnd:verseRange?.end}
  const notes=parsedNotes.filter(n=>n.refs.some(r=>overlaps(r,passage))).map(n=>n.note)
  const sermons=(data.sermons||[]).filter(s=>[s.primary_ref,...(s.detected_refs||[])].some(r=>overlaps(r,passage)))
  const sessions=(data.study_sessions||[]).filter(s=>overlaps({...s.state,verseStart:s.state?.verseRange?.start,verseEnd:s.state?.verseRange?.end},passage))
  const linkedBooks=new Set(notes.map(n=>n.shelf_book_id).filter(Boolean))
  const books=(data.books||[]).filter(b=>linkedBooks.has(b.id)||b.tags?.some(tag=>tag.toLowerCase()===book.toLowerCase()))
  const notesAtVerse=verse=>parsedNotes.filter(n=>n.refs.some(r=>r.verseStart&&overlaps(r,{book,chapter,verseStart:verse,verseEnd:verse}))).map(n=>n.note)
  return {notes,sermons,sessions,books,allBooks:data.books||[],notesAtVerse,loading,errors,reload:()=>{setLoading(true);setRetry(n=>n+1)}}
}
export default function PassageConnections({connections,passageRef,onOpen}){
  const {notes,sermons,sessions,books,loading,errors,reload}=connections
  return <section className="card passage-connections"><header><h2>Connected to {passageRef}</h2><button className="btn btn-ghost" onClick={reload}>Refresh connections</button></header>{loading?<p role="status">Finding your passage material…</p>:<>{errors.length>0&&<p role="alert">Some material could not load ({errors.join(', ')}). <button onClick={reload}>Retry</button></p>}<div className="passage-connection-grid"><section><h3>Notes ({notes.length})</h3>{notes.length?<ul>{notes.map(n=><li key={n.id}><button onClick={()=>onOpen(n)}>{n.title||'Untitled note'}</button><small className="block">{n.ref}</small></li>)}</ul>:<p>No linked notes.</p>}<Link to="/notebook/new" state={{ref:passageRef,note_type:'scripture'}}>Add a passage note →</Link></section><section><h3>Sermons ({sermons.length})</h3>{sermons.length?<ul>{sermons.map(s=><li key={s.id}><Link to={`/sermons/${s.id}`}>{s.title||'Untitled sermon'}</Link><small className="block">{s.speaker}</small></li>)}</ul>:<p>No sermons reference this passage.</p>}</section><section><h3>Study sessions ({sessions.length})</h3>{sessions.length?<ul>{sessions.map(s=><li key={s.id}><Link to={`/bible?session=${s.id}`}>{s.title}</Link></li>)}</ul>:<p>No saved sessions for this passage.</p>}</section><section><h3>Library resources ({books.length})</h3><p className="bible-muted">Linked through your notes or tagged with this Bible book.</p>{books.length?<ul>{books.map(b=><li key={b.id}><Link to={`/shelf/${b.id}`}>{b.title}</Link></li>)}</ul>:<p>No linked books yet.</p>}</section></div></>}</section>
}
export function PassageNoteDialog({note,onClose,onSaved,books}){
  const user=useAuth(),dialog=useRef(null),saveRef=useRef(null),[busy,setBusy]=useState(false),[error,setError]=useState('')
  useEffect(()=>{dialog.current.showModal()},[])
  async function close(){setBusy(true);try{await saveRef.current?.flush();dialog.current.close();onClose()}catch(e){setError(e.message)}finally{setBusy(false)}}
  return <dialog ref={dialog} className="passage-note-dialog" aria-label="Edit verse note" onCancel={e=>{e.preventDefault();void close()}}><header><h2>Verse note</h2><button className="btn btn-secondary" disabled={busy} onClick={close}>Save &amp; return to passage</button></header>{error&&<p role="alert">{error}</p>}<NoteWorkspaceEditor note={note} userId={user.id} notes={[note]} books={books} checks={[]} onSaved={onSaved} onOpen={()=>{}} saveRef={saveRef} sessionMode/></dialog>
}
