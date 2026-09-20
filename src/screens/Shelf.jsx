import AccountLink from '../components/AccountLink'
import {preferencesFor} from '../lib/preferences'
import LibrarySummary from '../components/LibrarySummary'
import LibraryBookEditor from '../components/LibraryBookEditor'
import './Library.css'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from '../App'
import { supabase } from '../lib/supabase'
import FindMissingCovers from '../components/FindMissingCovers'
import { primaryCategory, readingStatus, sortLibrary } from '../lib/libraryPresentation'
import LibraryCollection from '../components/LibraryCollection'

const VIEWS = ['shelf', 'grid', 'list']
export default function Shelf() {
  const user = useAuth()
  const prefs = preferencesFor(user)
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const [editing, setEditing] = useState(null)
  const [goal, setGoal] = useState(null)
  const [wishlistCount, setWishlistCount] = useState(null)
  const [extrasError, setExtrasError] = useState('')
  const [books, setBooks] = useState(null)
  const [checksByIsbn, setChecksByIsbn] = useState({})
  const [loadError, setLoadError] = useState('')
  const [assessmentError, setAssessmentError] = useState(false)
  const query = params.get('q') || ''
  const author = params.get('author') || ''
  const publisher = params.get('publisher') || ''
  const tag = params.get('tag') || ''
  const collection = params.get('collection') || ''
  const added = params.get('added') || ''
  const progressFilter = params.get('progress') || ''
  const browse = params.get('browse') || ''
  const category = params.get('category') || ''
  const status = params.get('status') || ''
  const tradition = params.get('tradition') || ''
  const verdict = params.get('verdict') || ''
  const view = VIEWS.includes(params.get('view')) ? params.get('view') : prefs.libraryView
  const sort = ['title','author','category','recent'].includes(params.get('sort')) ? params.get('sort') : prefs.librarySort
  const direction = ['asc','desc'].includes(params.get('direction')) ? params.get('direction') : prefs.libraryDirection
  const limit = Math.max(24, Math.min(10000, Number(params.get('limit')) || 24))

  function update(values) {
    const next = new URLSearchParams(params)
    for (const [key,value] of Object.entries(values)) { if (value) next.set(key,value); else next.delete(key) }
    if (!Object.hasOwn(values, 'limit')) next.delete('limit')
    setParams(next, {replace:true})
  }
  function setView(value) {
    update({view:value})
  }
  const loadBooks = useCallback(async () => {
    setLoadError('')
    try {
      const [bookResult, checkResult] = await Promise.all([
        supabase.from('books').select('*').eq('user_id',user.id).order('title'),
        supabase.from('theology_checks').select('id, isbn, verdict, created_at').eq('kind','book').not('isbn','is',null).order('created_at',{ascending:false}),
      ])
      if (bookResult.error) throw bookResult.error
      setBooks(bookResult.data || [])
      setAssessmentError(!!checkResult.error)
      const map = {}
      for (const check of checkResult.data || []) { if (check.isbn && !map[check.isbn]) map[check.isbn] = check }
      if (!checkResult.error) setChecksByIsbn(map)
    } catch { setLoadError('Your Library could not be loaded. Please try again.') }
  },[user.id])
  useEffect(() => { void loadBooks() },[loadBooks])
  useEffect(() => {
    Promise.all([supabase.from('wishlist').select('id',{count:'exact',head:true}).eq('user_id',user.id),supabase.from('library_goals').select('target').eq('user_id',user.id).eq('year',new Date().getFullYear()).maybeSingle()]).then(([wish,g])=>{if(wish.error||g.error) {setExtrasError('Some summary information could not be loaded.');return} setWishlistCount(wish.count);setGoal(g.data?.target||null)})
  },[user.id])
  async function saveBook(values) {
    const {error}=await supabase.from('books').update(values).eq('user_id',user.id).eq('id',editing.id)
    if(error) throw error
    setBooks(current=>current.map(b=>b.id===editing.id?{...b,...values}:b))
  }
  async function removeBook(book) {
    if(!window.confirm(`Remove “${book.title}” from your Library? This removes your library record, not the shared Doctrine Check.`)) return
    const {error}=await supabase.from('books').delete().eq('user_id',user.id).eq('id',book.id)
    if(error) {window.alert('Could not remove book: '+error.message);return}
    setBooks(current=>current.filter(b=>b.id!==book.id))
  }
  async function saveGoal(target) {
    const {error}=await supabase.from('library_goals').upsert({user_id:user.id,year:new Date().getFullYear(),target})
    if(error) throw error
    setGoal(target)
  }


  async function saveCover(book, cover) {
    const { error } = await supabase.from('books').update({cover_url:cover}).eq('user_id',user.id).eq('id',book.id).or('cover_url.is.null,cover_url.eq.')
    if (error) throw error
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(books, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'berean-study-desk-shelf.json'
    a.click()
    URL.revokeObjectURL(url)
  }


  const categories = useMemo(() => [...new Set((books || []).map(primaryCategory))].sort(),[books])
  const traditions = useMemo(() => [...new Set((books || []).map(book => book.tradition).filter(Boolean))].sort(),[books])
  const verdicts = useMemo(() => [...new Set(Object.values(checksByIsbn).map(check => check.verdict).filter(Boolean))].sort(),[checksByIsbn])
  const filtered = useMemo(() => sortLibrary((books || []).filter(book =>
    (!query.trim() || `${book.title} ${book.author} ${book.isbn || ''} ${(book.tags || []).join(' ')} ${(book.collections || []).join(' ')}`.toLowerCase().includes(query.trim().toLowerCase())) &&
    (!category || category.split('|').includes(primaryCategory(book))) &&
    (!author || book.author===author) && (!publisher || book.publisher===publisher) &&
    (!tag || book.tags?.includes(tag)) && (!collection || book.collections?.includes(collection)) &&
    (!added || (Date.now()-Date.parse(book.created_at))<=Number(added)*86400000) &&
    (!progressFilter || (progressFilter==='recorded' ? book.current_page>0 : !book.current_page)) &&
    (!status || status.split('|').includes(readingStatus(book))) &&
    (!tradition || book.tradition === tradition) &&
    (!verdict || assessmentError || (verdict === 'not-assessed' ? !checksByIsbn[book.isbn] : checksByIsbn[book.isbn]?.verdict === verdict))
  ),sort,direction),[books,query,category,status,tradition,verdict,checksByIsbn,sort,direction,assessmentError,author,publisher,tag,collection,added,progressFilter])
  const hasFilters = query || category || status || tradition || verdict || author || publisher || tag || collection || added || progressFilter
  function clearFilters() { update({q:'',category:'',status:'',tradition:'',verdict:'',author:'',publisher:'',tag:'',collection:'',added:'',progress:''}) }
  function toggleSort(key) { update({sort:key,direction:sort === key && direction === 'asc' ? 'desc' : 'asc'}) }

  const all=books || []
  const options=key=>[...new Set(all.flatMap(b=>Array.isArray(b[key])?b[key]:b[key]?[b[key]]:[]))].sort()
  function toggle(key,value) { const values=new Set((params.get(key)||'').split('|').filter(Boolean)); if(values.has(value))values.delete(value);else values.add(value);update({[key]:[...values].join('|')}) }
  const dropdown=(label,key,values,value)=><details><summary>{label}</summary><select className="input" aria-label={label} value={value} onChange={e=>update({[key]:e.target.value})}><option value="">All</option>{values.map(v=><option key={v} value={v}>{v}</option>)}</select></details>
  const selectedGroup=(key,value)=>update({[key]:value,browse:''})
  return <div className="page library-page heritage-library">
    <div className="library-search-top"><input className="input" type="search" aria-label="Search your library" placeholder="Search your library (title, author, topic, tag, or ISBN)…" value={query} onChange={e=>update({q:e.target.value})}/><AccountLink user={user}/><blockquote>“Study to show yourself approved to God…”<cite>2 Timothy 2:15</cite></blockquote></div>
    <div className="library-workspace"><div className="library-workspace-main">
    <header className="library-banner"><h1>Library</h1><p>Build a faithful library for a deeper walk with God.</p><blockquote>Good books feed<br/>a lifetime of faith.</blockquote></header>
    <div className="library-primary-actions"><Link to="/shelf/add" className="btn btn-primary">+ Add books</Link><FindMissingCovers books={books} saveCover={saveCover} onComplete={loadBooks}/><button className="btn btn-ghost" onClick={handleExport} disabled={!books?.length}>Export</button></div>
    <div className="library-viewbar"><nav aria-label="Library sections">{[['All Books','',all.length],['Reading','Reading',all.filter(b=>b.reading_status==='in-progress').length],['Completed','Completed',all.filter(b=>b.reading_status==='read').length]].map(([label,value,count])=><button key={label} aria-pressed={!browse&&status===value} onClick={()=>update({status:value,browse:''})}>{label} ({count})</button>)}<Link to="/shelf/wishlist">Wishlist {wishlistCount!==null?`(${wishlistCount})`:''}</Link>{['Tags','Authors','Collections'].map(label=><button key={label} aria-pressed={browse===label} onClick={()=>update({browse:browse===label?'':label})}>{label}</button>)}</nav><div className="library-view-options"><select aria-label="Library view" value={view} onChange={e=>setView(e.target.value)}>{VIEWS.map(v=><option key={v} value={v}>{v[0].toUpperCase()+v.slice(1)}</option>)}</select><select aria-label="Sort books" value={sort} onChange={e=>update({sort:e.target.value})}><option value="title">Title A–Z</option><option value="author">Author</option><option value="category">Category</option><option value="recent">Date added</option></select><button aria-label="Reverse sort order" onClick={()=>update({direction:direction==='asc'?'desc':'asc'})}>{direction==='asc'?'↑':'↓'}</button></div></div>
    <div className="library-content-layout"><aside className="library-facet-panel"><details open={typeof window !== 'undefined' && window.innerWidth > 700}><summary>Filters</summary><button className="btn btn-ghost" onClick={clearFilters} disabled={!hasFilters}>Clear all</button><h3>Category</h3>{categories.map(value=><label className="library-checkbox" key={value}><input type="checkbox" checked={category.split('|').includes(value)} onChange={()=>toggle('category',value)}/>{value==='Not Started'?'To Read':value} ({all.filter(b=>primaryCategory(b)===value).length})</label>)}{dropdown('Author','author',options('author'),author)}{dropdown('Publisher','publisher',options('publisher'),publisher)}{dropdown('Tags','tag',options('tags'),tag)}{dropdown('Collection','collection',options('collections'),collection)}{dropdown('Tradition','tradition',traditions,tradition)}{dropdown('Doctrine verdict','verdict',verdicts,verdict)}<details><summary>Reading Progress</summary><select className="input" aria-label="Reading progress filter" value={progressFilter} onChange={e=>update({progress:e.target.value})}><option value="">All</option><option value="recorded">Page progress recorded</option><option value="none">No page progress recorded</option></select></details><details><summary>Date Added</summary><select className="input" aria-label="Date added filter" value={added} onChange={e=>update({added:e.target.value})}><option value="">Any time</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="365">Last year</option></select></details></details></aside>
    <main className="library-results">
    {browse && <section className="card library-groups"><h2>{browse}</h2><p>Select a {browse==='Authors'?'name':browse==='Tags'?'tag':'collection'} to filter your books.</p><div className="flex gap-2 flex-wrap">{options(browse==='Authors'?'author':browse==='Tags'?'tags':'collections').map(value=><button className="btn btn-secondary" key={value} onClick={()=>selectedGroup(browse==='Authors'?'author':browse==='Tags'?'tag':'collection',value)}>{value}</button>)}</div>{browse==='Collections'&&<p>Use “Update reading / organize” on a book to create or assign collections.</p>}</section>}
    {loadError&&<p role="alert">{loadError} <button onClick={loadBooks}>Retry</button></p>}{assessmentError&&<p role="alert">Assessment information is unavailable. <button onClick={loadBooks}>Retry</button></p>}
    {books===null?<p role="status">Loading your Library…</p>:<><p className="card-meta" role="status">{filtered.length} books{hasFilters?' · Filters active':''}</p>{!filtered.length?<section className="card"><h2>{all.length?'No matching books':'Your Library starts here'}</h2>{all.length?<button className="btn btn-secondary" onClick={clearFilters}>Clear filters</button>:<Link to="/shelf/add">Add your first book →</Link>}</section>:<LibraryCollection books={filtered.slice(0,limit)} assessments={checksByIsbn} assessmentsUnavailable={assessmentError} view={view} sort={sort} direction={direction} onSort={toggleSort} onEdit={(book,section)=>setEditing({...book,editorSection:section})} onRemove={removeBook} libraryFrom={location.pathname+location.search}/>} {filtered.length>limit&&<button className="btn btn-secondary mt-4" onClick={()=>update({limit:String(limit+24)})}>Load more ({filtered.length-limit} remaining)</button>}</>}
    </main></div></div><div>{extrasError&&<p role="alert">{extrasError}</p>}<LibrarySummary books={all} wishlistCount={wishlistCount} goal={goal} onGoal={saveGoal} select={value=>update(value==='recent'?{sort:'recent',direction:'asc',status:'',browse:''}:{status:value,browse:''})}/></div></div>
    {editing&&<LibraryBookEditor book={editing} onSave={saveBook} onClose={()=>setEditing(null)}/>}
  </div>
}
