import {useCallback,useEffect,useState} from 'react'
import {Link} from 'react-router-dom'
import {CANONICAL_BOOKS} from '../lib/entries'
import {strongsVerse} from '../lib/strongs'
import {grammar,occurrences,stepEntry} from '../lib/wordStudyData'

export function StudySources({variants=false}) {
 return <p className="word-study-help">{variants?<><a href="https://github.com/Faithlife/SBLGNT" target="_blank" rel="noreferrer">SBL Greek New Testament apparatus · Michael W. Holmes / SBL / Logos Bible Software</a></>:<><a href="https://github.com/STEPBible/STEPBible-Data" target="_blank" rel="noreferrer">STEPBible / Tyndale House · TBESG, TBESH, TAGNT, TAHOT and morphology</a></>}. <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>. Converted to chapter data; lexicon formatting simplified. <a href="/data/word-study/sources.json" target="_blank" rel="noreferrer">Source revisions</a>.</p>
}
export function StudyNoteDraft({title,body,reference=''}) {
 const [observations,setObservations]=useState(''),[tags,setTags]=useState('')
 return <details className="study-note-draft"><summary>Keep this study in Notes</summary><label>Your observations<textarea rows={3} value={observations} onChange={e=>setObservations(e.target.value)}/></label><label>Topic tags<input value={tags} onChange={e=>setTags(e.target.value)} placeholder="Grace, faith…"/></label><Link className="btn btn-primary" to="/notebook/new" state={{title,body:body+(observations?'\n\nMy observations\n'+observations:''),ref:reference||null,tags:tags.split(',').map(t=>t.trim()).filter(Boolean),note_type:'bible_study'}}>Continue to Notes →</Link><p className="word-study-help">Create the note in Notes, then choose it as your study-session note if needed. Topic tags connect it to your topic browsing.</p></details>
}
function useSource(loader) {
 const [state,setState]=useState({loading:true}),[retry,setRetry]=useState(0)
 useEffect(()=>{let live=true;Promise.resolve().then(()=>{if(live)setState({loading:true})});loader().then(data=>{if(live)setState({data})}).catch(error=>{if(live)setState({error:error.message})});return()=>{live=false}},[loader,retry])
 return [state,()=>setRetry(v=>v+1)]
}
function SourceState({state,retry}) {return state.loading?<p role="status">Loading study data…</p>:state.error?<p role="alert">{state.error} <button className="btn btn-secondary" onClick={retry}>Retry</button></p>:null}
export function WordDetails({id,request}) {
 const [lex,retry]=useSource(useCallback(()=>stepEntry(id),[id]))
 const [forms,retryForms]=useSource(useCallback(()=>request?grammar(request.bookNumber,request.chapter,request.verse,id):Promise.resolve([]),[id,request]))
 const reference=request?`${request.book} ${request.chapter}:${request.verse}`:''
 const body=`Word study: ${id}${reference?' — '+reference:''}\n\n${(lex.data||[]).map(e=>`${e.lemma} (${e.transliteration})\n${e.gloss}\n${e.definition}`).join('\n\n')}\n\n${(forms.data||[]).map(f=>`${f.form}: ${f.meanings.map(m=>m.description||m.code).join('; ')}`).join('\n')}\n\nSource: STEPBible / Tyndale House, CC BY 4.0. https://github.com/STEPBible/STEPBible-Data`
 return <section className="word-definition"><h3>STEP brief lexicon</h3><SourceState state={lex} retry={retry}/>{lex.data?.map((entry,i)=><details key={i}><summary>{entry.lemma} · {entry.gloss}</summary><p>{entry.transliteration}</p><p className="lexicon-definition">{entry.definition}</p></details>)}{lex.data?.length===0&&<p>No STEP entry for this number.</p>}{request&&<><h3>Grammar in {reference}</h3><p className="word-study-help">All source forms with this number in this verse are shown; repeated words are not automatically aligned to one English word. Source numbering may differ from your translation, especially in the Old Testament.</p><SourceState state={forms} retry={retryForms}/>{forms.data?.map((form,i)=><div className="grammar-form" key={i}><strong>{form.form}</strong><p>{form.gloss}</p>{form.meanings.map((m,j)=><p key={j}><code>{m.code}</code> — {m.description?.replaceAll(';','; ')||'No expanded description available.'}{m.summary&&<><br/><em>Grammar example (not a translation of this verse): {m.summary.replaceAll('_','')}</em></>}</p>)}<small>Source text: {form.editions}</small></div>)}{forms.data?.length===0&&<p>No matching source form recorded at this reference. This is not an inferred grammatical analysis.</p>}</>}
 <StudySources/>{lex.data&&<StudyNoteDraft title={`${id} word study`} body={body} reference={reference}/>}<Concordance key={id} id={id}/></section>
}
function Concordance({id}) {
 const [expanded,setExpanded]=useState(false)
 return <details onToggle={e=>setExpanded(e.currentTarget.open)}><summary>Find occurrences & KJV renderings</summary>{expanded&&<OccurrenceResults id={id}/>}</details>
}
function OccurrenceResults({id}) {
 const [index,retryIndex]=useSource(useCallback(()=>occurrences(id),[id]))
 const [book,setBook]=useState(''),[testament,setTestament]=useState('all'),[page,setPage]=useState(0)
 const filtered=(index.data||[]).filter(r=>(!book||r.bookNumber===Number(book))&&(testament==='all'||(testament==='ot'?r.bookNumber<40:r.bookNumber>=40)))
 const pageRows=filtered.slice(page*10,page*10+10)
 const pageKey=pageRows.map(r=>`${r.bookNumber}/${r.chapter}/${r.verse}`).join(',')
 const [rows,retryRows]=useSource(useCallback(()=>Promise.all((pageKey?pageKey.split(','):[]).map(async key=>{const [bookNumber,chapter,verse]=key.split('/').map(Number);return {bookNumber,chapter,verse,tokens:await strongsVerse(bookNumber,chapter,verse)}})),[pageKey]))
 const renderings=[...new Set((rows.data||[]).flatMap(r=>r.tokens.filter(t=>t.ids.includes(id)).map(t=>t.word)))]
 return <div><SourceState state={index} retry={retryIndex}/><div className="study-lookup-controls"><label>Testament<select value={testament} onChange={e=>{setTestament(e.target.value);setBook('');setPage(0)}}><option value="all">Both testaments</option><option value="ot">Old Testament</option><option value="nt">New Testament</option></select></label><label>Book<select value={book} onChange={e=>{setBook(e.target.value);setPage(0)}}><option value="">All books</option>{CANONICAL_BOOKS.map((b,i)=>(testament==='all'||(testament==='ot'?i<39:i>=39))&&<option key={b} value={i+1}>{b}</option>)}</select></label></div>{index.data&&<p>{filtered.length} matching verses (not individual word occurrences).</p>}<SourceState state={rows} retry={retryRows}/>{renderings.length>0&&<p><strong>KJV renderings on this page:</strong> {renderings.join(', ')}. English wording is shown only where the source tags this Strong’s number.</p>}{rows.data?.map(r=><article className="grammar-form" key={`${r.bookNumber}/${r.chapter}/${r.verse}`}><Link to={`/bible?book=${encodeURIComponent(CANONICAL_BOOKS[r.bookNumber-1])}&chapter=${r.chapter}&verse=${r.verse}`}>{CANONICAL_BOOKS[r.bookNumber-1]} {r.chapter}:{r.verse}</Link><p>{r.tokens.map((t,i)=>t.ids.includes(id)?<mark key={i}>{t.word} </mark>:t.word+' ')}</p></article>)}<div className="study-lookup-controls"><button className="btn btn-secondary" disabled={page===0} onClick={()=>setPage(n=>n-1)}>Previous</button><span>Page {page+1} of {Math.max(1,Math.ceil(filtered.length/10))}</span><button className="btn btn-secondary" disabled={(page+1)*10>=filtered.length} onClick={()=>setPage(n=>n+1)}>Next</button></div><p className="word-study-help"><a href="https://bibleengine.org/advanced" target="_blank" rel="noreferrer">Concordance and KJV tags: BibleEngine</a>. Cross-translation word alignment is not assumed.</p></div>
}
