import {useEffect,useRef,useState} from 'react'
import {interlinear,isLexicalId} from '../lib/wordStudyData'
import {Definition} from './WordStudy'
import {StudySources,WordDetails} from './WordStudyDetails'
import './WordStudy.css'

// Word-by-word Greek (NT) or Hebrew (OT) for one verse, from the STEPBible data BSD already ships.
// Choosing a word opens its definition, STEP lexicon entry, grammar and concordance below the verse.
export default function Interlinear({book,bookNumber,chapter,verse,verses,translation,onVerse,onClose}) {
  const [state,setState]=useState({loading:true}),[retry,setRetry]=useState(0),[selected,setSelected]=useState(-1)
  const close=useRef(null)
  const hebrew=bookNumber<40
  useEffect(()=>{const previous=document.activeElement;close.current?.focus();return()=>{if(previous?.isConnected)previous.focus()}},[])
  useEffect(()=>{let live=true;Promise.resolve().then(()=>{if(live)setState({loading:true})});interlinear(bookNumber,chapter).then(data=>{if(live)setState({data})}).catch(e=>{if(live)setState({error:e.message})});return()=>{live=false}},[bookNumber,chapter,retry])
  useEffect(()=>{setSelected(-1)},[verse,chapter,bookNumber])
  const words=state.data?.verse(verse)||[]
  const numbers=(verses||[]).map(v=>v.number)
  const at=numbers.indexOf(verse)
  const english=(verses||[]).find(v=>v.number===verse)?.text
  const word=words[selected]
  const request={book,bookNumber,chapter,verse}
  const ids=word?.ids.filter(isLexicalId)||[]
  return <aside className="word-study interlinear-panel card" role="region" aria-label="Interlinear" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();onClose()}}}>
    <header><h2>Interlinear</h2><button ref={close} className="btn btn-secondary" onClick={onClose} aria-label="Close Interlinear">Close ×</button></header>
    <div className="interlinear-nav">
      <button className="btn btn-secondary" disabled={at<=0} onClick={()=>onVerse(numbers[at-1])} aria-label="Previous verse">‹</button>
      <strong>{book} {chapter}:{verse} · {hebrew?'Hebrew':'Greek'}</strong>
      <button className="btn btn-secondary" disabled={at<0||at>=numbers.length-1} onClick={()=>onVerse(numbers[at+1])} aria-label="Next verse">›</button>
    </div>
    {english&&<p className="interlinear-english"><small>{translation}</small> {english}</p>}
    {state.loading?<p role="status">Loading the {hebrew?'Hebrew':'Greek'} text…</p>:state.error?<p role="alert">{state.error} <button className="btn btn-secondary" onClick={()=>setRetry(n=>n+1)}>Retry</button></p>:!words.length?<p role="status">No {hebrew?'Hebrew':'Greek'} words are recorded at this reference. Verse numbering in the source can differ from English Bibles, especially in the Old Testament; try a neighbouring verse.</p>:<>
      <p className="word-study-help">Words appear in {hebrew?'Hebrew order, read right to left':'Greek order'}. Choose a word for its definition, grammar and other occurrences.</p>
      <ol className={`interlinear-words ${hebrew?'is-hebrew':''}`} dir={hebrew?'rtl':'ltr'} aria-label={`${hebrew?'Hebrew':'Greek'} words of ${book} ${chapter}:${verse}`}>
        {words.map((w,i)=><li key={i}><button aria-pressed={selected===i} onClick={()=>setSelected(selected===i?-1:i)}>
          <span className="interlinear-original" lang={hebrew?'he':'grc'}>{w.original}</span>
          <span className="interlinear-translit" dir="ltr">{w.transliteration}</span>
          <span className="interlinear-gloss" dir="ltr">{w.gloss||'—'}{w.partial&&<sup title={`Only in: ${w.editions}`}>†</sup>}</span>
          <span className="interlinear-ids" dir="ltr">{w.ids.filter(isLexicalId).join(' ')}</span>
        </button></li>)}
      </ol>
      {words.some(w=>w.partial)&&<p className="word-study-help">† Not in every Greek edition. Choose the word to see which editions include it.</p>}
    </>}
    {word&&<section className="interlinear-detail" aria-live="polite">
      <h3><bdi lang={hebrew?'he':'grc'} className="interlinear-original">{word.original}</bdi> <small>{word.transliteration} · “{word.gloss}”</small></h3>
      {word.grammar.map((g,i)=><p key={i}><code>{word.codes[i]}</code> {g}</p>)}
      <p className="word-study-help">Source text: {word.editions}</p>
      {ids.length?ids.map(id=><div key={id}><Definition id={id}/><WordDetails id={id} request={request}/></div>):<p>This is a grammatical prefix or suffix, not a dictionary word.</p>}
    </section>}
    <footer><StudySources/><p>Glosses are STEP’s contextual English for each word, not a translation of the verse. <a href={`https://biblehub.com/interlinear/${({'Song of Solomon':'songs','Psalms':'psalms'})[book]||book.toLowerCase().replaceAll(' ','_')}/${chapter}-${verse}.htm`} target="_blank" rel="noreferrer">Compare on Bible Hub ↗</a></p></footer>
  </aside>
}
