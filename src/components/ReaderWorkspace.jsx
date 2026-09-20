import { useCallback, useEffect, useRef, useState } from 'react'
import { highlightColors, listAnnotations, removeAnnotation, saveAnnotation } from '../lib/bookAnnotations'

export default function ReaderWorkspace({ file, userId, onNoteCreated, children }) {
  const root = useRef(null), fullButton = useRef(null), busyRef = useRef(false)
  const selectionRef = useRef(null)
  const [expanded, setExpanded] = useState(false)
  const [annotations, setAnnotations] = useState([])
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [selection, setSelection] = useState(null)
  const [color, setColor] = useState('yellow')
  const [note, setNote] = useState(null)
  const [busy, setBusy] = useState(false)
  const [jump, setJump] = useState(null)
  const [status, setStatus] = useState('')
  const exit = useCallback(() => {
    if (document.fullscreenElement === root.current) void document.exitFullscreen().catch(() => {})
    setExpanded(false)
    fullButton.current?.focus()
  }, [])
  useEffect(() => {
    let active = true
    listAnnotations(file.id).then(rows => { if (active) { setAnnotations(rows); setError('') } })
      .catch(err => { if (active) setError(`Highlights could not be loaded: ${err.message}`) })
    return () => { active = false }
  }, [file.id, attempt])
  useEffect(() => {
    const changed = () => { if (!document.fullscreenElement) { setExpanded(false); fullButton.current?.focus() } }
    document.addEventListener('fullscreenchange', changed)
    return () => document.removeEventListener('fullscreenchange', changed)
  }, [])
  useEffect(() => {
    if (!expanded) return
    const siblings = []
    for (let element = root.current; element?.parentElement; element = element.parentElement) {
      for (const sibling of element.parentElement.children) {
        if (sibling !== element) { siblings.push([sibling, sibling.inert]); sibling.setAttribute('inert', '') }
      }
      if (element.parentElement === document.body) break
    }
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const key = event => { if (event.key === 'Escape') exit() }
    document.addEventListener('keydown', key)
    return () => { document.body.style.overflow = previous; for (const [element, inert] of siblings) element.toggleAttribute('inert', inert); document.removeEventListener('keydown', key) }
  }, [expanded, exit])
  async function fullscreen() {
    if (expanded) { exit(); return }
    setExpanded(true)
    try { await root.current.requestFullscreen() } catch { /* Expanded reading also works without native fullscreen. */ }
  }
  const select = useCallback(value => {
    if (busyRef.current) return
    if (value && value.quote.length > 10000) { alert('Select a shorter passage (up to 10,000 characters).'); return }
    if (value && !value.addNote && selectionRef.current?.quote === value.quote && JSON.stringify(selectionRef.current.location) === JSON.stringify(value.location)) return
    selectionRef.current = value
    setSelection(value); setNote(value?.addNote ? '' : null); setStatus('')
  }, [])
  function clearSelection() {
    window.getSelection()?.removeAllRanges()
    for (const frame of root.current?.querySelectorAll('iframe') || []) frame.contentWindow?.getSelection()?.removeAllRanges()
    selectionRef.current = null; setSelection(null); setNote(null)
  }
  async function save(withNote) {
    if (!selection || busyRef.current) return
    busyRef.current = true; setBusy(true)
    try {
      const result = await saveAnnotation(userId, file.id, selection, color, withNote ? note.trim() : undefined)
      setAnnotations(rows => [...rows, result.annotation])
      if (result.entry) onNoteCreated?.(result.entry)
      clearSelection(); setStatus(withNote ? 'Note saved to your Notebook.' : 'Highlight saved.')
    } catch (err) { alert('Unable to save passage: ' + err.message) }
    finally { busyRef.current = false; setBusy(false) }
  }
  async function remove(row) {
    if (!confirm('Remove this highlight? Any Notebook note will remain.')) return
    try { await removeAnnotation(row.id); setAnnotations(rows => rows.filter(item => item.id !== row.id)) }
    catch (err) { alert('Unable to remove highlight: ' + err.message) }
  }
  return <div ref={root} className={`reader-workspace${expanded ? ' reader-expanded' : ''}`}>
    <div className="reader-workspace-heading"><span>{file.filename}</span><button ref={fullButton} className="btn btn-secondary" onClick={fullscreen}>{expanded ? 'Exit full screen' : 'Full screen'}</button></div>
    <p className="reader-selection-hint">Select text to highlight it or add a note. You can also right-click a selected passage.</p>
    {error && <p role="alert">{error} <button className="btn btn-ghost" onClick={() => setAttempt(n => n + 1)}>Retry highlights</button></p>}
    {children({ annotations, onSelection: select, onEscape: exit, annotationJump: jump })}
    {selection && <div className="reader-selection-tools" role="region" aria-label="Selected passage">
      <blockquote>{selection.quote}</blockquote>
      <div className="digital-toolbar"><label>Highlight color <select value={color} disabled={busy} onChange={e => setColor(e.target.value)}>{Object.keys(highlightColors).map(value => <option key={value} value={value}>{value}</option>)}</select></label>
      {note === null ? <><button className="btn btn-primary" disabled={busy} onClick={() => save(false)}>Highlight</button><button className="btn btn-secondary" disabled={busy} onClick={() => setNote('')}>Add note</button></> : null}
      <button className="btn btn-ghost" disabled={busy} onClick={clearSelection}>Cancel</button></div>
      {note !== null && <form onSubmit={e => { e.preventDefault(); void save(true) }}><label>Your note<textarea autoFocus value={note} maxLength={20000} disabled={busy} onChange={e => setNote(e.target.value)}/></label><button className="btn btn-primary" disabled={busy || !note.trim()}>{busy ? 'Saving…' : 'Save note'}</button></form>}
    </div>}
    <span role="status">{status}</span>
    {!!annotations.length && <details className="reader-highlights"><summary>Highlights &amp; notes ({annotations.length})</summary><ul>{annotations.map(row => <li key={row.id}><button className="btn btn-ghost passage-quote" onClick={() => setJump({ location: row.location, token: Date.now() })}>{row.quote}</button>{row.entry_id && <a href={`/notebook/${row.entry_id}`} onClick={exit}>Open note</a>}<button className="btn btn-ghost" onClick={() => remove(row)}>Remove highlight</button></li>)}</ul></details>}
  </div>
}
