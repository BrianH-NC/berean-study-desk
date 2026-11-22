import {useEffect,useRef,useState} from 'react'
import {wordParts} from '../lib/strongs'
import {classifyParts,DEITY_PRONOUN_TRANSLATIONS,splitPunctuation} from '../lib/studyHighlights'
import './WordStudy.css'

export function HighlightedText({text,kinds}) {
  if (!kinds?.some(Boolean)) return text
  return wordParts(text).map((part,i)=>{if(!kinds[i])return part;const [lead,core,trail]=splitPunctuation(part);return <span key={i}>{lead}<span className={`study-hl study-hl-${kinds[i]}`}>{core}</span>{trail}</span>})
}

// One verse in every translation the reader has turned on, stacked so the wording can be compared line by line.
// Chapters are loaded through the same fetch the reading pane uses, and cached there, so stepping verse to verse
// inside a chapter costs nothing after the first load.
export default function VerseParallel({book,chapter,verse,verseNumbers,translations,loadChapter,highlights,onVerse,onClose}) {
  const [rows,setRows]=useState({}),[retry,setRetry]=useState(0)
  const close=useRef(null)
  useEffect(()=>{const previous=document.activeElement;close.current?.focus();return()=>{if(previous?.isConnected)previous.focus()}},[])
  useEffect(()=>{
    let live=true
    setRows(Object.fromEntries(translations.map(t=>[t.id,{status:'loading'}])))
    translations.forEach(t=>loadChapter(t.id).then(verses=>{if(live)setRows(r=>({...r,[t.id]:{status:'ready',verses}}))}).catch(e=>{if(live)setRows(r=>({...r,[t.id]:{status:'error',message:e.message}}))}))
    return()=>{live=false}
  },[translations,loadChapter,book,chapter,retry])
  const at=verseNumbers.indexOf(verse)
  const failed=Object.values(rows).some(r=>r.status==='error')
  return <aside className="word-study verse-parallel card" role="region" aria-label="Verse in every translation" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();onClose()}}}>
    <header><h2>Every Translation</h2><button ref={close} className="btn btn-secondary" onClick={onClose} aria-label="Close translation comparison">Close ×</button></header>
    <div className="interlinear-nav">
      <button className="btn btn-secondary" disabled={at<=0} onClick={()=>onVerse(verseNumbers[at-1])} aria-label="Previous verse">‹</button>
      <strong>{book} {chapter}:{verse}</strong>
      <button className="btn btn-secondary" disabled={at<0||at>=verseNumbers.length-1} onClick={()=>onVerse(verseNumbers[at+1])} aria-label="Next verse">›</button>
    </div>
    <ul className="verse-parallel-list">
      {translations.map(t=>{const row=rows[t.id]||{status:'loading'};const v=row.verses?.find(x=>x.number===verse);const pronouns=DEITY_PRONOUN_TRANSLATIONS.has(t.id)
        return <li key={t.id}><h3><abbr title={t.name}>{t.short}</abbr> <small>{t.name}</small></h3>
          {row.status==='loading'?<p role="status">Loading…</p>:row.status==='error'?<p role="alert">Could not load {t.short}. {row.message}</p>:v?<p><HighlightedText text={v.text} kinds={highlights&&classifyParts(v.text,{...highlights,pronouns:highlights.deity&&pronouns})}/></p>:<p className="word-study-help">This translation has no verse {verse} here; its verse division may differ.</p>}
          {row.verses?.copyright&&<small className="bible-attribution">{row.verses.copyright}</small>}
        </li>})}
    </ul>
    {failed&&<button className="btn btn-secondary" onClick={()=>setRetry(n=>n+1)}>Retry translations that failed</button>}
    <footer><p>Translations come from the list turned on in Settings → Manage Translations. Licensed texts are shown with their publishers’ notices.</p></footer>
  </aside>
}
