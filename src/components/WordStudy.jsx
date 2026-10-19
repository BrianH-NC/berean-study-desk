import {useEffect,useRef,useState} from 'react'
import {alignedWord, normalizeWord, strongsEntry, strongsVerse, wordParts} from '../lib/strongs'
import './WordStudy.css'
import {WordDetails} from './WordStudyDetails'

export function StudyWords({text,onStudy}) {
  const timer=useRef(null)
  const held=useRef(false)
  const start=useRef(null)
  const cancel=()=>clearTimeout(timer.current)
  useEffect(()=>()=>clearTimeout(timer.current),[])
  let index=-1
  return wordParts(text).map((part,i)=>{
    if (!part.trim()||!normalizeWord(part)) return part
    const wordIndex=++index
    return <span key={i} onContextMenu={e=>{e.preventDefault();e.stopPropagation();cancel();onStudy(part,wordIndex)}} onPointerDown={e=>{
      held.current=false
      if(e.pointerType==='mouse') return
      start.current={x:e.clientX,y:e.clientY};cancel()
      timer.current=setTimeout(()=>{held.current=true;onStudy(part,wordIndex)},600)
    }} onPointerMove={e=>{if(start.current&&Math.hypot(e.clientX-start.current.x,e.clientY-start.current.y)>10)cancel()}} onPointerUp={cancel} onPointerCancel={cancel} onPointerLeave={cancel} onClick={e=>{if(held.current){e.preventDefault();e.stopPropagation();held.current=false}}}>{part}</span>
  })
}
export function Definition({id}) {
  const [entry,setEntry]=useState(null),[error,setError]=useState(''),[retry,setRetry]=useState(0)
  useEffect(()=>{let live=true;setEntry(null);setError('');strongsEntry(id).then(v=>{if(live)setEntry(v)}).catch(e=>{if(live)setError(e.message)});return()=>{live=false}},[id,retry])
  return <section className="word-definition"><h3>{id} · {id[0]==='H'?'Hebrew / Aramaic':'Greek'}</h3>{error?<p role="alert">{error} <button onClick={()=>setRetry(n=>n+1)}>Retry</button></p>:!entry?<p role="status">Loading definition…</p>:<><p className="word-lemma" dir={id[0]==='H'?'rtl':'ltr'}>{entry.o}</p><dl>{[['Transliteration',entry.tr],['Pronunciation',entry.ph],['Part of speech',entry.pos],['Definition',entry.str],['Derivation',entry.et]].filter(([,v])=>typeof v==='string'&&v).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>{!entry.str&&<p>This source has no definition for this entry.</p>}<a href={`https://biblehub.com/${id[0]==='H'?'hebrew':'greek'}/${id.slice(1)}.htm`} target="_blank" rel="noreferrer">Explore {id} on Bible Hub ↗</a></>}</section>
}
export default function WordStudy({request,onClose}) {
  const [tokens,setTokens]=useState(null),[selected,setSelected]=useState(-1),[error,setError]=useState(''),[retry,setRetry]=useState(0)
  const close=useRef(null)
  useEffect(()=>{const previous=document.activeElement;close.current?.focus();return()=>{if(previous?.isConnected)previous.focus()}},[])
  useEffect(()=>{let live=true;setTokens(null);setError('');setSelected(-1)
    strongsVerse(request.bookNumber,request.chapter,request.verse).then(words=>{if(live){setTokens(words);setSelected(alignedWord(words,request.text,request.index,request.translation))}}).catch(e=>{if(live)setError(e.message)})
    return()=>{live=false}
  },[request,retry])
  const token=tokens?.[selected]
  return <aside className="word-study card" role="region" aria-label="Word Study" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();onClose()}}}>
    <header><h2>Word Study</h2><button ref={close} className="btn btn-secondary" onClick={onClose} aria-label="Close Word Study">Close ×</button></header>
    <p><strong>{request.book} {request.chapter}:{request.verse}</strong>{request.word&&<> · “{request.word}”</>}</p>
    <p className="word-study-help"><strong>Reading translation: {request.translation==='eng_kjv'?'KJV':request.translation}.</strong> Strong’s mappings use KJV. {request.translation!=='eng_kjv'?'Choose the corresponding KJV word below; your reading translation has no verified word mapping.':'Click or right-click a KJV word below to open its definition.'}</p>
    {error?<p role="alert">{error} <button className="btn" onClick={()=>setRetry(n=>n+1)}>Retry</button></p>:!tokens?<p role="status">Loading verse words…</p>:<><h3>KJV word lookup</h3><p className="word-study-help">Click or right-click a word below for its Greek or Hebrew details.</p><div className="word-token-list" aria-label="KJV verse words">{tokens.map((t,i)=><button key={i} className="btn btn-secondary" aria-pressed={selected===i} onClick={()=>setSelected(i)} onContextMenu={e=>{e.preventDefault();e.stopPropagation();setSelected(i)}}>{t.word}</button>)}</div></>}
    {tokens&&selected<0&&request.word&&<p role="status">Select the corresponding word in the KJV row above to show its definition.</p>}
    {token&&(token.ids.length?token.ids.map(id=><div key={id}><Definition id={id}/><WordDetails id={id} request={request}/></div>):<p role="status">No Strong’s number is attached to “{token.word}” in this source. It may be a supplied word or part of a phrase; select a nearby tagged word.</p>)}
    <footer><p>Dictionary entries describe roots, not necessarily the meaning of every occurrence. Read the word in its passage context.</p><a href="https://bibleengine.org/advanced" target="_blank" rel="noreferrer">KJV &amp; Strong’s data: BibleEngine ↗</a></footer>
  </aside>
}
