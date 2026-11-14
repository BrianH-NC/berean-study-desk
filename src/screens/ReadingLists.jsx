import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Search as SearchIcon, Star } from 'lucide-react'
import { useAuth } from '../App'
import { ownedRows } from '../lib/dailyStudyData'
import { addToLibrary, addToWishlist, loadListItems, loadLists, removeFromWishlist } from '../lib/readingListsData'
import { buildLibraryIndex, citation, filterItems, groupItems, statusMap, summarize } from '../lib/readingLists'
import './ReadingLists.css'

const PAGE = 150
const STATUS_OPTIONS = [['', 'Any status'], ['missing', 'Not in my library yet'], ['owned', 'In my library'], ['wishlist', 'On my wishlist']]

function LevelChips({ item, legend }) {
  // Capitals are the primary audience; a lowercase code is the list's lighter secondary mark.
  return (item.level_codes || '').split('').map((code, i) => {
    const entry = legend[code.toUpperCase()]
    return <span key={i} className={`tag tag-outline rl-level${code === code.toLowerCase() ? ' is-secondary' : ''}`} title={entry?.description}>{entry?.label || code}</span>
  })
}

function Row({ item, status, legend, busy, onWish, onOwn }) {
  const { status: state, book } = status
  return (
    <li className="rl-row">
      <div className="rl-main">
        <div className="rl-title">
          {item.is_first_pick && <Star size={14} className="rl-star" fill="currentColor" aria-label="First suggested selection" />}
          <span>{item.title}</span>
        </div>
        <div className="card-meta">{[item.author, citation(item), item.edition_note].filter(Boolean).join(' · ')}</div>
        <div className="rl-tags">
          {item.series && <span className="tag tag-neutral" title={item.series_name || undefined}>{item.series}</span>}
          {!item.series && item.series_name && <span className="tag tag-neutral">{item.series_name}</span>}
          <LevelChips item={item} legend={legend} />
        </div>
      </div>
      <div className="rl-side">
        {state === 'owned' && <Link to={`/shelf/${book.id}`} className="tag tag-accent">In your library</Link>}
        {state === 'wishlist' && <Link to="/shelf/wishlist" className="tag tag-neutral">On your wishlist</Link>}
        {state === 'maybe' && <span className="card-meta">Maybe in your library: <Link to={`/shelf/${book.id}`}>{book.title}</Link></span>}
        {state !== 'owned' && (
          <div className="rl-actions">
            {state !== 'wishlist' && <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => onWish(item)}>Add to wishlist</button>}
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => onOwn(item)}>I own this</button>
          </div>
        )}
      </div>
    </li>
  )
}

export default function ReadingLists() {
  const user = useAuth()
  const navigate = useNavigate()
  const { slug } = useParams()
  const [params, setParams] = useSearchParams()
  const [lists, setLists] = useState(null)
  const [items, setItems] = useState(null)
  const [books, setBooks] = useState([])
  const [wishlist, setWishlist] = useState([])
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [visible, setVisible] = useState(PAGE)
  const [retry, setRetry] = useState(0)

  const list = lists?.find((l) => l.slug === slug) || lists?.[0] || null
  const legend = list?.legend || {}

  useEffect(() => {
    let active = true
    setError('')
    Promise.all([loadLists(), ownedRows('books', user.id, 'id,title,author'), ownedRows('wishlist', user.id, 'id,title,author')])
      .then(([l, b, w]) => { if (active) { setLists(l); setBooks(b); setWishlist(w) } })
      .catch((e) => { if (active) setError(e.message || 'Could not load reading lists.') })
    return () => { active = false }
  }, [user.id, retry])

  const listId = list?.id
  useEffect(() => {
    if (!listId) return
    let active = true
    setItems(null)
    loadListItems(listId).then((rows) => { if (active) setItems(rows) }).catch((e) => { if (active) setError(e.message || 'Could not load this list.') })
    return () => { active = false }
  }, [listId, retry])

  const q = params.get('q') || '', level = params.get('level') || '', firstOnly = params.get('first') === '1'
  const status = params.get('status') || '', section = params.get('section') || '', book = params.get('book') || ''
  const filters = useMemo(() => ({ q, level, firstOnly, status, section, book }), [q, level, firstOnly, status, section, book])
  const active = Object.values(filters).some(Boolean)
  const update = (changes) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) { if (value) next.set(key, value); else next.delete(key) }
    setVisible(PAGE)
    setParams(next, { replace: true })
  }

  const index = useMemo(() => buildLibraryIndex(books, wishlist), [books, wishlist])
  const statuses = useMemo(() => statusMap(items || [], index), [items, index])
  const summary = useMemo(() => summarize(items || [], statuses), [items, statuses])
  const filtered = useMemo(() => filterItems(items || [], filters, statuses), [items, statuses, filters])
  const groups = useMemo(() => groupItems(filtered.slice(0, visible)), [filtered, visible])

  async function run(item, work) {
    setBusyId(item.id); setActionError('')
    try { await work() } catch (e) { setActionError(`Could not update “${item.title}”: ${e.message}`) } finally { setBusyId(null) }
  }
  const onWish = (item) => run(item, async () => { const row = await addToWishlist(user.id, item, list.name); setWishlist((w) => [...w, row]) })
  const onOwn = (item) => {
    const state = statuses.get(item.id) || { status: 'none' }
    if (state.status === 'maybe' && !confirm(`“${state.book.title}” in your library looks like this book. Add another copy anyway?`)) return
    return run(item, async () => {
      const row = await addToLibrary(user.id, item)
      setBooks((b) => [...b, row])
      if (state.status === 'wishlist') {
        await removeFromWishlist(user.id, state.wish.id)
        setWishlist((w) => w.filter((x) => x.id !== state.wish.id))
      }
    })
  }

  if (error) return <div className="max-w-[1100px] mx-auto page"><div className="card p-4" role="alert">{error} <button className="btn btn-secondary" onClick={() => setRetry((n) => n + 1)}>Retry</button></div></div>
  if (!lists) return <div className="max-w-[1100px] mx-auto page"><div className="text-center py-24" style={{ opacity: 0.5 }}>Loading reading lists…</div></div>
  if (!list) return <div className="max-w-[1100px] mx-auto page"><div className="card p-4"><h1>Reading lists</h1><p>There are no reading lists yet.</p></div></div>

  const { total } = summary
  const percent = total.works ? Math.round((total.owned / total.works) * 100) : 0
  const loading = items === null

  return (
    <div className="max-w-[1100px] mx-auto page reading-lists">
      <div className="card-meta mb-2"><Link to="/shelf" className="hover:underline">← My Library</Link></div>
      <div className="card-kicker mb-1">Reading list</div>
      <h1 className="!mb-1">{list.name}</h1>
      {lists.length > 1 && (
        <div className="seg mb-3" role="tablist" aria-label="Reading lists">
          {lists.map((l) => <button key={l.id} type="button" role="tab" aria-selected={l.id === list.id} className="seg-opt" style={l.id === list.id ? { background: 'var(--color-accent)', color: 'var(--color-bg)' } : undefined} onClick={() => navigate(`/shelf/lists/${l.slug}`)}>{l.name}</button>)}
        </div>
      )}
      <p className="rl-about">{list.description}</p>
      <p className="card-meta">{[list.source_title && `Source: ${list.source_title}`, list.curator && `Curated by ${list.curator}`].filter(Boolean).join(' · ')}</p>
      <dl className="rl-legend">
        {list.first_pick_label && <div><dt><Star size={13} className="rl-star" fill="currentColor" aria-hidden="true" /> {list.first_pick_label}</dt><dd>Where the list says to start.</dd></div>}
        {Object.entries(legend).map(([code, entry]) => <div key={code}><dt><span className="tag tag-outline">{entry.label}</span></dt><dd>{entry.description}</dd></div>)}
      </dl>

      {loading ? <div className="text-center py-16" style={{ opacity: 0.5 }}>Loading {list.name}…</div> : (
        <>
          <section className="card rl-summary" aria-label="Your progress">
            <div className="rl-figure"><strong>{total.owned}</strong><span>of {total.works} works in your library <small>({percent}%)</small></span></div>
            <div className="rl-figure"><strong>{total.firstPicksOwned}</strong><span>of {total.firstPicks} first selections</span></div>
            <div className="rl-figure"><strong>{total.wishlist}</strong><span>on your wishlist</span></div>
          </section>

          <div className="rl-filters">
            <div className="relative rl-search">
              <SearchIcon size={15} strokeWidth={2.75} className="absolute top-1/2 -translate-y-1/2" style={{ left: 14, opacity: 0.5 }} aria-hidden="true" />
              <input className="input" style={{ paddingLeft: 36 }} placeholder="Search title, author, series, or topic…" aria-label="Search this list" value={filters.q} onChange={(e) => update({ q: e.target.value })} />
            </div>
            <select className="input" aria-label="Section" value={filters.section} onChange={(e) => update({ section: e.target.value })}>
              <option value="">All sections</option>
              {summary.sections.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
            <select className="input" aria-label="Level" value={filters.level} onChange={(e) => update({ level: e.target.value })}>
              <option value="">Any level</option>
              {Object.entries(legend).map(([code, entry]) => <option key={code} value={code}>{entry.label}</option>)}
            </select>
            <select className="input" aria-label="Status" value={filters.status} onChange={(e) => update({ status: e.target.value })}>
              {STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <label className="rl-check"><input type="checkbox" checked={filters.firstOnly} onChange={(e) => update({ first: e.target.checked ? '1' : '' })} /> First selections only</label>
          </div>
          {filters.book && <p className="rl-chip-row"><span className="tag tag-accent">About {filters.book}</span> <button type="button" className="btn btn-ghost" onClick={() => update({ book: '' })}>Show everything</button></p>}
          {actionError && <p role="alert" className="rl-error">{actionError}</p>}

          {!active ? (
            <section aria-label="Sections">
              <h2 className="rl-heading">Browse by section</h2>
              <div className="rl-sections">
                {summary.sections.map((s) => (
                  <button key={s.name} type="button" className="card rl-section" onClick={() => update({ section: s.name })}>
                    <strong className="rl-section-name">{s.name}</strong>
                    <span className="card-meta">{s.owned} of {s.works} in your library</span>
                    {s.firstPicks > 0 && (
                      <>
                        <span className="rl-bar" role="progressbar" aria-label={`First selections owned in ${s.name}`} aria-valuemin={0} aria-valuemax={s.firstPicks} aria-valuenow={s.firstPicksOwned}><span style={{ width: `${(s.firstPicksOwned / s.firstPicks) * 100}%` }} /></span>
                        <span className="card-meta">{s.firstPicksOwned} of {s.firstPicks} first selections</span>
                      </>
                    )}
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <section aria-label="Results">
              <p className="rl-count" role="status">
                {filtered.length ? `${filtered.length} ${filtered.length === 1 ? 'entry' : 'entries'}${filtered.length > visible ? `, showing ${visible}` : ''}` : 'Nothing matches those filters.'}
                {' '}<button type="button" className="btn btn-ghost" onClick={() => { setVisible(PAGE); setParams({}, { replace: true }) }}>{filters.section && !filters.q && !filters.level && !filters.status && !filters.firstOnly && !filters.book ? '← All sections' : 'Clear filters'}</button>
              </p>
              {groups.map((group) => (
                <div key={group.key} className="rl-group">
                  <h3>{[!filters.section && group.section, group.subsection, group.topic].filter(Boolean).join(' › ') || group.section}</h3>
                  <ul>
                    {group.items.map((item) => <Row key={item.id} item={item} status={statuses.get(item.id) || { status: 'none' }} legend={legend} busy={busyId === item.id} onWish={onWish} onOwn={onOwn} />)}
                  </ul>
                </div>
              ))}
              {filtered.length > visible && <p className="text-center"><button type="button" className="btn btn-secondary" onClick={() => setVisible((v) => v + PAGE)}>Show {Math.min(PAGE, filtered.length - visible)} more</button></p>}
            </section>
          )}
        </>
      )}
    </div>
  )
}
