import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Mic, Search, Star, SlidersHorizontal, Users, Check } from 'lucide-react'
import { useAuth } from '../App'
import { listSermons } from '../lib/sermons'
import { SERMON_SOURCES, sermonTitle, filterSermons } from '../lib/sermonModel'
import './Sermons.css'

const when = s => s.sermon_date || s.created_at?.slice(0, 10) || ''
const shortDate = day => day ? new Date(`${day.slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''

// Sermons grouped by series, newest series first; filters stay one click away.
export function groupBySeries(rows) {
  const groups = new Map()
  for (const s of rows) { const key = s.series?.trim() || ''; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(s) }
  return [...groups.entries()].map(([series, items]) => ({ series, items: items.sort((a, b) => when(b).localeCompare(when(a))) }))
    .sort((a, b) => (a.series === '') - (b.series === '') || when(b.items[0]).localeCompare(when(a.items[0])))
}

export default function SermonIndex() {
  const user = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [filter, setFilter] = useState({})
  useEffect(() => { let active = true; listSermons(user.id).then(data => { if (active) { setRows(data); setError(''); setLoading(false) } }).catch(e => { if (active) { setError(e.message); setLoading(false) } }); return () => { active = false } }, [user.id, retry])
  const set = (k, v) => setFilter(f => ({ ...f, [k]: v }))
  const distinct = k => [...new Set(rows.map(s => s[k]).filter(Boolean))].sort()
  const groups = useMemo(() => groupBySeries(filterSermons(rows, filter)), [rows, filter])
  const activeFilters = Object.entries(filter).filter(([k, v]) => v && k !== 'query').length

  return <div className="page sermons-page sermons-index">
    <header className="sermons-head"><h1>Sermons</h1><div className="sermon-actions"><Link className="btn btn-ghost" to="/dgroup"><Users size={16} aria-hidden="true" />D-Group</Link><Link className="btn btn-secondary" to="/sermons/new?source=sermonaudio">Add from SermonAudio</Link><Link className="btn btn-primary" to="/sermons/new">New sermon</Link></div></header>
    <div className="sermons-tools">
      <label className="sermons-search"><Search size={16} aria-hidden="true" /><span className="sr-only">Search sermons</span><input type="search" placeholder="Search title, speaker, series, topic or passage" value={filter.query || ''} onChange={e => set('query', e.target.value)} /></label>
      <details className="sermons-filters"><summary className="btn btn-secondary"><SlidersHorizontal size={16} aria-hidden="true" />Filters{activeFilters ? ` (${activeFilters})` : ''}</summary>
        <div className="sermons-filter-grid">
          {[['series', 'Series', distinct('series').map(s => [s, s])], ['speaker', 'Speaker', distinct('speaker').map(s => [s, s])], ['tag', 'Topic', [...new Set(rows.flatMap(s => s.tags))].sort().map(s => [s, s])], ['church', 'Church', distinct('church').map(s => [s, s])], ['source', 'Source', Object.entries(SERMON_SOURCES)]].map(([key, label, options]) => <label key={key}>{label}<select className="input" value={filter[key] || ''} onChange={e => set(key, e.target.value)}><option value="">All</option>{options.map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select></label>)}
          <label>Preached from<input type="date" className="input" value={filter.from || ''} onChange={e => set('from', e.target.value)} /></label>
          <label>Through<input type="date" className="input" value={filter.to || ''} onChange={e => set('to', e.target.value)} /></label>
          <label>Transcript<select className="input" value={filter.transcript || ''} onChange={e => set('transcript', e.target.value)}><option value="">Either</option><option value="yes">Has one</option><option value="no">None yet</option></select></label>
          <label className="sermons-fav"><input type="checkbox" checked={!!filter.favorite} onChange={e => set('favorite', e.target.checked)} />Favorites only</label>
          <button type="button" className="btn btn-ghost" onClick={() => setFilter(f => ({ query: f.query || '' }))}>Clear filters</button>
        </div>
      </details>
    </div>
    {error && <p role="alert">{error} <button className="btn btn-ghost" onClick={() => setRetry(n => n + 1)}>Retry</button></p>}
    {loading ? <p role="status">Loading sermons…</p> : rows.length === 0 ? <section className="sermons-empty"><Mic size={28} aria-hidden="true" /><h2>No sermons yet</h2><p>Add Sunday’s sermon from SermonAudio or paste a transcript.</p></section>
      : groups.length === 0 ? <p>No sermons match. <button className="btn btn-ghost" onClick={() => setFilter({})}>Clear search and filters</button></p>
      : groups.map(g => <section className="sermon-series" key={g.series || 'other'} aria-labelledby={`series-${g.series || 'other'}`}>
        <div className="sermon-series-head"><h2 id={`series-${g.series || 'other'}`}>{g.series || 'Other sermons'}</h2><span>{g.items.length} {g.items.length === 1 ? 'sermon' : 'sermons'}</span></div>
        <ul>{g.items.map(s => <li key={s.id}><Link to={`/sermons/${s.id}`}>
          <span className="sermon-row-main"><strong>{sermonTitle(s)}{s.favorite && <Star size={13} aria-label="Favorite" />}</strong><small>{[s.speaker, s.primary_text || s.detected_refs?.[0]?.raw].filter(Boolean).join(' · ')}</small></span>
          <span className="sermon-row-side">{s.study_guide && <span className="sermon-guide-chip"><Check size={12} aria-hidden="true" />Study guide</span>}<small>{shortDate(s.sermon_date)}</small></span>
        </Link></li>)}</ul>
      </section>)}
  </div>
}
