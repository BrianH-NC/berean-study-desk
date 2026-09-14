import { useEffect, useRef, useState } from 'react'
import { BookOpen, Library, ShieldCheck, FileText, Tags } from 'lucide-react'
import { NOTE_TYPES, safeNoteUrl, relatedNotes, noteMarkdown } from '../lib/noteModel'
import { parseReference } from '../lib/bsb'
import { dailyHero } from '../lib/dailyHero'

export default function NoteContext({draft,note,notes,books,checks,links,version,change,details,setDetails,onOpen,onNavigate,onExport,onDuplicate,onDelete}) {
  const [editing,setEditing]=useState(details==='edit'),[tag,setTag]=useState(''),[all,setAll]=useState(false)
  const [message,setMessage]=useState('')
  const [wide,setWide]=useState(()=>window.matchMedia('(min-width:1351px)').matches)
  const dialog=useRef(null),related=useRef(null)
  useEffect(()=>{const media=window.matchMedia('(min-width:1351px)');const listener=()=>setWide(media.matches);media.addEventListener('change',listener);return()=>media.removeEventListener('change',listener)},[])
  useEffect(()=>{if(details==='edit')setEditing(true);if(!wide&&details)dialog.current?.showModal();else dialog.current?.close()},[details,wide])
  const book=books.find(b=>b.id===draft.shelf_book_id),check=checks.find(c=>c.id===draft.doctrine_check_id)
  const reference=parseReference((draft.ref||'').replace(/[–—]/g,'-'))
  const bible=reference?`/bible?book=${encodeURIComponent(reference.book)}&chapter=${reference.chapter}${reference.verseStart?`&verse=${reference.verseStart}&verseEnd=${reference.verseEnd||reference.verseStart}`:''}`:null
  const suggestions=relatedNotes(draft,notes,parseReference)
  const explicit=[...links.seeAlso,...links.referencedBy].filter((n,i,a)=>a.findIndex(x=>x.id===n.id)===i)
  const candidates=[...explicit.map(n=>({...n,reasons:['Linked note']})),...suggestions.filter(n=>!explicit.some(x=>x.id===n.id))]
  function addTag(e){e.preventDefault();if(tag.trim())change({tags:[...new Set([...(draft.tags||[]),tag.trim()])]});setTag('')}
  function field(Icon,label,value){return <div className="notes-detail-row"><Icon size={19}/><div><dt>{label}</dt><dd>{value||'None'}</dd></div></div>}
  const content=<>
    <section className="card"><header><h2>Note Details</h2><button onClick={()=>{setEditing(!editing);if(editing&&wide)setDetails(false)}}>{editing?'Done':'Edit →'}</button></header>
      {editing?<div className="notes-detail-fields">
        <label>Note type<select className="input" value={draft.note_type} onChange={e=>change({note_type:e.target.value})}>{Object.entries(NOTE_TYPES).map(([id,label])=><option value={id} key={id}>{label}</option>)}</select></label>
        <label>Linked Scripture<input className="input" placeholder="e.g. John 1:1–5" value={draft.ref||''} onChange={e=>change({ref:e.target.value})}/></label>{draft.ref&&!reference&&<small>Enter a Bible passage to enable Bible Study links.</small>}
        <label>Related Book<select className="input" value={draft.shelf_book_id||''} onChange={e=>change({shelf_book_id:e.target.value})}><option value="">None</option>{draft.shelf_book_id&&!book&&<option value={draft.shelf_book_id}>Book unavailable</option>}{books.map(b=><option key={b.id} value={b.id}>{b.title}</option>)}</select></label>
        <label>Related Doctrine Check<select className="input" value={draft.doctrine_check_id||''} onChange={e=>change({doctrine_check_id:e.target.value})}><option value="">None</option>{draft.doctrine_check_id&&!check&&<option value={draft.doctrine_check_id}>Assessment unavailable</option>}{checks.map(c=><option key={c.id} value={c.id}>{c.title||c.name}</option>)}</select></label>
        <label>Resource title<input className="input" value={draft.resource_title||''} onChange={e=>change({resource_title:e.target.value})}/></label>
        <label>Resource URL<input className="input" type="url" value={draft.resource_url||''} onChange={e=>change({resource_url:e.target.value})}/></label>
      </div>:<dl>
        {field(FileText,'Note Type',NOTE_TYPES[draft.note_type])}
        {field(BookOpen,'Linked Scripture',bible?<button onClick={()=>onNavigate(bible)}>{draft.ref}</button>:draft.ref)}
        {field(Library,'Related Book',book?<button onClick={()=>onNavigate(`/shelf/${book.id}`)}>{book.title}</button>:draft.shelf_book_id?'Book unavailable':null)}
        {field(ShieldCheck,'Related Doctrine Check',check?<button onClick={()=>onNavigate(`/checks/${check.id}`)}>{check.title||check.name}</button>:draft.doctrine_check_id?'Assessment unavailable':null)}
        {field(FileText,'Related Resource',draft.resource_title||draft.resource_url)}
      </dl>}
      <div className="notes-metadata-tags"><h3><Tags size={16}/> Tags</h3><div className="notes-tags">{(draft.tags||[]).map(t=><span key={t}>{t}<button aria-label={`Remove detail tag ${t}`} onClick={()=>change({tags:draft.tags.filter(x=>x!==t)})}>×</button></span>)}</div><form onSubmit={addTag}><input className="input" aria-label="Add tag" placeholder="Add a tag…" value={tag} onChange={e=>setTag(e.target.value)}/><button type="submit">Add</button></form></div>
      <dl className="notes-dates"><dt>Created</dt><dd>{new Date(note.created_at).toLocaleString()}</dd><dt>Last Updated</dt><dd>{new Date(version||note.created_at).toLocaleString()}</dd></dl>
    </section>
    <section className="card notes-related-actions"><h2>Related Actions</h2>
      {bible&&<><button onClick={()=>onNavigate(bible)}>Open in Bible Study →</button><button onClick={()=>onNavigate(`/search?q=${encodeURIComponent(draft.ref)}`)}>Search this passage →</button></>}
      {book&&<button onClick={()=>onNavigate(`/shelf/${book.id}?tab=notes`)}>Open linked book →</button>}
      {check&&<button onClick={()=>onNavigate(`/checks/${check.id}`)}>View Doctrine Check →</button>}
      {safeNoteUrl(draft.resource_url)&&<a href={draft.resource_url} target="_blank" rel="noreferrer">Open resource ↗</a>}
      <button onClick={()=>{setAll(true);related.current?.scrollIntoView({behavior:'smooth',block:'nearest'});related.current?.focus()}}>Find Related Notes ({candidates.length})</button>
      <button onClick={onExport}>Export as Markdown</button><button onClick={onDuplicate}>Duplicate note</button>
      {draft.ref&&<button onClick={async()=>{try{await navigator.clipboard.writeText(draft.ref);setMessage('Reference copied.')}catch{setMessage('Could not copy. Select the reference in Note Details to copy it.')}}}>Copy reference</button>}
      <button onClick={async()=>{try{await navigator.clipboard.writeText(noteMarkdown(draft));setMessage('Note copied as Markdown.')}catch{setMessage('Could not copy. Use Export as Markdown instead.')}}}>Copy as Markdown</button>
      <button onClick={async()=>{try{if(navigator.share){await navigator.share({title:draft.title||'Study note',text:noteMarkdown(draft)});setMessage('Share completed.')}else{await navigator.clipboard.writeText(noteMarkdown(draft));setMessage('Note copied, ready to share.')}}catch(error){if(error.name!=='AbortError')setMessage('Sharing is unavailable. Export as Markdown to share the note.')}}}>Share note</button>
      {message&&<p role="status" className="card-meta">{message}</p>}
      <button onClick={()=>onNavigate(`/notebook/${note.id}/advanced`)}>Photos, numbering & manual links →</button>
      <button className="notes-delete" onClick={onDelete}>Delete note</button>
    </section>
    <section className="card" ref={related} tabIndex={-1}><h2>Related Content</h2>
      {candidates.slice(0,all?candidates.length:4).map(n=><button className="notes-related-note" key={n.id} onClick={()=>onOpen(n.id)}><FileText size={18}/><span>{n.title||'Untitled'}<small>{n.reasons.join(' · ')}</small></span></button>)}
      {!candidates.length&&<p className="card-meta">No related notes yet. Shared passages, books, assessments, resources, or tags will connect notes here.</p>}
      {candidates.length>4&&!all&&<button onClick={()=>setAll(true)}>See all {candidates.length} notes →</button>}
      {book&&<button onClick={()=>onNavigate(`/shelf/${book.id}`)}>Book: {book.title}</button>}
      {check&&<button onClick={()=>onNavigate(`/checks/${check.id}`)}>Doctrine Check: {check.title||check.name}</button>}
    </section>
    <blockquote className="notes-image-quote" style={{backgroundImage:`linear-gradient(#0f3d2e33,#0f3d2ed9),url(${dailyHero()})`}}>“Your word is a lamp to my feet and a light to my path.”<cite>Psalm 119:105 · BSB</cite></blockquote>
  </>
  return wide?<aside className="notes-context" aria-label="Note context">{content}</aside>:<dialog ref={dialog} className="notes-context-dialog" aria-label="Note details and related content" onCancel={()=>setDetails(false)} onClose={()=>setDetails(false)}><header><h2>Note Details</h2><button autoFocus onClick={()=>setDetails(false)}>Close</button></header><div className="notes-context">{content}</div></dialog>
}
