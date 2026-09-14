import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from '../App'
import { supabase } from '../lib/supabase'
import FindMissingCovers from '../components/FindMissingCovers'
import { primaryCategory, readingStatus, sortLibrary } from '../lib/libraryPresentation'
import LibraryCollection from '../components/LibraryCollection'

const VIEWS = ['shelf', 'grid', 'list']
function storedView(userId) {
  try { const value = localStorage.getItem(`bsd-library-view:${userId}`); return VIEWS.includes(value) ? value : 'shelf' } catch { return 'shelf' }
}

export default function Shelf() {
  const user = useAuth()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const [books, setBooks] = useState(null)
  const [checksByIsbn, setChecksByIsbn] = useState({})
  const [loadError, setLoadError] = useState('')
  const [assessmentError, setAssessmentError] = useState(false)
  const query = params.get('q') || ''
  const category = params.get('category') || ''
  const status = params.get('status') || ''
  const tradition = params.get('tradition') || ''
  const verdict = params.get('verdict') || ''
  const view = VIEWS.includes(params.get('view')) ? params.get('view') : storedView(user.id)
  const sort = ['title','author','category','recent'].includes(params.get('sort')) ? params.get('sort') : 'title'
  const direction = params.get('direction') === 'desc' ? 'desc' : 'asc'
  const limit = Math.max(24, Math.min(10000, Number(params.get('limit')) || 24))

  function update(values) {
    const next = new URLSearchParams(params)
    for (const [key,value] of Object.entries(values)) { if (value) next.set(key,value); else next.delete(key) }
    if (!Object.hasOwn(values, 'limit')) next.delete('limit')
    setParams(next, {replace:true})
  }
  function setView(value) {
    update({view:value})
    try { localStorage.setItem(`bsd-library-view:${user.id}`,value) } catch { /* URL state still works. */ }
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
    (!query.trim() || `${book.title} ${book.author}`.toLowerCase().includes(query.trim().toLowerCase())) &&
    (!category || primaryCategory(book) === category) &&
    (!status || readingStatus(book) === status) &&
    (!tradition || book.tradition === tradition) &&
    (!verdict || assessmentError || (verdict === 'not-assessed' ? !checksByIsbn[book.isbn] : checksByIsbn[book.isbn]?.verdict === verdict))
  ),sort,direction),[books,query,category,status,tradition,verdict,checksByIsbn,sort,direction,assessmentError])
  const hasFilters = query || category || status || tradition || verdict
  function clearFilters() { update({q:'',category:'',status:'',tradition:'',verdict:''}) }
  function toggleSort(key) { update({sort:key,direction:sort === key && direction === 'asc' ? 'desc' : 'asc'}) }

  return <div className="page library-page">
    <header className="flex items-start justify-between gap-4 flex-wrap mb-6">
      <div><p className="card-kicker mb-2">Your personal collection</p><h1>Library</h1><p className="text-muted mb-0">Books to read, return to, and study alongside Scripture.</p></div>
      <div className="flex gap-2 flex-wrap"><Link to="/shelf/add" className="btn btn-primary">Add books</Link><Link to="/shelf/wishlist" className="btn btn-secondary">Wishlist</Link></div>
    </header>
    <div className="mb-4"><FindMissingCovers books={books} saveCover={saveCover} onComplete={loadBooks}/></div>
    <section className="card mb-6" aria-label="Library controls">
      <div className="library-toolbar">
        <div className="field flex-1 min-w-0"><label htmlFor="library-search">Search Library</label><input id="library-search" type="search" className="input" placeholder="Title or author" value={query} onChange={e=>update({q:e.target.value})} /></div>
        <div><span id="library-view-label" className="font-ui text-sm block mb-1">View</span><div className="seg" role="group" aria-labelledby="library-view-label">{VIEWS.map(value=><button key={value} type="button" className="seg-opt" aria-pressed={view === value} onClick={()=>setView(value)}>{value[0].toUpperCase()+value.slice(1)}</button>)}</div></div>
        <div className="field"><label htmlFor="library-sort">Sort by</label><select id="library-sort" className="input" value={sort} onChange={e=>update({sort:e.target.value})}><option value="title">Title</option><option value="author">Author</option><option value="category">Category</option><option value="recent">Recently added</option></select></div>
        <button type="button" className="btn btn-secondary" onClick={()=>update({direction:direction === 'asc' ? 'desc':'asc'})} aria-label="Reverse sort order">{direction === 'asc' ? '↑ Ascending' : '↓ Descending'}</button>
      </div>
      <details className="library-filter-disclosure">
      <summary>Filters and collection actions{hasFilters ? ' · Filters active' : ''}</summary>
      <div className="library-filters">
        <div className="field"><label htmlFor="library-category">Category</label><select id="library-category" className="input" value={category} onChange={e=>update({category:e.target.value})}><option value="">All categories</option>{categories.map(value=><option key={value}>{value}</option>)}</select></div>
        <div className="field"><label htmlFor="library-status">Reading status</label><select id="library-status" className="input" value={status} onChange={e=>update({status:e.target.value})}><option value="">All statuses</option>{['Not Started','Reading','Completed','Paused'].map(value=><option key={value}>{value}</option>)}</select></div>
        <div className="field"><label htmlFor="library-verdict">Verdict</label><select id="library-verdict" className="input" value={verdict} disabled={assessmentError} onChange={e=>update({verdict:e.target.value})}><option value="">All verdicts</option><option value="not-assessed">Not Assessed</option>{verdicts.map(value=><option key={value}>{value}</option>)}</select></div>
        <div className="field"><label htmlFor="library-tradition">Tradition</label><select id="library-tradition" className="input" value={tradition} onChange={e=>update({tradition:e.target.value})}><option value="">All traditions</option>{traditions.map(value=><option key={value}>{value}</option>)}</select></div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {hasFilters && <button type="button" className="btn btn-ghost" onClick={clearFilters}>Clear filters</button>}
        <button type="button" className="btn btn-ghost" onClick={handleExport} disabled={!books?.length}>Export Library</button>
      </div>
      </details>
    </section>
    {loadError && <div role="alert" className="card mb-4"><p>{loadError}</p><button className="btn btn-secondary self-start" onClick={loadBooks}>Retry</button></div>}
    {assessmentError && <div role="alert" className="card mb-4"><p>Assessment information could not be loaded. Your books are still available.</p><button className="btn btn-secondary self-start" onClick={loadBooks}>Retry assessments</button></div>}
    {books === null ? !loadError && <p role="status">Loading your Library…</p> : books.length === 0 ? <section className="card"><h2>Your Library starts here</h2><p>Add a book to keep its details, notes, and assessments together.</p><Link to="/shelf/add" className="btn btn-primary self-start">Add your first book</Link></section> : filtered.length === 0 ? <section className="card"><h2>No books match these filters</h2><button className="btn btn-secondary self-start" onClick={clearFilters}>Clear filters</button></section> : <>
      <p className="card-meta mb-4" role="status">{filtered.length} {filtered.length === 1 ? 'book' : 'books'}{hasFilters ? ` of ${books.length}` : ''}</p>
      <LibraryCollection books={filtered.slice(0,limit)} assessments={checksByIsbn} assessmentsUnavailable={assessmentError} view={view} sort={sort} direction={direction} onSort={toggleSort} libraryFrom={location.pathname+location.search} />
      {filtered.length>limit && <button className="btn btn-secondary mt-6" onClick={()=>update({limit:String(limit+24)})}>Load more books ({filtered.length-limit} remaining)</button>}
    </>}
  </div>
}
