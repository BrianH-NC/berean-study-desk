import { useEffect, useRef, useState, useImperativeHandle } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getLinksFor, formatEntryNum } from '../lib/entries'
import { NOTE_TYPES, noteType, noteMarkdown, safeNoteUrl } from '../lib/noteModel'
import { createNoteSaveQueue } from '../lib/noteSaveQueue'
import { parseReference } from '../lib/bsb'
import NoteRichEditor from './NoteRichEditor'
export default function NoteWorkspaceEditor({note,userId,books,checks,onSaved,onOpen,onDuplicate,onDelete,saveRef}) {
  const location=useLocation()
  useEffect(()=>{if(new URLSearchParams(location.search).has('details'))setDetails(true)},[location.search])
  const key=`bsd-note-draft:${userId}:${note.id}`
  const [draft,setDraft]=useState({...note,note_type:noteType(note)})
  const latest=useRef(draft), version=useRef(note.updated_at), queue=useRef(null)
  const [status,setStatus]=useState('Saved'), [error,setError]=useState(''), [details,setDetails]=useState(false), [links,setLinks]=useState({seeAlso:[],referencedBy:[]})
  const [recovery,setRecovery]=useState(()=>{try{return JSON.parse(localStorage.getItem(key))}catch{return null}})
  if(!queue.current)queue.current=createNoteSaveQueue(async value=>{
    const fields={title:value.title,body:value.body,rich_doc:value.rich_doc||null,ref:value.ref||null,tags:value.tags||[],note_type:value.note_type,shelf_book_id:value.shelf_book_id||null,doctrine_check_id:value.doctrine_check_id||null,resource_title:value.resource_title||null,resource_url:value.resource_url||null,updated_at:new Date().toISOString()}
    let query=supabase.from('entries').update(fields).eq('id',note.id).eq('user_id',userId)
    query=version.current?query.eq('updated_at',version.current):query.is('updated_at',null)
    const {data,error}=await query.select('updated_at').maybeSingle()
    if(error)throw error
    if(!data)throw new Error('This note changed elsewhere or is no longer available. Your draft is kept on this device. Copy it before reloading to compare versions.')
    version.current=data.updated_at
    onSaved({...value,updated_at:data.updated_at})
    if(latest.current===value){try{localStorage.removeItem(key)}catch{/* Remains available for recovery. */}}
  },(next,err)=>{setStatus(next);setError(err?.message||'')})
  function change(fields) {
    const value={...latest.current,...fields};latest.current=value;setDraft(value)
    queue.current.push(value)
    try{localStorage.setItem(key,JSON.stringify(value))}catch{setError('Device backup is unavailable. Keep this page open until Saved appears.')}
  }
  useImperativeHandle(saveRef,()=>({flush:()=>queue.current.flush(),dirty:()=>queue.current.dirty}))
  useEffect(()=>{getLinksFor(note.id).then(setLinks).catch(()=>{});const unload=e=>{if(queue.current.dirty){e.preventDefault();e.returnValue=''}};window.addEventListener('beforeunload',unload);return()=>{window.removeEventListener('beforeunload',unload);queue.current.stop();queue.current.flush().catch(()=>{})}},[note.id])
  const book=books.find(b=>b.id===draft.shelf_book_id),check=checks.find(c=>c.id===draft.doctrine_check_id)
  const ref=parseReference((draft.ref||'').replace(/[–—]/g,'-'))
  const bible=ref?`/bible?book=${encodeURIComponent(ref.book)}&chapter=${ref.chapter}${ref.verseStart?`&verse=${ref.verseStart}&verseEnd=${ref.verseEnd||ref.verseStart}`:''}`:null
  function exportNote() {const blob=new Blob([noteMarkdown(latest.current)],{type:'text/markdown;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`note-${formatEntryNum(note.number)}.md`;a.click();URL.revokeObjectURL(url)}
  return <><section className="notes-editor card"><header><button className="notes-back btn btn-ghost" onClick={()=>onOpen(null)}>← Notes</button><span className="card-meta">no. {formatEntryNum(note.number)}</span><span className="notes-save" role="status">{status}</span><button className="btn btn-ghost notes-details-toggle" onClick={()=>setDetails(!details)}>Details</button></header>
    {recovery&&<div role="alert" className="notes-save-warning"><p>A local draft is available from an unfinished edit.</p><button onClick={()=>{change(recovery);setRecovery(null)}}>Restore draft</button><button onClick={()=>{localStorage.removeItem(key);setRecovery(null)}}>Use saved version</button></div>}
    {error&&<div role="alert" className="notes-save-warning">{error}<button onClick={()=>queue.current.flush().catch(()=>{})}>Retry save</button><button onClick={exportNote}>Export current draft</button></div>}
    <input className="notes-title-input" aria-label="Note title" value={draft.title||''} placeholder="Untitled note" onChange={e=>change({title:e.target.value})}/><div className="notes-source-line">{draft.ref}{book&&<span> · {book.title}</span>}{check&&<span> · {check.title||check.name}</span>}</div><div className="notes-tags">{(draft.tags||[]).map(tag=><span key={tag}>{tag}<button aria-label={`Remove tag ${tag}`} onClick={()=>change({tags:draft.tags.filter(t=>t!==tag)})}>×</button></span>)}</div>
    <NoteRichEditor key={recovery?'recovery-pending':note.id} note={draft} userId={userId} onChange={change}/>
    {!!draft.photos?.length&&<div className="notes-photos">{draft.photos.map(url=><a href={safeNoteUrl(url)||undefined} key={url} target="_blank" rel="noreferrer"><img src={safeNoteUrl(url)||undefined} alt="Attached note photograph"/></a>)}</div>}{draft.video_url&&safeNoteUrl(draft.video_url)&&<a href={draft.video_url} target="_blank" rel="noreferrer">Watch linked video →</a>}{draft.page&&<p className="card-meta">Book page {draft.page}</p>}{draft.stance&&<p className="card-meta">Stance: {draft.stance}</p>}
  </section><aside className={`notes-context ${details?'is-open':''}`}><section className="card"><header><h2>Note Details</h2><button className="notes-details-toggle" onClick={()=>setDetails(false)}>Close</button></header>
    <label>Note type<select className="input" value={draft.note_type} onChange={e=>change({note_type:e.target.value})}>{Object.entries(NOTE_TYPES).map(([id,label])=><option value={id} key={id}>{label}</option>)}</select></label>
    <label>Linked Scripture<input className="input" placeholder="e.g. John 1:1–5" value={draft.ref||''} onChange={e=>change({ref:e.target.value})}/></label>{draft.ref&&!ref&&<small>Enter a Bible passage to enable Bible Study links.</small>}
    <label>Related Book<select className="input" value={draft.shelf_book_id||''} onChange={e=>change({shelf_book_id:e.target.value})}><option value="">None</option>{draft.shelf_book_id&&!book&&<option value={draft.shelf_book_id}>Book unavailable</option>}{books.map(b=><option key={b.id} value={b.id}>{b.title}</option>)}</select></label>
    <label>Related Doctrine Check<select className="input" value={draft.doctrine_check_id||''} onChange={e=>change({doctrine_check_id:e.target.value})}><option value="">None</option>{draft.doctrine_check_id&&!check&&<option value={draft.doctrine_check_id}>Assessment unavailable</option>}{checks.map(c=><option key={c.id} value={c.id}>{c.title||c.name}</option>)}</select></label>
    <label>Resource title<input className="input" value={draft.resource_title||''} onChange={e=>change({resource_title:e.target.value})}/></label><label>Resource URL<input className="input" type="url" value={draft.resource_url||''} onChange={e=>change({resource_url:e.target.value})}/></label>
    <label>Add tag<input className="input" placeholder="Type a tag and press Enter" onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();const tag=e.target.value.trim();if(tag)change({tags:[...new Set([...(draft.tags||[]),tag])]});e.target.value=''}}}/></label>
    <small>Created {new Date(note.created_at).toLocaleString()}</small><small>Last updated {new Date(version.current||note.created_at).toLocaleString()}</small>
  </section><section className="card"><h2>Related Actions</h2>{bible&&<><Link to={bible}>Open in Bible Study →</Link><Link to={`/search?q=${encodeURIComponent(draft.ref)}`}>Search this passage →</Link></>}{book&&<Link to={`/shelf/${book.id}?tab=notes`}>Open linked book →</Link>}{check&&<Link to={`/checks/${check.id}`}>View Doctrine Check →</Link>}{safeNoteUrl(draft.resource_url)&&<a href={draft.resource_url} target="_blank" rel="noreferrer">Open resource ↗</a>}<button onClick={exportNote}>Export as Markdown</button><button onClick={async()=>{try{await queue.current.flush();onDuplicate(latest.current)}catch{/* Save error remains visible. */}}}>Duplicate note</button><Link to={`/notebook/${note.id}/advanced`}>Advanced tools: photos, numbering, related notes →</Link><button className="notes-delete" onClick={()=>onDelete(note)}>Delete note</button></section>
  <section className="card"><h2>Related Notes</h2>{[...links.seeAlso,...links.referencedBy].filter((v,i,arr)=>arr.findIndex(n=>n.id===v.id)===i).map(n=><button key={n.id} onClick={()=>onOpen(n.id)}>{n.title||'Untitled'}</button>)}{!links.seeAlso.length&&!links.referencedBy.length&&<p>Use Advanced tools to link related notes.</p>}</section></aside></>
}
