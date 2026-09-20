import { useEffect, useRef, useState } from 'react'
import { plainDocument } from '../lib/noteModel'
import { uploadEntryPhoto } from '../lib/entryPhotos'
import './NoteScan.css'

export default function NoteScan({ editor, userId, books = [], note, onChange }) {
  const dialog = useRef(null), worker = useRef(null), generation = useRef(0), mounted = useRef(true)
  const [inserting,setInserting]=useState(false)
  const [file,setFile]=useState(null),[preview,setPreview]=useState(''),[text,setText]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[keep,setKeep]=useState(false),[book,setBook]=useState(note.shelf_book_id||''),[page,setPage]=useState(note.page||'')
  useEffect(()=>{if(!file){setPreview('');return}const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url)},[file])
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;generation.current++;worker.current?.terminate();worker.current=null}},[])
  function cancel(){generation.current++;worker.current?.terminate();worker.current=null;setBusy(false);setStatus('');dialog.current.close()}
  async function scan(){
    const id=++generation.current
    setBusy(true);setError('');setStatus('Loading text scanner…')
    let engine
    try {
      const {createWorker}=await import('tesseract.js')
      if(id!==generation.current)return
      engine=await createWorker('eng',1,{logger:info=>{if(mounted.current&&id===generation.current)setStatus(`${info.status}${Number.isFinite(info.progress)?` · ${Math.round(info.progress*100)}%`:''}`)}})
      if(id!==generation.current){await engine.terminate();return}
      worker.current=engine
      const {data}=await engine.recognize(file)
      if(id!==generation.current)return
      setText(data.text.trim());setStatus(data.text.trim()?'Review the extracted text before adding it.':'No text found. Try a sharper, well-lit photograph.')
    } catch {if(mounted.current&&id===generation.current)setError('The scan could not finish. Check your connection and try a clear JPG, PNG, or WebP photograph.')}
    finally {if(engine)await engine.terminate().catch(()=>{});if(mounted.current&&id===generation.current){worker.current=null;setBusy(false)}}
  }
  async function insert(){
    setBusy(true);setInserting(true);setError('')
    try {
      const content=plainDocument(text).content
      if(keep){const src=await uploadEntryPhoto(userId,file);content.push({type:'image',attrs:{src,alt:'Scanned book page'}})}
      if(editor.isDestroyed)return
      editor.chain().focus('end').insertContentAt(editor.state.doc.content.size,content).run()
      onChange({shelf_book_id:book||null,page:page.trim()||null,...(book?{note_type:'book'}:{})})
      setText('');setFile(null);dialog.current.close()
    } catch(err){setError('Could not insert the scan: '+err.message)}
    finally{if(mounted.current){setBusy(false);setInserting(false)}}
  }
  function choose(event){const selected=event.target.files?.[0];event.target.value='';if(!selected)return;if(!['image/jpeg','image/png','image/webp'].includes(selected.type)||selected.size>15*1024*1024){setError('Choose a JPG, PNG, or WebP photograph under 15 MB.');return}setFile(selected);setText('');setError('');setStatus('Ready to scan.')}
  return <><button type="button" onClick={()=>{setBook(note.shelf_book_id||'');setPage(note.page||'');dialog.current.showModal()}}>Scan text</button><dialog ref={dialog} className="note-scan" aria-labelledby="note-scan-title" onCancel={event=>{event.preventDefault();if(!inserting)cancel()}}>
    <h2 id="note-scan-title">Scan a book page</h2><p>English text recognition runs on your device. Review the result, then add it to the end of this note. The first scan downloads the recognition files.</p>
    <div className="note-scan-inputs"><label>Upload a page<input disabled={busy} type="file" accept="image/jpeg,image/png,image/webp" onChange={choose}/></label><label>Take a photo<input disabled={busy} type="file" accept="image/*" capture="environment" onChange={choose}/></label></div>
    {preview&&<img className="note-scan-preview" src={preview} alt="Page to scan"/>}
    <button className="btn btn-secondary" disabled={!file||busy} onClick={scan}>{text?'Scan again':'Extract text'}</button>
    <p role="status">{status}</p>{error&&<p role="alert">{error}</p>}
    <label>Review and correct text<textarea rows={9} value={text} disabled={busy} onChange={event=>setText(event.target.value)} placeholder="Extracted text will appear here…"/></label>
    <div className="note-scan-inputs"><label>Link to a book<select disabled={busy} value={book} onChange={event=>setBook(event.target.value)}><option value="">No linked book</option>{books.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label>Page number<input disabled={busy} value={page} onChange={event=>setPage(event.target.value)} maxLength={40}/></label></div>
    <label className="note-scan-keep"><input type="checkbox" checked={keep} disabled={busy} onChange={event=>setKeep(event.target.checked)}/>Also attach the original photo using Notes image storage</label>
    <footer><button className="btn btn-primary" disabled={busy||!text.trim()} onClick={insert}>Add to note</button><button className="btn btn-secondary" disabled={inserting} onClick={cancel}>{busy?'Cancel scan':'Cancel'}</button></footer>
  </dialog></>
}
