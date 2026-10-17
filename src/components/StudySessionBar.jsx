import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../App'
import { createEntry } from '../lib/entries'
import { topicRows } from '../lib/topics'
import { getStudySession, saveStudySession } from '../lib/studySessions'
import { sameSessionState } from '../lib/studySessionModel'
import '../screens/StudySessions.css'
export default function StudySessionBar({state,onRestore,onNote,onSermon,saveRef,onReady}){
  const user=useAuth(),[params,setParams]=useSearchParams(),id=params.get('session')
  const [row,setRow]=useState(null),[title,setTitle]=useState(''),[notes,setNotes]=useState([]),[sermons,setSermons]=useState([]),[busy,setBusy]=useState(false),[loading,setLoading]=useState(!!id),[error,setError]=useState(''),[optionsError,setOptionsError]=useState(''),[retry,setRetry]=useState(0)
  const callbacks=useRef({onRestore,onReady})
  useEffect(()=>{callbacks.current={onRestore,onReady}},[onRestore,onReady])
  const ownSave=useRef(null)
  useEffect(()=>{let active=true;Promise.all([topicRows('entries',user.id),topicRows('sermons',user.id)]).then(([n,s])=>{if(active){setNotes(n);setSermons(s);setOptionsError('')}}).catch(e=>{if(active)setOptionsError(e.message)});return()=>{active=false}},[user.id,retry])
  useEffect(()=>{
    if(id===ownSave.current)return
    let active=true;setError('');setRow(null);setLoading(!!id);callbacks.current.onReady(!id)
    if(!id){setTitle('');return}
    getStudySession(user.id,id).then(next=>{if(active){setRow(next);setTitle(next.title);callbacks.current.onRestore(next.state);setLoading(false);callbacks.current.onReady(true)}}).catch(e=>{if(active){setError(`Could not open this session: ${e.message}`);setLoading(false)}})
    return()=>{active=false}
  },[id,user.id,retry])
  const dirty=row&&(title!==row.title||!sameSessionState(state,row.state))
  useEffect(()=>{const unload=e=>{if(dirty){e.preventDefault();e.returnValue=''}};window.addEventListener('beforeunload',unload);return()=>window.removeEventListener('beforeunload',unload)},[dirty])
  async function save(){setBusy(true);setError('');try{await saveRef.current?.flush();const next=await saveStudySession(user.id,row,title||`${state.book} ${state.chapter} study`,state);setRow(next);setTitle(next.title);ownSave.current=next.id;const p=new URLSearchParams(params);p.set('session',next.id);p.delete('study');setParams(p,{replace:true})}catch(e){setError(e.message)}finally{setBusy(false)}}
  async function selectNote(noteId){try{await saveRef.current?.flush();onNote(noteId)}catch{setError('Save the current note before switching notes.')}}
  async function newNote(){setBusy(true);setError('');try{await saveRef.current?.flush();const next=await createEntry(user.id,{title:title||`${state.book} ${state.chapter} study`,body:'',ref:`${state.book} ${state.chapter}`,note_type:'bible_study',sermon_id:state.sermonId||null});setNotes(n=>[next,...n]);onNote(next.id)}catch(e){setError(e.message)}finally{setBusy(false)}}
  return <section className="card session-bar" aria-label="Study session"><header><h2>Study Session</h2><Link to="/study-sessions" onClick={e=>{if((dirty||saveRef.current?.dirty())&&!confirm('Leave this session? Unsaved session choices will be lost. Note edits are saved separately.'))e.preventDefault()}}>Saved sessions →</Link></header>{loading?<p>Opening saved study…</p>:<><div className="session-controls"><label>Session name<input className="input" maxLength={200} value={title} onChange={e=>setTitle(e.target.value)} placeholder={`${state.book} ${state.chapter} study`}/></label><label>Sermon<select className="input" value={state.sermonId||''} onChange={e=>onSermon(e.target.value)}><option value="">No sermon</option>{state.sermonId&&!sermons.some(s=>s.id===state.sermonId)&&<option value={state.sermonId}>Linked sermon (unavailable)</option>}{sermons.map(s=><option key={s.id} value={s.id}>{s.title||s.speaker||'Untitled sermon'}</option>)}</select></label><label>Study note<select className="input" value={state.noteId||''} onChange={e=>selectNote(e.target.value)}><option value="">Choose a note…</option>{state.noteId&&!notes.some(n=>n.id===state.noteId)&&<option value={state.noteId}>Linked note (unavailable)</option>}{notes.map(n=><option key={n.id} value={n.id}>{n.title||'Untitled note'}</option>)}</select></label><button className="btn btn-secondary" disabled={busy||!!(id&&!row)} onClick={newNote}>+ New note</button><button className="btn btn-primary" disabled={busy||!!(id&&!row)} onClick={save}>{busy?'Saving…':row?'Save session':'Save new session'}</button></div><small role="status">{row?(dirty?'Session choices changed — save to keep them.':'Session saved to your account.'):'Save to resume this study on any device.'} Notes save automatically.</small></>}{optionsError&&<p role="alert">Notes and sermons could not load. <button onClick={()=>setRetry(n=>n+1)}>Retry</button></p>}{error&&<p role="alert">{error} <button disabled={busy} onClick={()=>setRetry(n=>n+1)}>Reload session</button></p>}</section>
}
