import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../App'
import { chapterSermons, versesLabel } from '../lib/sermonIndexData'
import { saveSermonIndexSermon } from '../lib/sermonIndexImport'
import './PassageSermons.css'
import { parseReference, formatReference } from '../lib/bsb'
import { matchingSermons, parseSermonReferences, twoJourneysChapterUrl } from '../lib/passageSermons'
import { bookFor } from '../lib/scriptureBooks'
import { catenaUrl, DESIRING_GOD_SCRIPTURE_INDEX, OPEN_THE_BIBLE_BROWSE, SERMON_CENTRAL_BROWSE, SERMON_INDEX_SPEAKERS, desiringGodChapterUrl, graceToYouBookUrl, ligonierBookUrl, openTheBibleChapterUrl, sermonCentralChapterUrl, sermonCountPhrase, sermonIndexChapter } from '../lib/sermonSources'

// Sermons matched to the passage from a catalog of passages (a snapshot built by a script in /scripts).
const CATALOGS = {
  spurgeon: {
    file: 'spurgeon-sermons.json',
    name: 'Charles Spurgeon',
    read: 'Read PDF',
    empty: 'No matching sermon is listed in this index for the selected passage.',
    browse: { url: 'https://www.spurgeongems.org/spurgeon-sermons/', label: 'Browse Spurgeon Gems’ full collection →' },
  },
  fathers: {
    files: ['chrysostom-homilies.json', 'augustine-sermons.json'],
    name: 'Church Fathers',
    note: 'Chrysostom preached verse by verse through Matthew, John, Acts and the letters from Romans to Hebrews; Augustine through John, 1 John and the Psalms, with sermons on many Gospel passages. Public-domain translations, read on New Advent.',
    read: 'Read online',
    noun: 'sermons',
    empty: 'None of their sermons is indexed to the selected verses.',
    browse: { url: 'https://www.newadvent.org/fathers/', label: 'Browse the Church Fathers on New Advent →' },
    showAuthor: true,
    onlyWhereCovered: true,   // they don't cover every book, so a book they don't touch shows no card
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
      .then(data => data.sermons.map(sermon => ({ ...sermon, author: data.author, spans: parseSermonReferences(sermon.reference) })))
      .catch(error => { catalogs.delete(file); throw error }))
  }
  return catalogs.get(file)
}
const loadCatalogs = files => Promise.all(files.map(loadCatalog)).then(lists => lists.flat())

// Which chapters SermonIndex and Open the Bible have teaching on (a small snapshot; see scripts/snapshot-sermon-chapters.mjs).
// Null until it has loaded, and if it can't be, since the cards that need it are then simply left out.
let chapterSnapshot
function useChapterSnapshot() {
  const [snapshot, setSnapshot] = useState(null)
  useEffect(() => {
    let active = true
    chapterSnapshot ||= fetch(`${import.meta.env.BASE_URL}data/sermon-chapters.json`)
      .then(response => { if (!response.ok) throw new Error('snapshot'); return response.json() })
      .catch(() => { chapterSnapshot = undefined; return null })
    chapterSnapshot.then(data => { if (active) setSnapshot(data) })
    return () => { active = false }
  }, [])
  return snapshot
}

// One source in "Sermons for this passage". In Bible Study's card layout (`split`) each is a card of its own,
// so no single tall card leaves a hole in the next column; elsewhere they sit together in one card.
function Block({ id, label, split, first, children }) {
  if (split) return <section className={`card passage-sermons bible-card bible-card-sermons${first ? '' : `-${id}`}`} aria-label={label} style={{ padding: '18px 20px' }}>{children}</section>
  return <div className={first ? undefined : 'mt-4 pt-3'} style={first ? undefined : { borderTop: '1px solid var(--color-divider)' }}>{children}</div>
}

function CatalogBlock({ id, source, passage, reference, selectedVerses, split, first, header, extra }) {
  const [state, setState] = useState({ loading: true, sermons: [], error: false })
  const [retry, setRetry] = useState(0)
  const [expandedFor, setExpandedFor] = useState('')
  useEffect(() => {
    let active = true
    loadCatalogs(source.files || [source.file]).then(sermons => {
      if (active) setState({ loading: false, sermons, error: false })
    }).catch(() => {
      if (active) setState({ loading: false, sermons: [], error: true })
    })
    return () => { active = false }
  }, [source, retry])
  // A catalog that doesn't cover this book has nothing to say here, so it shows no list (until it has loaded, and
  // if it can't be loaded, which for a source like this is not worth an error message). The card is then just
  // its `extra`, or nothing at all.
  const quiet = source.onlyWhereCovered && (state.loading || state.error || !state.sermons.some(s => s.spans.some(span => span.book === passage.book)))
  if (quiet && !extra) return null
  const matches = matchingSermons(state.sermons, passage, selectedVerses)
  const selectionKey = `${reference}:${selectedVerses.join(',')}`
  const visible = expandedFor === selectionKey ? matches : matches.slice(0, 6)
  return (
    <Block id={id} label={`${source.name} sermons`} split={split} first={first}>
      {header}
      <h3 className="card-kicker" style={split && !header ? { marginTop: 0 } : undefined}>{source.name}</h3>
      {!quiet && source.note && <p className="card-meta">{source.note}</p>}
      {quiet ? null : state.loading ? <p role="status" className="text-sm">Loading sermon matches…</p> : state.error ? (
        <p role="alert" className="text-sm">Couldn’t load the sermon index. <button className="btn btn-ghost" onClick={() => { setState({ loading: true, sermons: [], error: false }); setRetry(n => n + 1) }}>Try again</button></p>
      ) : !matches.length ? <p className="text-sm">{source.empty}</p> : (
        <ul className="flex flex-col gap-3 mt-2" style={{ listStyle: 'none', padding: 0 }}>
          {visible.map(sermon => <li key={sermon.url}>
            <a className="hover:underline" href={sermon.url} target="_blank" rel="noopener noreferrer">{sermon.title} →</a>
            <div className="card-meta">{source.showAuthor && sermon.author ? `${sermon.author} · ` : ''}{sermon.reference} · {sermon.score === 2 ? 'Chapter exposition' : 'Passage overlap'} · {source.read}</div>
          </li>)}
        </ul>
      )}
      {!quiet && matches.length > 6 && <button className="btn btn-ghost mt-2" aria-expanded={expandedFor === selectionKey} onClick={() => setExpandedFor(expandedFor === selectionKey ? '' : selectionKey)}>{expandedFor === selectionKey ? 'Show fewer' : `Show all ${matches.length} ${source.noun || 'sermons'}`}</button>}
      {!quiet && <a className="text-sm hover:underline mt-2" href={source.browse.url} target="_blank" rel="noopener noreferrer">{source.browse.label}</a>}
      {extra}
    </Block>
  )
}

// The Fathers on every verse of the Bible, which the two catalogs above don't reach. Catena shows the start of each
// passage and asks for a free account to read the rest, so the card says so before sending anyone there.
function CatenaLink({ passage, selectedVerses }) {
  const verse = selectedVerses[0] || passage.verseStart
  const url = catenaUrl(bookFor(passage.book), passage.chapter, verse)
  if (!url) return null
  return (
    <div className="mt-2">
      <p className="text-sm">Catena gathers what Ambrose, Hilary, Chrysostom and other Fathers wrote on {verse ? 'this verse' : 'each verse of this chapter'}, in any book of the Bible. It shows the start of each passage and asks for a free account to read the rest.</p>
      <a className="btn btn-secondary mt-2" href={url} target="_blank" rel="noopener noreferrer">Open {formatReference(passage.book, passage.chapter, verse)} on Catena →</a>
    </div>
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

// SermonIndex's sermons on the chapter, best suited first, from a per-book snapshot of its bulk download
// (scripts/snapshot-sermonindex-passages.mjs). Each can be saved into the reader's own Sermons library.
const sermonIndexBooks = new Map()
function loadSermonIndexBook(bookNumber) {
  if (!sermonIndexBooks.has(bookNumber)) {
    sermonIndexBooks.set(bookNumber, fetch(`${import.meta.env.BASE_URL}data/sermonindex/${bookNumber}.json`)
      .then(response => { if (!response.ok) throw new Error('index'); return response.json() })
      .catch(error => { sermonIndexBooks.delete(bookNumber); throw error }))
  }
  return sermonIndexBooks.get(bookNumber)
}

function SaveSermonButton({ sermon, passage }) {
  const user = useAuth()
  const [state, setState] = useState({})
  if (!user) return null
  if (state.id) return <Link className="si-save is-saved" to={`/sermons/${state.id}`}>{state.existing ? 'Already saved · Open' : 'Saved · Open'} →</Link>
  return <>
    <button type="button" className="si-save" disabled={state.busy} aria-label={`Save “${sermon.title}” to my Sermons`} onClick={async () => {
      setState({ busy: true })
      try { setState(await saveSermonIndexSermon(user.id, sermon.id, passage)) } catch (error) { setState({ error: error.message || 'Could not save this sermon.' }) }
    }}>{state.busy ? 'Saving…' : 'Save to my Sermons'}</button>
    {state.error && <small role="alert" className="si-save-error">{state.error}</small>}
  </>
}

function SermonIndexBlock({ passage, selectedVerses, split }) {
  const snapshot = useChapterSnapshot()
  const bookNumber = bookFor(passage.book)
  const found = sermonIndexChapter(snapshot, bookNumber, passage.chapter)
  const [state, setState] = useState({ loading: true })
  const [retry, setRetry] = useState(0)
  const [showAll, setShowAll] = useState(false)
  useEffect(() => {
    let active = true
    if (!bookNumber) return
    loadSermonIndexBook(bookNumber).then(data => { if (active) setState({ data }) }).catch(() => { if (active) setState({ error: true }) })
    return () => { active = false }
  }, [bookNumber, retry])
  useEffect(() => { setShowAll(false) }, [bookNumber, passage.chapter])
  const { total, sermons } = chapterSermons(state.data, passage.chapter, selectedVerses)
  if (!found && !sermons.length) return null
  const shown = showAll ? sermons : sermons.slice(0, 5)
  const chapterUrl = found?.url || `https://www.sermonindex.net/bible/BSB/${state.data?.book || ''}/${passage.chapter}/#sec-sermons`
  return (
    <Block id="index" label="SermonIndex sermons" split={split}>
      <h3 className="card-kicker" style={split ? { marginTop: 0 } : undefined}>Free sermons · SermonIndex</h3>
      {state.loading ? <p className="text-sm mt-1" role="status">Loading sermons…</p>
        : state.error ? <p className="text-sm mt-1" role="alert">The sermon list could not load. <button className="btn btn-ghost" onClick={() => { setState({ loading: true }); setRetry(n => n + 1) }}>Retry</button></p>
        : <>
          <p className="text-sm mt-1">{sermonCountPhrase(found?.count || total)} on {formatReference(passage.book, passage.chapter)}.{selectedVerses.length ? ' Sermons on your selected verses come first.' : ' Those centred on this chapter come first.'}</p>
          <ul className="si-sermons">
            {shown.map(s => <li key={s.id}>
              {s.image ? <img src={s.image} alt="" loading="lazy" width="40" height="40" /> : <span className="si-portrait" aria-hidden="true">{s.speaker.slice(0, 1)}</span>}
              <div>
                <a href={s.url} target="_blank" rel="noopener noreferrer"><strong>{s.title}</strong></a>
                <small>{[s.speaker, s.duration, s.media, versesLabel(passage.chapter, s.verses)].filter(Boolean).join(' · ')}{s.onSelected && <span className="si-on-selected"> · on your selection</span>}</small>
                <SaveSermonButton sermon={s} passage={passage} />
              </div>
            </li>)}
          </ul>
          {sermons.length > 5 && <button className="btn btn-ghost text-sm" onClick={() => setShowAll(v => !v)}>{showAll ? 'Show fewer' : `Show ${sermons.length - 5} more`}</button>}
        </>}
      <a className="btn btn-secondary mt-2" href={chapterUrl} target="_blank" rel="noopener noreferrer">All sermons on {passage.book} {passage.chapter} at SermonIndex →</a>
      <a className="text-sm hover:underline mt-2" href={SERMON_INDEX_SPEAKERS} target="_blank" rel="noopener noreferrer">Browse SermonIndex by speaker →</a>
      <small className="si-credit">Sermon list from <a href="https://www.sermonindex.net/" target="_blank" rel="noopener noreferrer">SermonIndex.net</a>, freely given for ministry use.</small>
    </Block>
  )
}

function OpenTheBibleBlock({ passage, split }) {
  const url = openTheBibleChapterUrl(useChapterSnapshot(), passage.book, passage.chapter)
  if (!url) return null   // Open the Bible has a page only for the chapters it has taught on
  return (
    <Block id="otb" label="Open the Bible sermons" split={split}>
      <h3 className="card-kicker" style={split ? { marginTop: 0 } : undefined}>Colin Smith · Open the Bible</h3>
      <p className="text-sm mt-1">Pastor Colin Smith’s sermons, broadcasts and daily devotionals on {formatReference(passage.book, passage.chapter)}.</p>
      <a className="btn btn-secondary mt-2" href={url} target="_blank" rel="noopener noreferrer">Open {passage.book} {passage.chapter} on Open the Bible →</a>
      <a className="text-sm hover:underline mt-2" href={OPEN_THE_BIBLE_BROWSE} target="_blank" rel="noopener noreferrer">Browse Open the Bible by Scripture →</a>
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
      <CatalogBlock id="fathers" source={CATALOGS.fathers} {...common} extra={<CatenaLink passage={passage} selectedVerses={selectedVerses} />} />
      <SermonIndexBlock {...common} />
      <AndyDavisBlock {...common} />
      <OpenTheBibleBlock {...common} />
      <DesiringGodBlock {...common} />
      <SermonCentralBlock {...common} />
      <MoreTeachingBlock {...common} />
    </>
  )
  if (split) return blocks
  return <section className="card mt-4 passage-sermons" aria-label="Sermons for this passage" style={{ padding: '18px 20px' }}>{header}{blocks}</section>
}
