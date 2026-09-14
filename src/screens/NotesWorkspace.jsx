import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../App'
import { listEntries, createEntry, deleteEntry, formatEntryNum } from '../lib/entries'
import { loadCheckLibrary } from '../lib/checkLibrary'
import { checksList } from '../lib/theologyCheck'
import { NOTE_TYPES, noteType } from '../lib/noteModel'
import NoteWorkspaceEditor from '../components/NoteWorkspaceEditor'
import './Notes.css'
export default function NotesWorkspace() {
  const user=useAuth(), {id}=useParams(), navigate=useNavigate(), location=useLocation()
  const [notes,setNotes]=useState(null),[books,setBooks]=useState([]),[checks,setChecks]=useState([]),[error,setError]=useState(''),[contextError,setContextError]=useState('')
  const [query,setQuery]=useState(''),[type,setType]=useState(''),[tag,setTag]=useState(''),[sort,setSort]=useState('updated'),[creating,setCreating]=useState(false),[newType,setNewType]=useState('standalone'),[menu,setMenu]=useState(null)
  const saveRef=useRef(null)
  const isNew=location.pathname==='/notebook/new'
  async function load(){setError('');try{setNotes(await listEntries(user.id))}catch(err){setError(err.message)}}
  useEffect(()=>{load();Promise.all([loadCheckLibrary(user.id),checksList()]).then(([b,c])=>{setBooks(b);setChecks(c.data||[])}).catch(()=>setContextError('Linked book or assessment names could not be loaded. Existing links are preserved.'))},[user.id])
  async function open(next,details=false) {try{await saveRef.current?.flush();navigate(next?`/notebook/${next}${details?'?details=1':''}`:'/notebook')}catch{setError('The current note has unsaved changes. Retry saving before switching notes.')}}
  async function makeNote(source) {
    if(creating)return
    setCreating(true);setError('')
    try {
      await saveRef.current?.flush()
      const prefill=source || (isNew?location.state:null) || {}
      const row=await createEntry(user.id,{title:prefill.title||'Untitled note',body:prefill.body||'',rich_doc:prefill.rich_doc||null,ref:prefill.ref||null,tags:prefill.tags||[],note_type:prefill.note_type || (prefill.shelf_book_id?'book':prefill.doctrine_check_id?'doctrine_check':prefill.ref?'scripture':newType),shelf_book_id:prefill.shelf_book_id||null,doctrine_check_id:prefill.doctrine_check_id||null,resource_title:prefill.resource_title||null,resource_url:prefill.resource_url||null,photos:prefill.photos||[],page:prefill.page||null,video_url:prefill.video_url||null,stance:prefill.stance||null})
      setNotes(current=>[...(current||[]),row]);navigate(`/notebook/${row.id}`,{replace:isNew})
    }catch(err){setError(err.message)}finally{setCreating(false)}
  }
  async function remove(note) {
    if(!window.confirm(`Delete “${note.title||'Untitled'}”? This cannot be undone.`))return
    try{await saveRef.current?.flush();await deleteEntry(note.id);localStorage.removeItem(`bsd-note-draft:${user.id}:${note.id}`);setNotes(current=>current.filter(n=>n.id!==note.id));if(id===note.id)navigate('/notebook')}catch(err){setError(err.message)}
  }
  const selected=notes?.find(n=>n.id===id)
  const tags=[...new Set((notes||[]).flatMap(n=>n.tags||[]))].sort()
  const filtered=(notes||[]).filter(n=>{
    const book=books.find(b=>b.id===n.shelf_book_id),check=checks.find(c=>c.id===n.doctrine_check_id)
    return (!new URLSearchParams(location.search).get('doctrine') || n.doctrine_check_id===new URLSearchParams(location.search).get('doctrine')) && (!type||noteType(n)===type)&&(!tag||n.tags?.includes(tag))&&(!query.trim()||[n.title,n.body,n.ref,...(n.tags||[]),book?.title,book?.author,check?.title,check?.name,n.resource_title].join(' ').toLowerCase().includes(query.trim().toLowerCase()))
  }).sort((a,b)=>sort==='title'?(a.title||'').localeCompare(b.title||''):new Date(sort==='created'?b.created_at:b.updated_at||b.created_at)-new Date(sort==='created'?a.created_at:a.updated_at||a.created_at))
  return <div className={`page notes-workspace ${id?'has-selection':''}`}><div className="notes-topbar"><span>Search. Study. Discern.</span><blockquote>“Let the word of Christ dwell in you richly…”<cite>Colossians 3:16</cite></blockquote></div>{contextError&&<p role="status">{contextError}</p>}{error&&<p role="alert">{error} <button onClick={load}>Reload notes</button></p>}
    <div className="notes-layout"><aside className="notes-browser"><header><div><h1>My Notes</h1><p>Capture. Connect. Grow.</p></div><button className="btn btn-primary" disabled={creating||notes===null} onClick={()=>makeNote()}>{creating?'Creating…':'+ New Note'}</button></header><label className="notes-new-type">New note type<select value={newType} onChange={e=>setNewType(e.target.value)}>{Object.entries(NOTE_TYPES).map(([key,label])=><option value={key} key={key}>{label}</option>)}</select></label>
    <input className="input" aria-label="Search notes" placeholder="Search notes, titles, tags, references…" value={query} onChange={e=>setQuery(e.target.value)}/><nav className="notes-type-tabs" aria-label="Filter by note type">{[['','All Notes'],...Object.entries(NOTE_TYPES)].map(([value,label])=><button key={value} aria-pressed={type===value} onClick={()=>setType(value)}>{label} ({(notes||[]).filter(n=>!value||noteType(n)===value).length})</button>)}</nav><div className="notes-list-filters"><select aria-label="Sort notes" value={sort} onChange={e=>setSort(e.target.value)}><option value="updated">Recently Updated</option><option value="created">Recently Created</option><option value="title">Title</option></select><select aria-label="Filter notes by tag" value={tag} onChange={e=>setTag(e.target.value)}><option value="">All tags</option>{tags.map(t=><option key={t}>{t}</option>)}</select></div>
    {notes===null?<div role="status" className="notes-skeleton">Loading notes…</div>:!notes.length?<div className="notes-empty"><h2>Your study notes will appear here.</h2><p>Capture observations from Scripture, books, Doctrine Check, and your study.</p></div>:!filtered.length?<div className="notes-empty"><h2>No notes match this search.</h2><button onClick={()=>{setQuery('');setType('');setTag('')}}>Clear search and filters</button></div>:<div className="notes-list">{filtered.map(n=><article className={n.id===id?'selected':''} key={n.id}><button className="notes-row-open" onClick={()=>open(n.id)}><strong>{n.title||'Untitled'}</strong><span>{n.ref||books.find(b=>b.id===n.shelf_book_id)?.title||n.resource_title||NOTE_TYPES[noteType(n)]}</span><div className="notes-row-tags"><span>{NOTE_TYPES[noteType(n)]}</span>{(n.tags||[]).slice(0,2).map(t=><span key={t}>{t}</span>)}</div><small>no. {formatEntryNum(n.number)} · {new Date(n.updated_at||n.created_at).toLocaleDateString()}</small></button><div className="notes-row-menu"><button aria-label={`Actions for ${n.title||'Untitled'}`} aria-expanded={menu===n.id} onClick={()=>setMenu(menu===n.id?null:n.id)}>⋮</button>{menu===n.id&&<div><button onClick={()=>{setMenu(null);open(n.id)}}>Open / edit details</button>{['Change Note Type','Manage Tags','Link Scripture / Book / Doctrine / Resource'].map(label=><button key={label} onClick={()=>{setMenu(null);open(n.id,true)}}>{label}</button>)}<button onClick={()=>{setMenu(null);makeNote({...n,title:`${n.title||'Untitled'} (copy)`})}}>Duplicate</button><button onClick={()=>{setMenu(null);remove(n)}}>Delete Note</button></div>}</div></article>)}</div>}</aside>
    {isNew?<section className="notes-editor card"><h2>New study note</h2><p>{location.state?.ref?`Linked Scripture: ${location.state.ref}`:'Choose a note type, then create your note.'}</p><button className="btn btn-primary" disabled={creating||notes===null} onClick={()=>makeNote()}>Create note</button></section>:selected?<NoteWorkspaceEditor key={selected.id} note={selected} userId={user.id} books={books} checks={checks} saveRef={saveRef} onSaved={row=>setNotes(current=>current.map(n=>n.id===row.id?row:n))} onOpen={open} onDuplicate={n=>makeNote({...n,title:`${n.title||'Untitled'} (copy)`})} onDelete={remove}/>:<section className="notes-editor notes-empty card"><h2>{id?'Note unavailable':'Your study desk'}</h2><p>{id?'This note could not be found in your account.':'Select a note to read, edit, and explore its connections.'}</p><button className="notes-back btn btn-secondary" onClick={()=>open(null)}>Back to Notes</button></section>}
    </div></div>
}
