import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import './SaveToNote.css'
import { appendToNote, createNoteWithExcerpt, listNotesForPicker } from '../lib/noteExcerpts'
import { snippet } from '../lib/excerpts'

const realApi = { appendToNote, createNoteWithExcerpt, listNotesForPicker }

// Where to put an excerpt: the study session's open note, a new note, or any existing note.
//   excerpt: { title, refs: [passages the note should be filed under], preview, build() -> nodes }
//   target:  { userId, sessionRef, sessionNoteId } -- the session note is written through its own
//            editor so its autosave never collides with this save.
export default function SaveToNote({ excerpt, target, onClose, api = realApi }) {
  const { userId, sessionRef, sessionNoteId } = target
  const sessionAvailable = Boolean(sessionNoteId && sessionRef?.current?.append)
  const [notes, setNotes] = useState(null)
  const [pick, setPick] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(null)

  useEffect(() => {
    let active = true
    api.listNotesForPicker(userId).then((rows) => { if (active) setNotes(rows) }).catch(() => { if (active) setNotes([]) })
    return () => { active = false }
  }, [api, userId])

  async function run(task) {
    setBusy(true); setError('')
    try { setDone(await task()) } catch (e) { setError(e?.message || 'Couldn’t save the excerpt. Try again.') } finally { setBusy(false) }
  }
  const toSession = () => run(async () => {
    await sessionRef.current.append(await excerpt.build(), excerpt.refs)
    return { title: sessionRef.current.snapshot().title || 'Untitled note', session: true }
  })
  const toNew = () => run(async () => {
    const note = await api.createNoteWithExcerpt(userId, { title: excerpt.title, refs: excerpt.refs, nodes: await excerpt.build() })
    return { id: note.id, title: note.title || 'Untitled note' }
  })
  const toExisting = () => run(async () => {
    const note = await api.appendToNote(userId, pick, { refs: excerpt.refs, nodes: await excerpt.build() })
    return { id: note.id, title: note.title || 'Untitled note' }
  })

  const choices = (notes || []).filter((n) => n.id !== sessionNoteId)
  return (
    <div className="stn" role="group" aria-label="Save excerpt to a note" onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }}>
      <p className="stn-preview">“{snippet(excerpt.preview)}”</p>
      {done ? (
        <p role="status" className="stn-done">
          Saved to <strong>“{done.title}”</strong>.{' '}
          {done.id && <Link to={`/notebook/${done.id}`}>Open the note →</Link>}
        </p>
      ) : (
        <>
          <div className="stn-actions">
            {sessionAvailable && <button type="button" className="btn btn-primary" autoFocus disabled={busy} onClick={toSession}>Add to this session’s note</button>}
            <button type="button" className="btn btn-secondary" autoFocus={!sessionAvailable} disabled={busy} onClick={toNew}>Save as a new note</button>
          </div>
          <div className="stn-existing">
            <label>
              <span>Or add to an existing note</span>
              <select className="input" value={pick} disabled={busy || notes === null} onChange={(e) => setPick(e.target.value)}>
                <option value="">{notes === null ? 'Loading notes…' : choices.length ? 'Choose a note…' : 'No other notes yet'}</option>
                {choices.map((n) => <option key={n.id} value={n.id}>{n.title || 'Untitled note'}{n.ref ? ` · ${n.ref}` : ''}</option>)}
              </select>
            </label>
            <button type="button" className="btn btn-secondary" disabled={busy || !pick} onClick={toExisting}>Add</button>
          </div>
          {busy && <p role="status" className="stn-note">Saving…</p>}
        </>
      )}
      {error && <p role="alert" className="stn-error">{error}</p>}
      <button type="button" className="btn btn-ghost stn-close" onClick={onClose}>{done ? 'Done' : 'Cancel'}</button>
    </div>
  )
}
