import { useEffect, useState } from 'react'
import './PassageSermons.css'
import { parseReference, formatReference } from '../lib/bsb'
import { matchingSermons, parseSermonReferences, twoJourneysChapterUrl } from '../lib/passageSermons'
import { DESIRING_GOD_SCRIPTURE_INDEX, SERMON_CENTRAL_BROWSE, desiringGodChapterUrl, graceToYouBookUrl, ligonierBookUrl, sermonCentralChapterUrl } from '../lib/sermonSources'

// Sermons matched to the passage from a catalog of passages (a snapshot built by a script in /scripts).
const CATALOGS = {
  spurgeon: {
    file: 'spurgeon-sermons.json',
    name: 'Charles Spurgeon',
    read: 'Read PDF',
    empty: 'No matching sermon is listed in this index for the selected passage.',
    browse: { url: 'https://www.spurgeongems.org/spurgeon-sermons/', label: 'Browse Spurgeon Gems’ full collection →' },
  },
  chrysostom: {
    file: 'chrysostom-homilies.json',
    name: 'John Chrysostom · Church Fathers',
    note: 'Preached verse by verse in the fourth century. Public-domain translation, read on New Advent.',
    read: 'Read online',
    noun: 'homilies',
    empty: 'None of Chrysostom’s homilies is indexed to the selected verses.',
    browse: { url: 'https://www.newadvent.org/fathers/', label: 'Browse the Church Fathers on New Advent →' },
    onlyWhereCovered: true,   // he preached through Matthew, John, Acts and the epistles, not every book
  },
}

const catalogs = new Map()
function loadCatalog(file) {
  if (!catalogs.has(file)) {
    catalogs.set(file, fetch(`${import.meta.env.BASE_URL}data/${file}`)
      .then(response => {
        if (!response.ok) throw new Error('Could not load the sermon index.')
        return response.json()
      })
      .then(data => data.sermons.map(sermon => ({ ...sermon, spans: parseSermonReferences(sermon.reference) })))
      .catch(error => { catalogs.delete(file); throw error }))
  }
  return catalogs.get(file)
}

// One source in "Sermons for this passage". In Bible Study's card layout (`split`) each is a card of its own,
// so no single tall card leaves a hole in the next column; elsewhere they sit together in one card.
function Block({ id, label, split, first, children }) {
  if (split) return <section className={`card passage-sermons bible-card bible-card-sermons${first ? '' : `-${id}`}`} aria-label={label} style={{ padding: '18px 20px' }}>{children}</section>
  return <div className={first ? undefined : 'mt-4 pt-3'} style={first ? undefined : { borderTop: '1px solid var(--color-divider)' }}>{children}</div>
}

function CatalogBlock({ id, source, passage, reference, selectedVerses, split, first, header }) {
  const [state, setState] = useState({ loading: true, sermons: [], error: false })
  const [retry, setRetry] = useState(0)
  const [expandedFor, setExpandedFor] = useState('')
  useEffect(() => {
    let active = true
    loadCatalog(source.file).then(sermons => {
      if (active) setState({ loading: false, sermons, error: false })
    }).catch(() => {
      if (active) setState({ loading: false, sermons: [], error: true })
    })
    return () => { active = false }
  }, [source.file, retry])
  // A catalog that doesn't cover this book has nothing to say here, so it shows nothing at all (until it has
  // loaded, and if it can't be loaded, which for a source like this is not worth an error message).
  if (source.onlyWhereCovered && (state.loading || state.error || !state.sermons.some(s => s.spans.some(span => span.book === passage.book)))) return null
  const matches = matchingSermons(state.sermons, passage, selectedVerses)
  const selectionKey = `${reference}:${selectedVerses.join(',')}`
  const visible = expandedFor === selectionKey ? matches : matches.slice(0, 6)
  return (
    <Block id={id} label={`${source.name} sermons`} split={split} first={first}>
      {header}
      <h3 className="card-kicker" style={split && !header ? { marginTop: 0 } : undefined}>{source.name}</h3>
      {source.note && <p className="card-meta">{source.note}</p>}
      {state.loading ? <p role="status" className="text-sm">Loading sermon matches…</p> : state.error ? (
        <p role="alert" className="text-sm">Couldn’t load the sermon index. <button className="btn btn-ghost" onClick={() => { setState({ loading: true, sermons: [], error: false }); setRetry(n => n + 1) }}>Try again</button></p>
      ) : !matches.length ? <p className="text-sm">{source.empty}</p> : (
        <ul className="flex flex-col gap-3 mt-2" style={{ listStyle: 'none', padding: 0 }}>
          {visible.map(sermon => <li key={sermon.url}>
            <a className="hover:underline" href={sermon.url} target="_blank" rel="noopener noreferrer">{sermon.title} →</a>
            <div className="card-meta">{sermon.reference} · {sermon.score === 2 ? 'Chapter exposition' : 'Passage overlap'} · {source.read}</div>
          </li>)}
        </ul>
      )}
      {matches.length > 6 && <button className="btn btn-ghost mt-2" aria-expanded={expandedFor === selectionKey} onClick={() => setExpandedFor(expandedFor === selectionKey ? '' : selectionKey)}>{expandedFor === selectionKey ? 'Show fewer' : `Show all ${matches.length} ${source.noun || 'sermons'}`}</button>}
      <a className="text-sm hover:underline mt-2" href={source.browse.url} target="_blank" rel="noopener noreferrer">{source.browse.label}</a>
    </Block>
  )
}

function AndyDavisBlock({ passage, split }) {
  return (
    <Block id="davis" label="Andy Davis sermons" split={split}>
      <h3 className="card-kicker" style={split ? { marginTop: 0 } : undefined}>Andy Davis · Two Journeys</h3>
      <p className="text-sm mt-1">Browse teaching indexed to {formatReference(passage.book, passage.chapter)} on Two Journeys, including available sermons and transcripts. Their chapter index may also include classes, podcasts, and devotionals.</p>
      <a className="btn btn-secondary mt-2" href={twoJourneysChapterUrl(passage.book, passage.chapter)} target="_blank" rel="noopener noreferrer">Open {passage.book} {passage.chapter} on Two Journeys →</a>
      <a className="text-sm hover:underline mt-2" href="https://twojourneys.org/sermons/" target="_blank" rel="noopener noreferrer">Browse all Andy Davis sermons →</a>
    </Block>
  )
}

function DesiringGodBlock({ passage, split }) {
  const url = desiringGodChapterUrl(passage.book, passage.chapter)
  if (!url) return null   // Desiring God has no page for this book
  return (
    <Block id="dg" label="John Piper sermons" split={split}>
      <h3 className="card-kicker" style={split ? { marginTop: 0 } : undefined}>John Piper · Desiring God</h3>
      <p className="text-sm mt-1">Piper’s messages on {formatReference(passage.book, passage.chapter)}. Desiring God has a page only for chapters it has something on, so if this one says it can’t be found, browse from its Scripture index.</p>
      <a className="btn btn-secondary mt-2" href={url} target="_blank" rel="noopener noreferrer">Open {passage.book} {passage.chapter} messages on Desiring God →</a>
      <a className="text-sm hover:underline mt-2" href={DESIRING_GOD_SCRIPTURE_INDEX} target="_blank" rel="noopener noreferrer">Browse Desiring God by Scripture →</a>
    </Block>
  )
}

function SermonCentralBlock({ passage, split }) {
  const url = sermonCentralChapterUrl(passage.book, passage.chapter)
  return (
    <Block id="central" label="SermonCentral sermons" split={split}>
      <h3 className="card-kicker" style={split ? { marginTop: 0 } : undefined}>Pastors’ sermons · SermonCentral</h3>
      <p className="text-sm mt-1">Sermons from many pastors on {formatReference(passage.book, passage.chapter)}, with outlines and illustrations. Some items on SermonCentral need a free account.</p>
      <a className="btn btn-secondary mt-2" href={url} target="_blank" rel="noopener noreferrer">Open {passage.book} {passage.chapter} on SermonCentral →</a>
      <a className="text-sm hover:underline mt-2" href={SERMON_CENTRAL_BROWSE} target="_blank" rel="noopener noreferrer">Browse SermonCentral by Scripture →</a>
    </Block>
  )
}

// Teachers whose sites list their sermons by book, not by chapter.
function MoreTeachingBlock({ passage, split }) {
  return (
    <Block id="more" label={`More teaching on ${passage.book}`} split={split}>
      <h3 className="card-kicker" style={split ? { marginTop: 0 } : undefined}>More teaching on {passage.book}</h3>
      <p className="text-sm mt-1">These sites list their teaching by book rather than by chapter.</p>
      <a className="text-sm hover:underline mt-2" href={ligonierBookUrl(passage.book)} target="_blank" rel="noopener noreferrer">R.C. Sproul and Ligonier on {passage.book} →</a>
      <a className="text-sm hover:underline mt-2" href={graceToYouBookUrl(passage.book)} target="_blank" rel="noopener noreferrer">John MacArthur on {passage.book} (Grace to You) →</a>
    </Block>
  )
}

export default function PassageSermons({ reference, selectedVerses = [], split = false }) {
  const passage = parseReference(reference?.replace(/[–—]/g, '-'))
  if (!passage || passage.chapter < 1) return null
  const header = (
    <>
      <h2 className="card-title">Sermons for this passage</h2>
      <p className="card-meta mb-3">{reference} · Sermon links open in a new tab.</p>
    </>
  )
  const common = { passage, reference, selectedVerses, split }
  const blocks = (
    <>
      <CatalogBlock id="spurgeon" source={CATALOGS.spurgeon} {...common} first header={split ? header : undefined} />
      <CatalogBlock id="chrysostom" source={CATALOGS.chrysostom} {...common} />
      <AndyDavisBlock {...common} />
      <DesiringGodBlock {...common} />
      <SermonCentralBlock {...common} />
      <MoreTeachingBlock {...common} />
    </>
  )
  if (split) return blocks
  return <section className="card mt-4 passage-sermons" aria-label="Sermons for this passage" style={{ padding: '18px 20px' }}>{header}{blocks}</section>
}
