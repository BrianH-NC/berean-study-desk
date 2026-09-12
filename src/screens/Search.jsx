import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search as SearchIcon, BookOpen, LibraryBig, NotebookPen, ShieldCheck, Tags, ScrollText, ArrowRight, ExternalLink, X } from 'lucide-react'
import { useAuth } from '../App'
import { supabase } from '../lib/supabase'
import { checksList } from '../lib/theologyCheck'
import { CANONICAL_BOOKS } from '../lib/entries'
import { parseReference, fetchChapter, searchVerses } from '../lib/bsb'
import { COMMENTARIES, fetchCommentaryChapter } from '../lib/helloao'
import { SEARCH_TYPES, matchesSearch, sortSearchResults, commentarySections } from '../lib/searchModel'
import { fetchRecommendations } from '../lib/searchRecommendations'
import { dailyHero } from '../lib/dailyHero'

const ICONS={'Bible':BookOpen,'Books':LibraryBig,'Notes':NotebookPen,'Doctrine Checks':ShieldCheck,'Topics':Tags,'Resources':ScrollText}
function ResultIcon({type}) { const Icon=ICONS[type]||BookOpen; return <Icon size={23} aria-hidden="true"/> }
function bibleUrl(ref){return `/bible?book=${encodeURIComponent(ref.book)}&chapter=${ref.chapter}${ref.verseStart?`&verse=${ref.verseStart}`:''}${ref.verseEnd?`&verseEnd=${ref.verseEnd}`:''}`}
async function allOwned(table, userId) {
  const rows=[]
  for(let start=0;;start+=500){
    const {data,error}=await supabase.from(table).select('*').eq('user_id',userId).order('id').range(start,start+499)
    if(error)throw error
    rows.push(...(data||[]))
    if((data||[]).length<500)return rows
  }
}
export default function SearchWorkspace(){
  const user=useAuth()
  const [params,setParams]=useSearchParams()
  const query=params.get('q')||''
  const type=SEARCH_TYPES.includes(params.get('type'))?params.get('type'):'All'
  const testament=['OT','NT'].includes(params.get('testament'))?params.get('testament'):''
  const book=CANONICAL_BOOKS.includes(params.get('book'))?params.get('book'):''
  const exact=params.get('exact')==='1'
  const sort=['title','recent'].includes(params.get('sort'))?params.get('sort'):'relevance'
  const commentary=COMMENTARIES.find(c=>c.id===params.get('commentary'))||COMMENTARIES[0]
  const [draft,setDraft]=useState(query)
  const [library,setLibrary]=useState({books:[],notes:[],checks:[]})
  const [localLoading,setLocalLoading]=useState(true)
  const [localErrors,setLocalErrors]=useState([])
  const [retry,setRetry]=useState(0)
  const [bible,setBible]=useState({query:'',rows:[],loading:false,error:false})
  const [bibleLimit,setBibleLimit]=useState(60)
  const [resources,setResources]=useState({rows:[],loading:false,error:false})
  const [recommendations,setRecommendations]=useState({rows:[],loading:false,error:false})
  const [selectedId,setSelectedId]=useState(null)
  const [previewOpen,setPreviewOpen]=useState(false)
  const previewRef=useRef(null)
  const lastResult=useRef(null)
  const [visible,setVisible]=useState(30)
  function update(values){const next=new URLSearchParams(params);for(const [key,value]of Object.entries(values)){if(value)next.set(key,value);else next.delete(key)}setParams(next);setVisible(30);setSelectedId(null);setPreviewOpen(false)}
  useEffect(()=>{setDraft(query);setBibleLimit(60);setSelectedId(null);setVisible(30)},[query])
  useEffect(()=>{
    let active=true
    setLocalLoading(true)
    Promise.allSettled([allOwned('books',user.id),allOwned('entries',user.id),checksList().then(r=>{if(r.error)throw r.error;return r.data||[]})]).then(results=>{
      if(!active)return
      const names=['books','notes','checks'];const next={};const errors=[]
      results.forEach((r,i)=>{next[names[i]]=r.status==='fulfilled'?r.value:[];if(r.status==='rejected')errors.push(names[i])})
      setLibrary(next);setLocalErrors(errors);setLocalLoading(false)
    })
    return()=>{active=false}
  },[user.id,retry])
  useEffect(()=>{
    let active=true
    if(!query.trim()){setBible({query,rows:[],loading:false,error:false});return}
    setBible({query,rows:[],loading:true,error:false})
    const ref=parseReference(query)
    const lookup=ref?fetchChapter(ref.book,ref.chapter).then(rows=>rows.filter(v=>(!ref.verseStart||v.verse>=ref.verseStart)&&(!ref.verseEnd||v.verse<=ref.verseEnd)&&(!book||v.book_name===book)&&(!testament||CANONICAL_BOOKS.indexOf(v.book_name)<39===(testament==='OT')))):searchVerses({query:exact?`"${query.replaceAll('"','')}"`:query,testament,bookName:book,limit:bibleLimit})
    lookup.then(rows=>{if(active)setBible({query,rows,loading:false,error:false})}).catch(()=>{if(active)setBible({query,rows:[],loading:false,error:true})})
    return()=>{active=false}
  },[query,testament,book,exact,bibleLimit,retry])
  useEffect(()=>{
    let active=true
    if(!query.trim()||bible.query!==query||bible.loading){setResources({rows:[],loading:!!query,error:false});return}
    const direct=parseReference(query)
    const refs=direct?(bible.rows.length?[direct]:[]):Array.from(new Map(bible.rows.map(v=>[`${v.book_name}:${v.chapter}`,{book:v.book_name,chapter:v.chapter}])).values()).slice(0,3)
    if(!refs.length){setResources({rows:[],loading:false,error:false});return}
    setResources({rows:[],loading:true,error:false})
    Promise.allSettled(refs.map(ref=>fetchCommentaryChapter(commentary.id,ref.book,ref.chapter,{signal:AbortSignal.timeout(12000)}).then(data=>commentarySections(data,ref,commentary)))).then(results=>{
      if(!active)return
      let rows=results.flatMap(r=>r.status==='fulfilled'?r.value:[])
      if(!direct)rows=rows.filter(row=>matchesSearch([row.text],query,exact))
      setResources({rows,loading:false,error:results.some(r=>r.status==='rejected')})
    })
    return()=>{active=false}
  },[query,bible,commentary,exact,retry])
  useEffect(()=>{
    const controller=new AbortController()
    if(!query.trim()){setRecommendations({rows:[],loading:false,error:false});return}
    setRecommendations({rows:[],loading:true,error:false})
    fetchRecommendations(query,controller.signal).then(rows=>{if(!controller.signal.aborted)setRecommendations({rows,loading:false,error:false})}).catch(()=>{if(!controller.signal.aborted)setRecommendations({rows:[],loading:false,error:true})})
    return()=>controller.abort()
  },[query,retry])
  const rows=useMemo(()=>{
    if(!query.trim())return []
    const notes=library.notes.filter(n=>matchesSearch([n.title,n.body,n.ref,...(n.tags||[])],query,exact)).map(n=>({id:`note:${n.id}`,type:'Notes',title:n.title||'Untitled note',text:n.body||'',date:n.created_at,url:`/notebook/${n.id}`,source:n.ref||'Your notes'}))
    const books=library.books.filter(b=>matchesSearch([b.title,b.author,b.isbn,...(b.tags||[])],query,exact)).map(b=>({id:`book:${b.id}`,type:'Books',title:b.title||'Untitled book',text:b.description||b.author||'',source:b.author||'Your library',date:b.created_at,url:`/shelf/${b.id}`,cover:b.cover_url}))
    const checks=library.checks.filter(c=>matchesSearch([c.title,c.name,c.authors,c.summary,c.verdict],query,exact)).map(c=>({id:`check:${c.id}`,type:'Doctrine Checks',title:c.title||c.name||'Doctrine Check',text:c.summary||'',source:c.verdict||'Saved assessment',date:c.created_at,url:`/checks/${c.id}`}))
    const tags=[...new Set(library.notes.flatMap(n=>n.tags||[]))].filter(t=>matchesSearch([t],query,exact)).map(tag=>({id:`topic:${tag}`,type:'Topics',title:tag,text:`${library.notes.filter(n=>n.tags?.includes(tag)).length} notes tagged ${tag}`,url:`/topics?tag=${encodeURIComponent(tag)}`,source:'Your tagged notes'}))
    const verses=bible.query===query?bible.rows.map(v=>({id:`verse:${v.id}`,type:'Bible',title:`${v.book_name} ${v.chapter}:${v.verse}`,text:v.text,source:'BSB',ref:{book:v.book_name,chapter:v.chapter,verseStart:v.verse,verseEnd:v.verse}})):[]
    return [...verses,...books,...tags,...notes,...checks,...resources.rows]
  },[query,library,bible,resources,exact])
  const filtered=sortSearchResults(rows.filter(r=>type==='All'||r.type===type),query,sort)
  const selected=filtered.find(r=>r.id===selectedId)||filtered[0]
  const loading=localLoading||bible.loading||resources.loading
  const relatedTopics=[...new Set(library.notes.filter(n=>matchesSearch([n.title,n.body,...(n.tags||[])],query)).flatMap(n=>n.tags||[]))].slice(0,6)
  function choose(row){lastResult.current=document.activeElement;setSelectedId(row.id);setPreviewOpen(true);requestAnimationFrame(()=>{if(window.matchMedia('(max-width:767px)').matches){previewRef.current?.focus();previewRef.current?.scrollIntoView({block:'start',behavior:'instant'})}})}
  const filters=()=><>
    <h2>Filters</h2>
    <label className="field">Bible version<select className="input" value="BSB" disabled><option>BSB</option></select></label>
    <label className="field">Testament<select className="input" value={testament} onChange={e=>update({testament:e.target.value,book:''})}><option value="">Both testaments</option><option value="OT">Old Testament</option><option value="NT">New Testament</option></select></label>
    <label className="field">Bible book<select className="input" value={book} onChange={e=>update({book:e.target.value})}><option value="">All Bible books</option>{CANONICAL_BOOKS.filter((_,i)=>!testament||(testament==='OT'?i<39:i>=39)).map(name=><option key={name}>{name}</option>)}</select></label>
    <label className="field">Commentary<select className="input" value={commentary.id} onChange={e=>update({commentary:e.target.value})}>{COMMENTARIES.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    <button className="btn btn-ghost" onClick={()=>update({type:'',testament:'',book:'',exact:'',commentary:'',sort:''})}>Clear filters</button>
  </>
  return <div className="page search-workspace">
    <form className="search-main-form" role="search" onSubmit={e=>{e.preventDefault();update({q:draft.trim()})}}><SearchIcon aria-hidden="true" size={21}/><label className="sr-only" htmlFor="search-query">Search Scripture and your content</label><input id="search-query" type="search" value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Search Scripture, books, topics, and resources…"/><label className="sr-only" htmlFor="search-content">Content type</label><select id="search-content" value={type} onChange={e=>update({type:e.target.value==='All'?'':e.target.value})}><option value="All">All Content</option>{SEARCH_TYPES.map(t=><option key={t}>{t}</option>)}</select><button type="submit" className="btn btn-primary">Search</button></form>
    <header className="search-title"><div><h1>Search</h1><p>Find Scripture, books, topics, and trusted resources.</p></div><details className="search-advanced"><summary>Advanced Search</summary><label><input type="checkbox" checked={exact} onChange={e=>update({exact:e.target.checked?'1':''})}/> Match exact phrase</label><p>Use a reference such as Romans 5:8 for passage and commentary lookup. Scripture uses BSB.</p></details></header>
    <nav className="search-type-tabs" aria-label="Search categories">{['All',...SEARCH_TYPES].map(t=><button key={t} aria-pressed={type===t} onClick={()=>update({type:t==='All'?'':t})}>{t} <span>({t==='All'?rows.length:rows.filter(r=>r.type===t).length})</span></button>)}</nav>
    {(localErrors.length>0||bible.error||resources.error) && <div className="search-error" role="alert">Some sources could not load: {[...localErrors,...(bible.error?['BSB']:[]),...(resources.error?['commentary']:[])].join(', ')}. Available results are shown. <button onClick={()=>setRetry(n=>n+1)}>Retry</button></div>}
    <div className="search-columns">
      <aside className="card search-filters">{filters('desktop-types')}</aside>
      <section className="card search-results" aria-label="Search results">
        <details className="search-mobile-filters"><summary>Filters</summary>{filters('mobile-types')}</details>
        <div className="search-results-title"><div><h2>Search Results</h2><p role="status">{loading?'Searching…':query?`${filtered.length} loaded results for “${query}”`:'Enter a word or Bible reference to begin.'}</p></div><label className="sr-only" htmlFor="result-sort">Sort results</label><select id="result-sort" className="input" value={sort} onChange={e=>update({sort:e.target.value})}><option value="relevance">Most relevant</option><option value="title">Title A–Z</option><option value="recent">Newest saved</option></select></div>
        {query&&!loading&&!filtered.length&&<p>No results match your search and filters.</p>}
        {filtered.slice(0,visible).map(row=><button key={row.id} type="button" className={`search-result ${selected?.id===row.id?'is-selected':''}`} aria-pressed={selected?.id===row.id} onClick={()=>choose(row)}>{row.cover?<img src={row.cover} alt="" loading="lazy"/>:<ResultIcon type={row.type}/>}<span><strong>{row.title}</strong><span className="search-snippet">{row.text.slice(0,240)}</span><span className="search-result-meta"><span>{row.type}</span><span>{row.source}</span></span></span></button>)}
        {filtered.length>visible&&<button className="btn btn-secondary" onClick={()=>setVisible(n=>n+30)}>Load more results</button>}
        {bible.rows.length>=bibleLimit&&!parseReference(query)&&<button className="btn btn-secondary" onClick={()=>setBibleLimit(n=>n+60)}>Search more Bible verses</button>}
        {query&&<p className="search-scope">Commentary search covers {commentary.name} in the entered passage, or the first three chapters represented in BSB results. Counts reflect loaded results.</p>}
      </section>
      <section className={`card search-preview ${previewOpen?'is-open':''}`} aria-label="Result preview" ref={previewRef} tabIndex={-1}>
        <div className="search-preview-heading"><h2>Result Preview</h2><button className="btn btn-icon search-close-preview" aria-label="Close preview" onClick={()=>{setPreviewOpen(false);lastResult.current?.focus()}}><X size={20}/></button></div>
        {selected?<><div className="search-preview-type"><ResultIcon type={selected.type}/>{selected.type}</div><h3>{selected.title}{selected.type==='Bible'?' (BSB)':''}</h3><p className={selected.type==='Bible'?'scripture-text':'search-preview-text'}>{selected.text}</p><div className="search-preview-actions"><Link className="btn btn-primary" to={selected.ref?bibleUrl(selected.ref)+(selected.type==='Resources'?`&panel=commentary&commentary=${commentary.id}`:''):selected.url}>{selected.type==='Bible'||selected.type==='Resources'?'Open Bible Study':'Open '+(selected.type==='Books'?'book':selected.type==='Topics'?'topic':'saved item')}</Link><Link className="btn btn-secondary" to="/notebook/new" state={{ref:selected.ref?`${selected.ref.book} ${selected.ref.chapter}:${selected.ref.verseStart||1}`:'',body:`${selected.title}\n\n${selected.text}\n\nSource: ${selected.source||selected.type}`}}>Add to Notes</Link></div>{selected.ref&&<Link className="search-context-link" to={bibleUrl({...selected.ref,verseStart:null,verseEnd:null})}>View chapter in context <ArrowRight size={14}/></Link>}<>{selected.ref&&<Link className="search-context-link" to={bibleUrl(selected.ref)+'&panel=compare'}>Compare translations <ArrowRight size={14}/></Link>}</><h3 className="search-related-heading">Related Results</h3>{rows.filter(r=>r.id!==selected.id&&(selected.ref?r.ref?.book===selected.ref.book:r.type===selected.type)).slice(0,4).map(row=><button className="search-related-link" key={row.id} onClick={()=>choose(row)}><ResultIcon type={row.type}/>{row.title}</button>)}</>:<p>Select a result to preview it here.</p>}
      </section>
      <aside className="search-related">
        <section className="card"><h2>Related Topics</h2>{relatedTopics.length?relatedTopics.map(tag=><Link className="search-related-link" key={tag} to={`/topics?tag=${encodeURIComponent(tag)}`}><Tags size={20}/><span>{tag}<small>From your notes</small></span></Link>):<p>Related tags from your notes appear here.</p>}</section>
        <section className="card"><h2>Discover Books <ExternalLink size={14}/></h2><p className="search-scope">External suggestions · Google Books / Open Library</p>{recommendations.loading?<p>Finding suggestions…</p>:recommendations.error?<p>Suggestions are unavailable. <button onClick={()=>setRetry(n=>n+1)}>Retry</button></p>:recommendations.rows.map(row=><a key={row.url} className="search-related-book" href={row.url} target="_blank" rel="noopener noreferrer">{row.cover?<img src={row.cover} alt="" loading="lazy"/>:<LibraryBig size={22}/>}<span><strong>{row.title}</strong><small>{row.author}{row.year?` · ${row.year}`:''} · {row.source}</small></span></a>)}{!query&&<p>Search to discover related books beyond your library.</p>}</section>
        <div className="search-quote" style={{backgroundImage:`linear-gradient(#102d21b3,#102d21b3),url(${dailyHero()})`}}>“The unfolding of Your words gives light; it informs the simple.”<small>Psalm 119:130 · BSB</small></div>
      </aside>
    </div>
  </div>
}
