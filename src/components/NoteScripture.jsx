import { useRef, useState } from 'react'
import { fetchChapter, parseReference, formatReference } from '../lib/bsb'
import { scriptureDocument, scriptureUrl } from '../lib/noteScripture'

export default function NoteScripture({editor, note, onChange, currentPassage}) {
  const [open,setOpen]=useState(false),[input,setInput]=useState(''),[preview,setPreview]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('')
  const request=useRef(0),position=useRef(null)
  const refs=(note.ref||'').split(';').map(s=>s.trim()).filter(Boolean)
  function start(){position.current=editor.state.selection.to;setOpen(true);setMessage('')}
  async function lookup(value){
    const token=++request.current;setInput(value);setPreview(null);setError('');setMessage('');setBusy(false)
    const parsed=parseReference(value.replace(/[–—]/g,'-'))
    if(!parsed||parsed.chapter<1||parsed.verseStart===0||(parsed.verseEnd&&parsed.verseEnd<parsed.verseStart)){setError('Enter a passage such as Romans 8:28–30.');return}
    setBusy(true)
    try{
      const chapter=await fetchChapter(parsed.book,parsed.chapter)
      const verses=chapter.filter(v=>!parsed.verseStart||(v.verse>=parsed.verseStart&&v.verse<=parsed.verseEnd))
      if(!verses.length||(parsed.verseStart&&(!verses.some(v=>v.verse===parsed.verseStart)||!verses.some(v=>v.verse===parsed.verseEnd))))throw new Error('That passage was not found. Check the chapter and verse numbers.')
      if(token===request.current)setPreview({reference:formatReference(parsed.book,parsed.chapter,parsed.verseStart,parsed.verseEnd),verses})
    }catch(err){if(token===request.current)setError(err.message)}finally{if(token===request.current)setBusy(false)}
  }
  function attach(){if(!refs.some(r=>r.toLowerCase()===preview.reference.toLowerCase()))onChange({ref:[...refs,preview.reference].join('; ')});setMessage('Reference attached. Your note saves automatically.')}
  function insert(){
    const at=Math.min(position.current??editor.state.selection.to,editor.state.doc.content.size)
    editor.chain().focus().insertContentAt(at,scriptureDocument(preview.reference,preview.verses)).run()
    position.current=editor.state.selection.to;setMessage('Verse text inserted at your writing position.');setOpen(false)
  }
  return <div className="note-scripture-tools">
    <div className="notes-tags">{refs.map(ref=><span key={ref}>{parseReference(ref)?<a href={scriptureUrl(parseReference(ref))} target="_blank" rel="noreferrer">{ref}</a>:ref}<button type="button" aria-label={`Detach ${ref}`} onClick={()=>onChange({ref:refs.filter(r=>r!==ref).join('; ')||null})}>×</button></span>)}</div>
    <button type="button" className="btn btn-secondary" onClick={start}>Attach Scripture / Insert verses</button>
    {open&&<section aria-label="Attach Scripture" className="notes-scripture-picker">
      <p>Attach a passage to this note, or insert its text at your writing position. Text uses the Berean Standard Bible (BSB).</p>
      {currentPassage&&<button type="button" className="btn btn-ghost" onClick={()=>lookup(currentPassage)}>Use current passage: {currentPassage}</button>}
      <form onSubmit={e=>{e.preventDefault();lookup(input)}}><label>Scripture reference<input autoFocus value={input} placeholder="Romans 8:28–30" onChange={e=>{request.current++;setInput(e.target.value);setPreview(null);setBusy(false);setError('')}}/></label><button className="btn btn-secondary" disabled={busy||!input.trim()}>Preview passage</button></form>
      {busy&&<p role="status">Loading passage…</p>}{error&&<p role="alert">{error}</p>}
      {preview&&<><div className="note-scripture-preview"><strong>{preview.reference} · BSB</strong>{preview.verses.map(v=><p key={v.verse}><sup>{v.verse}</sup> {v.text}</p>)}</div><div className="session-actions"><button type="button" className="btn btn-secondary" onClick={attach}>Attach reference</button><button type="button" className="btn btn-primary" onClick={insert}>Insert verse text</button></div></>}
      <button type="button" className="btn btn-ghost" onClick={()=>{request.current++;setBusy(false);setOpen(false);editor.commands.focus()}}>Close</button>
    </section>}{message&&<p role="status">{message}</p>}
  </div>
}
