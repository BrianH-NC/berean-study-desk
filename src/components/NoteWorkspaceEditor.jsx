import { useEffect, useRef, useState, useImperativeHandle } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getLinksFor, formatEntryNum } from '../lib/entries'
import { noteType, exportNote as downloadNote, safeNoteUrl } from '../lib/noteModel'
import { createNoteSaveQueue } from '../lib/noteSaveQueue'
import NoteContext from './NoteContext'
import NoteMenu from './NoteMenu'
import NoteRichEditor from './NoteRichEditor'
export default function NoteWorkspaceEditor({note,notes,userId,books,checks,onSaved,onOpen,onDuplicate,onDelete,saveRef}) {
  const location=useLocation(), navigate=useNavigate()
  const key=`bsd-note-draft:${userId}:${note.id}`
  const [draft,setDraft]=useState({...note,note_type:noteType(note)})
  const latest=useRef(draft), version=useRef(note.updated_at)
  const [status,setStatus]=useState('Saved'), [error,setError]=useState(''), [details,setDetails]=useState(false), [links,setLinks]=useState({seeAlso:[],referencedBy:[]})
  useEffect(()=>{if(new URLSearchParams(location.search).has('details'))setDetails('edit')},[location.search])
  const [savedAt,setSavedAt]=useState(note.updated_at)
  const [recovery,setRecovery]=useState(()=>{try{return JSON.parse(localStorage.getItem(key))}catch{return null}})
  const [queue]=useState(()=>createNoteSaveQueue(async value=>{
    const fields={page:value.page||null,title:value.title,body:value.body,rich_doc:value.rich_doc||null,ref:value.ref||null,tags:value.tags||[],note_type:value.note_type,shelf_book_id:value.shelf_book_id||null,doctrine_check_id:value.doctrine_check_id||null,resource_title:value.resource_title||null,resource_url:value.resource_url||null,updated_at:new Date().toISOString()}
    let query=supabase.from('entries').update(fields).eq('id',note.id).eq('user_id',userId)
    query=version.current?query.eq('updated_at',version.current):query.is('updated_at',null)
    const {data,error}=await query.select('updated_at').maybeSingle()
    if(error)throw error
    if(!data)throw new Error('This note changed elsewhere or is no longer available. Your draft is kept on this device. Copy it before reloading to compare versions.')
    version.current=data.updated_at;setSavedAt(data.updated_at)
    onSaved({...value,updated_at:data.updated_at})
    if(latest.current===value){try{localStorage.removeItem(key)}catch{/* Remains available for recovery. */}}
  },(next,err)=>{setStatus(next);setError(err?.message||'')}))
  function change(fields) {
    const value={...latest.current,...fields};latest.current=value;setDraft(value)
    queue.push(value)
    try{localStorage.setItem(key,JSON.stringify(value))}catch{setError('Device backup is unavailable. Keep this page open until Saved appears.')}
  }
  useImperativeHandle(saveRef,()=>({snapshot:()=>latest.current,flush:()=>queue.flush(),dirty:()=>queue.dirty}))
  useEffect(()=>{getLinksFor(note.id).then(setLinks).catch(()=>{});const unload=e=>{if(queue.dirty){e.preventDefault();e.returnValue=''}};window.addEventListener('beforeunload',unload);return()=>{window.removeEventListener('beforeunload',unload);queue.stop();queue.flush().catch(()=>{})}},[note.id])
  const book=books.find(b=>b.id===draft.shelf_book_id),check=checks.find(c=>c.id===draft.doctrine_check_id)
  function exportNote(){downloadNote(latest.current)}
  async function go(url){try{await queue.flush();navigate(url)}catch{/* Save error stays visible. */}}
  async function duplicate(){try{await queue.flush();onDuplicate(latest.current)}catch{/* Save error stays visible. */}}
  return <><section className="notes-editor card"><header><button className="notes-back btn btn-ghost" onClick={()=>onOpen(null)}>← Notes</button><span className="card-meta">no. {formatEntryNum(note.number)}</span><span className="notes-save" role="status">{status}</span><button className="btn btn-ghost notes-details-toggle" onClick={()=>setDetails(!details)}>Details</button><NoteMenu label="Editor actions" actions={[{label:'Edit note details',run:()=>setDetails('edit')},{label:'Export as Markdown',run:exportNote},{label:'Duplicate note',run:duplicate},{label:'Delete note',danger:true,run:()=>onDelete(latest.current)}]}/></header>
    {recovery&&<div role="alert" className="notes-save-warning"><p>A local draft is available from an unfinished edit.</p><button onClick={()=>{change(recovery);setRecovery(null)}}>Restore draft</button><button onClick={()=>{localStorage.removeItem(key);setRecovery(null)}}>Use saved version</button></div>}
    {error&&<div role="alert" className="notes-save-warning">{error}<button onClick={()=>queue.flush().catch(()=>{})}>Retry save</button><button onClick={exportNote}>Export current draft</button></div>}
    <input className="notes-title-input" aria-label="Note title" value={draft.title||''} placeholder="Untitled note" onChange={e=>change({title:e.target.value})}/><div className="notes-source-line">{draft.ref}{book&&<span> · {book.title}</span>}{check&&<span> · {check.title||check.name}</span>}</div><div className="notes-tags">{(draft.tags||[]).map(tag=><span key={tag}>{tag}<button aria-label={`Remove tag ${tag}`} onClick={()=>change({tags:draft.tags.filter(t=>t!==tag)})}>×</button></span>)}</div>
    <NoteRichEditor key={recovery?'recovery-pending':note.id} note={draft} userId={userId} books={books} onChange={change}/>
    {!!draft.photos?.length&&<div className="notes-photos">{draft.photos.map(url=><a href={safeNoteUrl(url)||undefined} key={url} target="_blank" rel="noreferrer"><img src={safeNoteUrl(url)||undefined} alt="Attached note photograph"/></a>)}</div>}{draft.video_url&&safeNoteUrl(draft.video_url)&&<a href={draft.video_url} target="_blank" rel="noreferrer">Watch linked video →</a>}{draft.page&&<p className="card-meta">Book page {draft.page}</p>}{draft.stance&&<p className="card-meta">Stance: {draft.stance}</p>}
  </section><NoteContext draft={draft} note={note} notes={notes} books={books} checks={checks} links={links} version={savedAt} change={change} details={details} setDetails={setDetails} onOpen={onOpen} onNavigate={go} onExport={exportNote} onDuplicate={duplicate} onDelete={()=>onDelete(latest.current)}/></>
}
