import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { runBookCheck } from '../lib/theologyCheck'
import { ruleFor } from '../lib/verdictRules'

// Runs Doctrine Checks on the books the owner selected, two at a time, with a
// summary first, progress while running and a way to stop.
export default function BulkDoctrineCheck({ books, rules, checks, onDone, onClose }) {
  const dialog = useRef(null)
  const stopRef = useRef(false)
  const [recheck, setRecheck] = useState(false)
  const [includeRules, setIncludeRules] = useState(false)
  const [state, setState] = useState('ready')
  const [results, setResults] = useState([])
  useEffect(() => { dialog.current?.showModal() }, [])

  const noIsbn = books.filter(b => !b.isbn)
  const ruled = books.filter(b => b.isbn && ruleFor(b, rules))
  const checked = books.filter(b => b.isbn && checks[b.isbn] && !ruleFor(b, rules))
  const queue = books.filter(b => b.isbn && (includeRules || !ruleFor(b, rules)) && (recheck || !checks[b.isbn]))
  const done = results.length

  async function start() {
    setState('running'); stopRef.current = false; setResults([])
    const list = [...queue]
    const worker = async () => {
      while (list.length && !stopRef.current) {
        const book = list.shift()
        try { const r = await runBookCheck(book); setResults(rs => [...rs, { book, verdict: r.verdict, id: r.id }]) }
        catch (e) { setResults(rs => [...rs, { book, error: e.message }]) }
      }
    }
    await Promise.all([worker(), worker()])
    setState(stopRef.current ? 'stopped' : 'finished')
    onDone()
  }
  function close() { if (state === 'running' || state === 'stopping') return; onClose() }

  return <dialog ref={dialog} className="library-modal" aria-labelledby="bulk-check-title" onCancel={e => { e.preventDefault(); close() }}><section className="card bulk-check">
    <h2 id="bulk-check-title">Doctrine Check {books.length} book{books.length === 1 ? '' : 's'}</h2>
    {state === 'ready' && <>
      <p className="mb-0"><strong>{queue.length}</strong> will be checked. Each check is one AI assessment and takes several seconds; two run at a time.</p>
      <ul className="bulk-check-skip">
        {checked.length > 0 && <li><label><input type="checkbox" checked={recheck} onChange={e => setRecheck(e.target.checked)} />Re-check the {checked.length} that already have a Doctrine Check</label></li>}
        {ruled.length > 0 && <li><label><input type="checkbox" checked={includeRules} onChange={e => setIncludeRules(e.target.checked)} />Also check the {ruled.length} covered by your author rules</label><small>Your rule still decides their verdict.</small></li>}
        {noIsbn.length > 0 && <li>{noIsbn.length} skipped because {noIsbn.length === 1 ? 'it has' : 'they have'} no ISBN. Check {noIsbn.length === 1 ? 'it' : 'them'} from the book page.</li>}
      </ul>
      <div className="flex gap-2"><button type="button" className="btn btn-primary" disabled={!queue.length} onClick={start}>Run {queue.length} check{queue.length === 1 ? '' : 's'}</button><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button></div>
    </>}
    {state !== 'ready' && <>
      <p role="status" className="mb-0">{state === 'running' || state === 'stopping' ? `Checking… ${done} of ${queue.length} done` : `${state === 'stopped' ? 'Stopped' : 'Finished'}: ${results.filter(r => !r.error).length} checked${results.some(r => r.error) ? `, ${results.filter(r => r.error).length} failed` : ''}.`}</p>
      <progress max={queue.length} value={done} className="bulk-check-progress" />
      <ul className="bulk-check-results">{results.map((r, i) => <li key={i}>{r.error ? <><strong>{r.book.title}</strong>: {r.error}</> : <><Link to={`/checks/${r.id}`}>{r.book.title}</Link>: {r.verdict || 'No verdict'}</>}</li>)}</ul>
      <div className="flex gap-2">{state === 'running' ? <button type="button" className="btn btn-secondary" onClick={() => { stopRef.current = true; setState('stopping') }}>Stop after current</button> : state === 'stopping' ? <button type="button" className="btn btn-secondary" disabled>Stopping…</button> : <button type="button" className="btn btn-primary" onClick={onClose}>Done</button>}</div>
    </>}
  </section></dialog>
}
