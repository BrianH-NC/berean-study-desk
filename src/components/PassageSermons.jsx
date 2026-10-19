import { useEffect, useState } from 'react'
import './PassageSermons.css'
import { parseReference, formatReference } from '../lib/bsb'
import { matchingSermons, parseSermonReferences, twoJourneysChapterUrl } from '../lib/passageSermons'

let catalogPromise
function loadCatalog() {
  if (!catalogPromise) {
    catalogPromise = fetch(`${import.meta.env.BASE_URL}data/spurgeon-sermons.json`)
      .then(response => {
        if (!response.ok) throw new Error('Could not load the sermon index.')
        return response.json()
      })
      .then(data => data.sermons.map(sermon => ({ ...sermon, spans: parseSermonReferences(sermon.reference) })))
      .catch(error => { catalogPromise = undefined; throw error })
  }
  return catalogPromise
}

export default function PassageSermons({ reference, selectedVerses = [] }) {
  const passage = parseReference(reference?.replace(/[–—]/g, '-'))
  const [state, setState] = useState({ loading: true, sermons: [], error: false })
  const [retry, setRetry] = useState(0)
  const [expandedFor, setExpandedFor] = useState('')
  useEffect(() => {
    let active = true
    loadCatalog().then(sermons => {
      if (active) setState({ loading: false, sermons, error: false })
    }).catch(() => {
      if (active) setState({ loading: false, sermons: [], error: true })
    })
    return () => { active = false }
  }, [retry])
  if (!passage || passage.chapter < 1) return null
  const matches = matchingSermons(state.sermons, passage, selectedVerses)
  const selectionKey = `${reference}:${selectedVerses.join(',')}`
  const visible = expandedFor === selectionKey ? matches : matches.slice(0, 6)
  return (
    <section className="card mt-4 passage-sermons" aria-label="Sermons for this passage" style={{ padding: '18px 20px' }}>
      <h2 className="card-title">Sermons for this passage</h2>
      <p className="card-meta mb-3">{reference} · Sermon links open in a new tab.</p>
      <h3 className="card-kicker">Charles Spurgeon</h3>
      {state.loading ? <p role="status" className="text-sm">Loading sermon matches…</p> : state.error ? (
        <p role="alert" className="text-sm">Couldn’t load the sermon index. <button className="btn btn-ghost" onClick={() => { setState({ loading: true, sermons: [], error: false }); setRetry(n => n + 1) }}>Try again</button></p>
      ) : !matches.length ? <p className="text-sm">No matching sermon is listed in this index for the selected passage.</p> : (
        <ul className="flex flex-col gap-3 mt-2" style={{ listStyle: 'none', padding: 0 }}>
          {visible.map(sermon => <li key={sermon.url}>
            <a className="hover:underline" href={sermon.url} target="_blank" rel="noopener noreferrer">{sermon.title} →</a>
            <div className="card-meta">{sermon.reference} · {sermon.score === 2 ? 'Chapter exposition' : 'Passage overlap'} · Read PDF</div>
          </li>)}
        </ul>
      )}
      {matches.length > 6 && <button className="btn btn-ghost mt-2" aria-expanded={expandedFor === selectionKey} onClick={() => setExpandedFor(expandedFor === selectionKey ? '' : selectionKey)}>{expandedFor === selectionKey ? 'Show fewer' : `Show all ${matches.length} sermons`}</button>}
      <a className="text-sm hover:underline mt-2" href="https://www.spurgeongems.org/spurgeon-sermons/" target="_blank" rel="noopener noreferrer">Browse Spurgeon Gems’ full collection →</a>
      <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--color-divider)' }}>
        <h3 className="card-kicker">Andy Davis · Two Journeys</h3>
        <p className="text-sm mt-1">Browse teaching indexed to {formatReference(passage.book, passage.chapter)} on Two Journeys, including available sermons and transcripts. Their chapter index may also include classes, podcasts, and devotionals.</p>
        <a className="btn btn-secondary mt-2" href={twoJourneysChapterUrl(passage.book, passage.chapter)} target="_blank" rel="noopener noreferrer">Open {passage.book} {passage.chapter} on Two Journeys →</a>
        <a className="text-sm hover:underline mt-2" href="https://twojourneys.org/sermons/" target="_blank" rel="noopener noreferrer">Browse all Andy Davis sermons →</a>
      </div>
    </section>
  )
}
