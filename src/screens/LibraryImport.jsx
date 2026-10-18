import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../App'
import { supabase } from '../lib/supabase'
import { CLZ_FIELDS, blankPatch, isbnKey, matchCLZ, parseCSV, planCLZ } from '../lib/clzImport'
import { fillBookBlanks, loadImportBooks } from '../lib/clzImportData'
import './LibraryImport.css'

export default function LibraryImport(){
 const user=useAuth(),running=useRef(false)
 const [books,setBooks]=useState([]),[items,setItems]=useState([]),[fileName,setFileName]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[addNew,setAddNew]=useState(false),[report,setReport]=useState([]),[fields,setFields]=useState(Object.keys(CLZ_FIELDS))
 useEffect(()=>{const guard=e=>{if(running.current){e.preventDefault();e.returnValue=''}};window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard)},[])
 async function preview(file){
  if(!file)return
  setError('');setItems([]);setReport([]);setLoading(true);setFileName(file.name)
  try{if(file.size>10*1024*1024)throw Error('Choose a CSV smaller than 10 MB.');const rows=parseCSV(await file.text());const current=await loadImportBooks(user.id);setBooks(current);setItems(planCLZ(rows,current));setAddNew(false)}catch(e){setError(e.message)}finally{setLoading(false)}
 }
 const byId=Object.fromEntries(books.map(b=>[b.id,b]))
 const changes=item=>blankPatch(byId[item.choice]||{},item.book,fields)
 const selected=items.filter(i=>i.book.title&&i.choice!=='skip'&&(i.choice==='new'?addNew:Object.keys(changes(i)).length))
 function choose(index,choice){setItems(current=>current.map(i=>i.index===index?{...i,choice}:i))}
 async function apply(){
  if(running.current||!selected.length)return
  running.current=true;setBusy(true);setError('');const results=[];setReport([])
  try{
   let current=await loadImportBooks(user.id)
   for(const item of selected){
    try{
     let id=item.choice
     if(id==='new'){
      const existing=matchCLZ(item.book,current)
      const reviewedDifferentEdition=item.kind==='review'&&existing.kind==='review'&&existing.candidates.every(b=>item.candidates.some(c=>c.id===b.id))&&!existing.candidates.some(b=>isbnKey(b.isbn)&&isbnKey(b.isbn)===isbnKey(item.book.isbn))
      if(existing.kind!=='new'&&!reviewedDifferentEdition){results.push({index:item.index,title:item.book.title,status:'Skipped: a matching or similar book now exists. Preview again to review it.'});setReport([...results]);continue}
      // A stable ID makes a retry in this preview safe after a lost response.
      item.newId ||= crypto.randomUUID()
      const payload={...blankPatch({},item.book,fields),title:item.book.title,user_id:user.id,id:item.newId,reading_status:'unread'}
      const {data,error:insertError}=await supabase.from('books').insert(payload).select('*').single()
      if(insertError)throw insertError
      current.push(data);results.push({index:item.index,title:item.book.title,status:'Added to Library'})
     }else{
      const result=await fillBookBlanks(user.id,id,item.book,Object.keys(changes(item)))
      current=current.map(b=>b.id===id?result.book:b)
      results.push({index:item.index,title:item.book.title,status:result.fields.length?`Filled: ${result.fields.map(k=>CLZ_FIELDS[k]).join(', ')}`:'Unchanged: these fields already have values'})
     }
    }catch(e){results.push({index:item.index,title:item.book.title,status:`Not completed: ${e.message}`})}
    setReport([...results])
   }
   setBooks(current)
   // Require a fresh file preview before another run, including after partial failure.
   setItems([])
  }catch(e){setError(e.message)}finally{running.current=false;setBusy(false)}
 }
 return <div className="page clz-import"><Link to="/shelf" onClick={e=>{if(running.current)e.preventDefault()}}>← Library</Link><h1>Import from CLZ Books</h1><p>Review matches and fill missing Library metadata. Existing values, notes, reading progress, collections, and Doctrine Checks are preserved.</p>
  <ol className="import-steps" aria-label="Import progress">{["Choose file","Review matches","Import","Summary"].map((label,i)=><li key={label} aria-current={(busy?2:report.length?3:items.length?1:0)===i?"step":undefined}>{i+1}. {label}</li>)}</ol>
  <section className="card"><h2>1. Choose your export</h2><label>CLZ Books CSV<input className="input" type="file" accept=".csv,text/csv" disabled={busy||loading} onChange={e=>{preview(e.target.files?.[0]);e.target.value=''}}/></label><p className="card-meta">Supported columns: Title, Author, ISBN, Publisher, Publication Date, Pages, and Genre. Genre fills empty categories/tags. Format, Added Date, ratings, and other columns are not imported. Existing Date Added is preserved; newly added books use today’s date.</p><p className="card-meta">This export does not supply covers or descriptions. Use Find missing covers in the Library afterward.</p>{loading&&<p role="status">Reading the file and matching your Library…</p>}{error&&<p role="alert">{error}</p>}</section>
  {!!items.length&&<><section className="card"><h2>2. Review {items.length} books</h2><p>{fileName} · {items.filter(i=>['isbn','title-author'].includes(i.kind)&&!i.duplicate).length} matched · {items.filter(i=>i.kind==='review'&&!i.duplicate).length} need review · {items.filter(i=>i.kind==='new'&&!i.duplicate).length} new · {items.filter(i=>i.duplicate).length} duplicate rows</p><fieldset disabled={busy}><legend>Fields to fill when blank</legend><div className="clz-options">{Object.entries(CLZ_FIELDS).map(([key,label])=><label key={key}><input type="checkbox" checked={fields.includes(key)} onChange={e=>setFields(current=>e.target.checked?[...current,key]:current.filter(k=>k!==key))}/>{label}</label>)}</div><label><input type="checkbox" checked={addNew} onChange={e=>setAddNew(e.target.checked)}/> Also add unmatched books to my Library as To Read</label></fieldset><p>ISBN matches are selected automatically, including equivalent ISBN-10 and ISBN-13 editions. Title/author matches with a different ISBN require your review.</p></section>
  <div className="clz-rows">{items.map(item=><article className="card" key={item.index}><h3>{item.book.title||'Missing title'}</h3><p>{item.book.author} · {item.book.isbn||'No valid ISBN'}</p>{item.duplicate&&<p>Repeated row in this export; skipped by default.</p>}{item.warnings.map(w=><p key={w}>{w}</p>)}<label>Match / action<select className="input" disabled={busy||!item.book.title} value={item.choice} onChange={e=>choose(item.index,e.target.value)}><option value="skip">Skip this row</option><option value="new">Add as a new book {addNew?'':'(enable above)'}</option>{!!item.candidates.length&&<optgroup label="Suggested matches">{item.candidates.map(b=><option key={b.id} value={b.id}>{b.title} — {b.author} [{b.isbn||'No ISBN'}]</option>)}</optgroup>}<optgroup label="Other Library books">{books.filter(b=>!item.candidates.some(c=>c.id===b.id)).map(b=><option key={b.id} value={b.id}>{b.title} — {b.author} [{b.isbn||'No ISBN'}]</option>)}</optgroup></select></label>{item.choice!=='skip'&&<details><summary>{item.choice==='new'?'New book metadata':`${Object.keys(changes(item)).length} blank fields to fill`}</summary><dl>{Object.entries(changes(item)).map(([key,value])=><div key={key}><dt>{CLZ_FIELDS[key]}</dt><dd>{Array.isArray(value)?value.join('; '):String(value)}</dd></div>)}</dl>{item.choice!=='new'&&!Object.keys(changes(item)).length&&<p>No blank fields to update.</p>}</details>}</article>)}</div>
  <section className="card clz-apply"><h2>3. Import reviewed books</h2><p>{selected.length} selected books. Only the fields shown in the preview can be filled.</p><button className="btn btn-primary" disabled={busy||!selected.length} onClick={apply}>{busy?`Importing ${report.length} / ${selected.length}…`:`Import ${selected.length} books`}</button><p>Keep this page open until the import finishes. You can export a backup from the Library before importing.</p></section></>}
  {!!report.length&&<section className="card" aria-live="polite"><h2>{busy?'Import progress':'Import results'}</h2><ul>{report.map(r=><li key={r.index}><strong>{r.title}</strong> — {r.status}</li>)}</ul>{!busy&&<p>Re-select the CSV to preview again or retry incomplete rows. Filled fields will be preserved.</p>}</section>}
 </div>
}
