import { useEffect, useRef, useState } from 'react'
export default function LibraryBookEditor({ book, onSave, onClose }) {
  const dialog = useRef(null)
  useEffect(() => {dialog.current.showModal(); dialog.current.querySelector(`[data-section="${book.editorSection || 'status'}"]`)?.focus()}, [book.editorSection])
  const [status, setStatus] = useState(book.reading_status || 'unread')
  const [page, setPage] = useState(book.current_page || 0)
  const [pages, setPages] = useState(book.pages || '')
  const [completed, setCompleted] = useState(book.completed_at || '')
  const [tags, setTags] = useState((book.tags || []).join(', '))
  const [collections, setCollections] = useState((book.collections || []).join(', '))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const split = value => [...new Set(value.split(',').map(v => v.trim()).filter(Boolean))]
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('')
    try { await onSave({reading_status:status,current_page:Number(page),pages:pages ? Number(pages) : null,completed_at:status === 'read' ? completed || null : null,tags:split(tags),collections:split(collections)}); onClose() }
    catch (err) { setError(err.message); setBusy(false) }
  }
  return <dialog ref={dialog} className="library-modal" aria-labelledby="library-edit-title" onCancel={e=>{e.preventDefault();if(!busy)onClose()}}><section className="card"><h2 id="library-edit-title">Update {book.title}</h2><form onSubmit={submit}>
    <label>Reading status<select data-section="status" className="input" value={status} onChange={e => {setStatus(e.target.value); if(e.target.value==='read' && !completed) setCompleted(new Date().toLocaleDateString('en-CA'))}}><option value="unread">To Read</option><option value="in-progress">Reading</option><option value="read">Completed</option><option value="reference">Reference</option><option value="paused">Paused</option></select></label>
    <div className="library-edit-pair"><label>Current page<input data-section="progress" type="number" className="input" min="0" max={pages || undefined} required value={page} onChange={e=>setPage(e.target.value)}/></label><label>Total pages<input type="number" className="input" min="1" value={pages} onChange={e=>setPages(e.target.value)}/></label></div>
    {status==='read' && <label>Completion date<input type="date" className="input" value={completed} onChange={e=>setCompleted(e.target.value)}/><small>Leave blank if the date is unknown.</small></label>}
    <label>Tags / categories<input data-section="tags" className="input" value={tags} onChange={e=>setTags(e.target.value)}/><small>Separate with commas. The first tag is the category; use Reference for reference books.</small></label>
    <label>Collections<input data-section="collections" className="input" value={collections} onChange={e=>setCollections(e.target.value)} placeholder="Study group, Church history…"/><small>Separate collection names with commas.</small></label>
    {error && <p role="alert">{error}</p>}<div className="flex gap-2"><button className="btn btn-primary" disabled={busy}>{busy?'Saving…':'Save changes'}</button><button type="button" className="btn btn-secondary" disabled={busy} onClick={onClose}>Cancel</button></div>
  </form></section></dialog>
}
