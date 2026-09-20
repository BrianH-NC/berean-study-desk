import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BookOpen, Search } from 'lucide-react'
import { useAuth } from '../App'
import { importFreeBook, searchFreeBooks } from '../lib/freeBooks'
import './FreeBooks.css'

const names = { gutenberg: 'Project Gutenberg', ccel: 'CCEL' }
function Cover({ book }) {
  const [failed, setFailed] = useState(false)
  return <div className="free-book-cover">{book.cover && !failed ? <img src={book.cover} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)}/> : <BookOpen size={34} aria-hidden="true"/>}</div>
}

export default function FreeBooks() {
  const user = useAuth(), navigate = useNavigate()
  const [source, setSource] = useState('gutenberg')
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState({ q: '', page: 1, attempt: 0 })
  const [listing, setListing] = useState(null)
  const [error, setError] = useState('')
  const [selection, setSelection] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailError, setDetailError] = useState('')
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  const selectionPanel = useRef(null)

  useEffect(() => {
    const controller = new AbortController()
    setListing(null); setError(''); setSelection(null); setDetail(null)
    searchFreeBooks({ source, q: search.q, page: String(search.page) }, controller.signal)
      .then(result => { if (!controller.signal.aborted) setListing(result) })
      .catch(err => { if (!controller.signal.aborted) setError(err.message) })
    return () => controller.abort()
  }, [source, search])

  useEffect(() => {
    if (!selection) return
    const controller = new AbortController()
    setDetail(null); setDetailError('')
    selectionPanel.current?.focus()
    searchFreeBooks({ source: selection.source, id: selection.id }, controller.signal)
      .then(result => { if (!controller.signal.aborted) setDetail(result) })
      .catch(err => { if (!controller.signal.aborted) setDetailError(err.message) })
    return () => controller.abort()
  }, [selection])

  function submit(event) { event.preventDefault(); setSearch(previous => ({ q: query.trim(), page: 1, attempt: previous.attempt + 1 })) }
  function changeSource(value) { setSource(value); setSearch(previous => ({ ...previous, page: 1 })) }
  async function add(format) {
    if (!detail || pending.current) return
    pending.current = true; setBusy(true)
    try { navigate(`/reading/${await importFreeBook(user.id, detail, format)}`) }
    catch (err) { alert('Unable to import book: ' + err.message) }
    finally { pending.current = false; setBusy(false) }
  }
  return <div className="page free-books-page">
    <Link to="/reading">← Reading Now</Link>
    <header className="free-books-heading"><p className="reading-eyebrow">Build your reading library</p><h1>Find Free Books</h1><p>Discover a classic, add your own private copy, and start reading.</p></header>
    <div className="free-book-sources" aria-label="Book source">{Object.entries(names).map(([value, name]) => <button key={value} className={`btn ${source === value ? 'btn-primary' : 'btn-secondary'}`} aria-pressed={source === value} disabled={busy} onClick={() => changeSource(value)}>{name}</button>)}</div>
    <form onSubmit={submit} className="free-book-search"><label htmlFor="free-book-query">Search by title or author</label><div><input className="input" id="free-book-query" value={query} maxLength={160} disabled={busy} onChange={event => setQuery(event.target.value)} placeholder="Augustine, prayer, Pilgrim’s Progress…"/><button className="btn btn-primary" disabled={busy}><Search size={17} aria-hidden="true"/>Search</button></div></form>
    <div className="free-book-topics">{['Augustine', 'Calvin', 'Spurgeon', 'Prayer', 'Bunyan'].map(term => <button className="btn btn-ghost" key={term} disabled={busy} onClick={() => { setQuery(term); setSearch({ q: term, page: 1, attempt: 0 }) }}>{term}</button>)}</div>
    <p className="card-meta">{source === 'gutenberg' ? 'Project Gutenberg classics. Direct imports are limited to editions marked public domain in the USA; copyright rules vary by country.' : 'Christian Classics Ethereal Library. Personal reading copies follow CCEL’s terms; some editions or formats may require visiting CCEL.'} <a href={source === 'gutenberg' ? 'https://www.gutenberg.org/policy/license' : 'https://www.ccel.org/about/copyright.html'} target="_blank" rel="noreferrer">Source terms ↗</a></p>
    {selection && <section className="card free-book-detail" ref={selectionPanel} tabIndex={-1} aria-label="Selected book">
      <button className="btn btn-ghost free-book-close" disabled={busy} onClick={() => setSelection(null)}>Close details</button>
      <h2>{detail?.title || selection.title}</h2>
      {detailError ? <div role="alert"><p>{detailError}</p><button className="btn btn-secondary" onClick={() => setSelection({ ...selection })}>Retry</button></div> : !detail ? <p role="status">Checking available formats…</p> : <div className="free-book-detail-body"><Cover key={detail.id} book={detail}/><div><p>{detail.author}</p>{detail.description && <p className="free-book-description">{detail.description}</p>}<p className="card-meta">{detail.rights}</p><div className="free-book-actions">{detail.formats.map(item => <button className="btn btn-primary" key={item.format} disabled={busy} onClick={() => add(item.format)}>{busy ? 'Adding book…' : `Add & Read ${item.format.toUpperCase()}`}</button>)}</div>{!detail.formats.length && <p>No directly importable PDF or EPUB is listed for this edition. Open the source to see its reading options.</p>}{busy && <p role="status">Downloading your copy and adding it to your Library. This can take a moment.</p>}</div></div>}
      <a href={selection.url} target="_blank" rel="noreferrer">Open on {names[selection.source]} ↗</a>
    </section>}
    {error ? <div className="card" role="alert"><p>{error}</p><button className="btn btn-secondary" onClick={() => setSearch(previous => ({ ...previous, attempt: previous.attempt + 1 }))}>Retry search</button><a className="btn btn-ghost" href={source === 'gutenberg' ? 'https://www.gutenberg.org' : 'https://www.ccel.org'} target="_blank" rel="noreferrer">Visit {names[source]} ↗</a></div> : !listing ? <p role="status">Searching {names[source]}…</p> : <>
      <p role="status" className="card-meta">{listing.results.length ? `Page ${search.page}${listing.count !== undefined ? ` · ${listing.count} books found` : ''}` : 'No matching books. Try a different title or author.'}</p>
      <div className="free-book-grid">{listing.results.map(book => <article key={book.id} className="card free-book-card"><Cover book={book}/><div><h2>{book.title}</h2><p>{book.author}</p><button className="btn btn-secondary" disabled={busy} onClick={() => setSelection(book)}>Details & formats</button><a href={book.url} target="_blank" rel="noreferrer">View source ↗</a></div></article>)}</div>
      <nav className="free-book-pagination" aria-label="Catalog pages"><button className="btn btn-secondary" disabled={busy || search.page === 1} onClick={() => setSearch(previous => ({ ...previous, page: previous.page - 1 }))}>Previous</button><span>Page {search.page}</span><button className="btn btn-secondary" disabled={busy || !listing.hasNext} onClick={() => setSearch(previous => ({ ...previous, page: previous.page + 1 }))}>Next</button></nav>
    </>}
  </div>
}
