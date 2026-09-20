import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { addBookmark, downloadBookFile, listBookFiles, loadReaderState, removeBookmark, removeBookFile, saveReaderPosition, uploadBookFile } from '../lib/bookFiles'
import { createPositionWriter, normalizeReaderLocation } from '../lib/readerState'
import './DigitalBookReader.css'
import ReaderWorkspace from './ReaderWorkspace'

const PdfBookReader = lazy(() => import('./PdfBookReader'))
const EpubBookReader = lazy(() => import('./EpubBookReader'))

function ReaderSession({ file, userId, onNoteCreated }) {
  const [loaded, setLoaded] = useState(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [bookmarks, setBookmarks] = useState([])
  const [location, setLocation] = useState(null)
  const [jump, setJump] = useState(null)
  const [saveError, setSaveError] = useState('')
  const [saveStatus, setSaveStatus] = useState('')
  const [bookmarkBusy, setBookmarkBusy] = useState(false)
  const active = useRef(true)
  useEffect(() => { active.current = true; return () => { active.current = false } }, [])
  const writer = useRef(null)
  useEffect(() => {
    let listening = true
    writer.current = createPositionWriter(
      value => saveReaderPosition(userId, file.id, value),
      err => { if (listening) { setSaveError(err ? 'Your place could not be saved. Check your connection and retry.' : ''); setSaveStatus(err ? '' : 'Place saved') } },
    )
    return () => { listening = false }
  }, [userId, file.id])

  useEffect(() => {
    let cancelled = false
    setError('')
    setLoaded(null)
    Promise.all([downloadBookFile(file), loadReaderState(file.id)]).then(([data, state]) => {
      if (cancelled) return
      const initialLocation = normalizeReaderLocation(file.format, state.location)
      setBookmarks(state.bookmarks)
      setLocation(initialLocation)
      setLoaded({ data, initialLocation })
    }).catch(err => { if (!cancelled) setError(`Unable to load this book and its saved place: ${err.message}`) })
    return () => { cancelled = true }
  }, [file, attempt])

  const onLocation = useCallback(value => {
    const next = normalizeReaderLocation(file.format, value)
    if (!next) return
    setLocation(next)
    setSaveStatus('Saving place…')
    writer.current?.(next)
  }, [file.format])

  async function bookmark() {
    if (!location || bookmarkBusy) return
    setBookmarkBusy(true)
    try {
      const label = location.page ? `Page ${location.page}` : `Bookmark ${bookmarks.length + 1}`
      const row = await addBookmark(userId, file.id, location, label)
      if (active.current) setBookmarks(previous => [...previous, row])
    } catch (err) { alert('Error saving bookmark: ' + err.message) }
    finally { if (active.current) setBookmarkBusy(false) }
  }
  async function deleteBookmark(row) {
    try { await removeBookmark(row.id); setBookmarks(previous => previous.filter(item => item.id !== row.id)) }
    catch (err) { alert('Error removing bookmark: ' + err.message) }
  }
  if (error) return <div role="alert"><p>{error}</p><button className="btn btn-secondary" onClick={() => setAttempt(n => n + 1)}>Retry</button></div>
  if (!loaded) return <p role="status">Loading your book and saved place…</p>
  const Viewer = file.format === 'pdf' ? PdfBookReader : EpubBookReader
  return <ReaderWorkspace file={file} userId={userId} onNoteCreated={onNoteCreated}>{({ annotationJump, ...viewerProps }) => <>
    <Suspense fallback={<p role="status">Preparing reader…</p>}><Viewer {...loaded} {...viewerProps} jump={[annotationJump, jump].filter(Boolean).sort((a, b) => b.token - a.token)[0]} onLocation={onLocation}/></Suspense>
    <div className="digital-toolbar digital-progress"><button className="btn btn-secondary" disabled={!location || bookmarkBusy} onClick={bookmark}>{bookmarkBusy ? 'Saving…' : 'Bookmark this place'}</button><span role="status">{saveStatus}</span>{saveError && <span role="alert">{saveError} <button className="btn btn-ghost" onClick={() => onLocation(location)}>Retry saving</button></span>}</div>
    {!!bookmarks.length && <details className="digital-bookmarks"><summary>Bookmarks ({bookmarks.length})</summary><ul>{bookmarks.map(row => <li key={row.id}><button className="btn btn-ghost" onClick={() => { const target = normalizeReaderLocation(file.format, row.location); if (target) setJump({ location: target, token: Date.now() }) }}>{row.label}</button><button className="btn btn-ghost" aria-label={`Remove ${row.label}`} onClick={() => deleteBookmark(row)}>Remove</button></li>)}</ul></details>}
  </>}</ReaderWorkspace>
}

export default function DigitalBookReader({ bookId, userId, onNoteCreated }) {
  const [files, setFiles] = useState(null)
  const [selected, setSelected] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const input = useRef(null)
  useEffect(() => {
    let active = true
    setError('')
    listBookFiles(bookId).then(rows => { if (active) { setFiles(rows); setSelected(rows[0]?.id || '') } })
      .catch(err => { if (active) setError(`Unable to load book files: ${err.message}`) })
    return () => { active = false }
  }, [bookId, attempt])
  async function upload(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBusy(true)
    try { const row = await uploadBookFile(userId, bookId, file); setFiles(previous => [row, ...(previous || [])]); setSelected(row.id) }
    catch (err) { alert('Error uploading book: ' + err.message) }
    finally { setBusy(false) }
  }
  const file = files?.find(item => item.id === selected)
  async function remove() {
    if (!file || !confirm(`Remove ${file.filename} and its saved place, bookmarks, and highlights? Your reading notes will remain.`)) return
    setBusy(true)
    try { await removeBookFile(file); const remaining = files.filter(item => item.id !== file.id); setFiles(remaining); setSelected(remaining[0]?.id || '') }
    catch (err) { alert('Error removing book file: ' + err.message) }
    finally { setBusy(false) }
  }
  return <section className="card digital-book-reader" aria-label="Digital book reader">
    <div className="digital-reader-heading"><div><h2>Read your book</h2><p>Upload a PDF or EPUB you own or have permission to use. Files are private to your account. Up to 50 MB per file.</p></div><button className="btn btn-primary" disabled={busy || !files} onClick={() => input.current.click()}>{busy ? 'Working…' : 'Upload PDF or EPUB'}</button><input ref={input} type="file" accept=".pdf,.epub,application/pdf,application/epub+zip" hidden onChange={upload}/></div>
    {error ? <div role="alert"><p>{error}</p><button className="btn btn-secondary" onClick={() => setAttempt(n => n + 1)}>Retry</button></div> : files === null ? <p role="status">Loading book files…</p> : !files.length ? <p>Add a digital copy to read here. Your reading notes are below.</p> : <>
      <div className="digital-toolbar"><label>Book file <select aria-label="Book file" value={selected} disabled={busy} onChange={event => setSelected(event.target.value)}>{files.map(item => <option key={item.id} value={item.id}>{item.filename}</option>)}</select></label><button className="btn btn-ghost" disabled={busy} onClick={remove}>Remove file</button></div>
      {file && <ReaderSession key={file.id} file={file} userId={userId} onNoteCreated={onNoteCreated}/>}
    </>}
  </section>
}
