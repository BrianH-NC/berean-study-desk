import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpen, LibraryBig, NotebookPen, Search, ShieldCheck, Tags, BookMarked } from 'lucide-react'
import { useAuth } from '../App'
import { supabase } from '../lib/supabase'
import { fetchVerseOfTheDay } from '../lib/votd'
import BookCover from '../components/BookCover'
import { dailyHero } from '../lib/dailyHero'

const shortcuts = [
  {label:'Search',text:'Find Scripture, books, and your notes.',to:'/search',icon:Search},
  {label:'Bible Study',text:'Study passages in context.',to:'/bible',icon:BookOpen},
  {label:'Library',text:'Your personal theological library.',to:'/shelf',icon:LibraryBig},
  {label:'Doctrine Check',text:'Evaluate with confessional clarity.',to:'/checks',icon:ShieldCheck},
  {label:'Notes',text:'Capture and grow your insights.',to:'/notebook',icon:NotebookPen},
  {label:'Topics',text:'Explore connections in your study.',to:'/topics',icon:Tags},
  {label:'Reading',text:'Return to the books you are reading.',to:'/reading',icon:BookMarked},
]
function PanelTitle({children,to}) { return <div className="desk-panel-title"><h2>{children}</h2>{to && <Link to={to}>See all <ArrowRight size={13} aria-hidden="true" /></Link>}</div> }

export default function Home() {
  const user = useAuth()
  const navigate = useNavigate()
  const [query,setQuery] = useState('')
  const [data,setData] = useState(null)
  const [error,setError] = useState(false)
  const [reload,setReload] = useState(0)
  const [votd,setVotd] = useState(null)
  const [hero,setHero] = useState(()=>dailyHero())
  useEffect(()=>{
    const refresh=()=>setHero(dailyHero())
    const timer=setInterval(refresh,30000)
    window.addEventListener('focus',refresh)
    return ()=>{clearInterval(timer);window.removeEventListener('focus',refresh)}
  },[])
  useEffect(()=>{
    let active=true
    fetchVerseOfTheDay().then(v=>{if(active)setVotd(v)}).catch(()=>{if(active)setVotd(false)})
    return ()=>{active=false}
  },[])
  useEffect(()=>{
    let active=true
    async function load(){
      try {
        const results=await Promise.all([
          supabase.from('books').select('id,title,author,cover_url,reading_status,updated_at').eq('user_id',user.id).eq('reading_status','in-progress').order('updated_at',{ascending:false}).limit(3),
          supabase.from('entries').select('id,title,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(4),
          supabase.from('theology_checks').select('id,title,name,created_at').order('created_at',{ascending:false}).limit(4),
          supabase.from('books').select('id',{count:'exact',head:true}).eq('user_id',user.id).eq('reading_status','read'),
          supabase.from('books').select('id',{count:'exact',head:true}).eq('user_id',user.id),
          supabase.from('entries').select('id',{count:'exact',head:true}).eq('user_id',user.id),
        ])
        if(results.some(r=>r.error))throw new Error('Could not load activity')
        if(!active)return
        const [books,notes,checks,completed,total,noteCount]=results
        setData({reading:books.data||[],feed:[...(notes.data||[]).map(n=>({...n,kind:'Note',to:`/notebook/${n.id}`})),...(checks.data||[]).map(c=>({...c,kind:'Doctrine Check',to:`/checks/${c.id}`}))].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,4),completed:completed.count,total:total.count,notes:noteCount.count})
        setError(false)
      }catch{if(active)setError(true)}
    }
    void load()
    return ()=>{active=false}
  },[user.id,reload])
  const name=user.user_metadata?.display_name || user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'Reader'
  const verseTo=votd ? `/bible?book=${encodeURIComponent(votd.book)}&chapter=${votd.chapter}${votd.verseStart?`&verse=${votd.verseStart}`:''}${votd.verseEnd?`&verseEnd=${votd.verseEnd}`:''}` : '/bible'
  return <div className="page desk-home" style={{'--daily-hero':`url("${hero}")`}}>
    <header className="desk-topbar">
      <form className="desk-search" role="search" onSubmit={e=>{e.preventDefault();if(query.trim())navigate(`/search?q=${encodeURIComponent(query.trim())}`)}}>
        <Search size={21} aria-hidden="true"/><label className="sr-only" htmlFor="home-search">Search Scripture, books, and notes</label><input id="home-search" type="search" placeholder="Search Scripture, books, topics, or questions…" value={query} onChange={e=>setQuery(e.target.value)} required/><button className="btn btn-primary" type="submit">Search</button>
      </form>
      <Link to="/settings/profile" className="desk-profile"><span aria-hidden="true">{name.slice(0,2).toUpperCase()}</span><span>{name}</span></Link>
      <p className="desk-motto">Search diligently<br/>and with discernment.<small>Inspired by Acts 17:11</small></p>
    </header>
    {error && <div className="card" role="alert">Study activity could not be loaded.<button className="btn btn-secondary" onClick={()=>setReload(n=>n+1)}>Retry</button></div>}
    <div className="desk-layout">
      <div className="desk-primary">
        <section className="desk-hero" aria-labelledby="home-heading">
          <div className="desk-hero-copy"><h1 id="home-heading">Search. Study. Discern.</h1><p>A deeper place for a deeper faith.</p></div>
          <blockquote>“Your word is a lamp<br/>to my feet and a light<br/>to my path.”<cite>Psalm 119:105 · BSB</cite></blockquote>
        </section>
        <nav className="desk-shortcuts" aria-label="Study shortcuts">{shortcuts.map(({label,text,to,icon:Icon})=><Link key={to} to={to}><Icon size={29} strokeWidth={1.8} aria-hidden="true"/><h2>{label}</h2><p>{text}</p><ArrowRight size={15} aria-hidden="true"/></Link>)}</nav>
        <div className="desk-bottom">
          <section className="card desk-verse"><PanelTitle>Verse of the Day</PanelTitle>{votd ? <><p className="scripture-text">“{votd.text}”</p><Link to={verseTo}>{votd.reference} · BSB <ArrowRight size={13} aria-hidden="true"/></Link><small>Daily pick via <a href="https://www.biblegateway.com" target="_blank" rel="noopener noreferrer">BibleGateway</a></small></> : <p>{votd===false?'Today’s verse is unavailable. Open Bible Study to choose a passage.':'Loading today’s verse…'}</p>}</section>
          <section className="card desk-thought"><PanelTitle>A Thought for Today</PanelTitle><p>A deeper understanding of God’s Word is not an end in itself, but a means to a deeper love for God and a clearer walk in His will.</p><span aria-hidden="true">—</span><Link to="/notebook/new">Reflect in a note <ArrowRight size={13} aria-hidden="true"/></Link></section>
          <section className="card desk-progress"><PanelTitle>Your Progress</PanelTitle><p className="card-meta">All time</p>{data ? <><div><BookOpen size={18} aria-hidden="true"/><span>Books completed</span><strong>{data.completed ?? '—'} / {data.total ?? '—'}</strong></div>{data.total>0 && <progress aria-label="Books completed" max={data.total} value={data.completed||0}/>}<div><NotebookPen size={18} aria-hidden="true"/><span>Notes created</span><strong>{data.notes ?? '—'}</strong></div><Link to="/reading">Continue your reading <ArrowRight size={13} aria-hidden="true"/></Link></> : <p>{error?'Activity unavailable.':'Loading progress…'}</p>}</section>
        </div>
      </div>
      <aside className="desk-activity" aria-label="Personal study activity">
        <section className="card"><PanelTitle to="/reading">Continue Studying</PanelTitle>{data ? data.reading.length ? data.reading.map(book=><Link className="desk-activity-row" to={`/reading/${book.id}`} key={book.id}><BookCover book={book} compact/><span><strong>{book.title}</strong><small>{book.author || 'Currently reading'}</small></span></Link>) : <p>Start a book in your <Link to="/shelf">Library</Link> to pick up your reading here.</p> : <p>{error?'Activity unavailable.':'Loading your books…'}</p>}</section>
        <section className="card"><PanelTitle>Recent Items</PanelTitle>{data ? data.feed.length ? data.feed.map(item=><Link className="desk-activity-row" to={item.to} key={item.to}><span className="desk-item-icon">{item.kind==='Note'?<NotebookPen size={22}/>:<ShieldCheck size={22}/>}</span><span><strong>{item.title||item.name||'Untitled'}</strong><small>{item.kind} · {new Date(item.created_at).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</small></span></Link>) : <p>Your notes and doctrine checks will appear here.</p> : <p>{error?'Activity unavailable.':'Loading recent items…'}</p>}</section>
        <Link className="desk-closing" to="/bible?book=Romans&chapter=10&verse=15"><span>“How beautiful are the feet<br/>of those who bring good news!”</span><small>Romans 10:15 · BSB</small></Link>
      </aside>
    </div>
  </div>
}
