import { useRef, useState } from 'react'
import { fetchBookByISBN, searchBookCover } from '../lib/googleBooks'

export default function FindMissingCovers({ books, saveCover, onComplete }) {
  const [progress, setProgress] = useState(null)
  const [message, setMessage] = useState('')
  const stopping = useRef(false)
  const running = useRef(false)
  const missing = (books || []).filter(book => !book.cover_url && book.kind !== 'person')
  async function run() {
    if (running.current) return
    running.current = true
    stopping.current = false
    setMessage('')
    let saved = 0, failed = 0, done = 0
    setProgress({ done, total: missing.length })
    try {
      for (const book of missing) {
        if (stopping.current) break
        try {
          let cover = book.isbn ? (await fetchBookByISBN(book.isbn))?.cover_url : null
          if (!cover) cover = await searchBookCover(book.title, book.author || book.authors)
          if (cover) { await saveCover(book, cover); saved++ }
        } catch { failed++ }
        done++
        setProgress({ done, total: missing.length })
        if (done < missing.length && !stopping.current) await new Promise(resolve => setTimeout(resolve, 1000))
      }
      await onComplete()
      setMessage(`${saved} covers saved. ${done - saved - failed} not found. ${failed} could not be saved.${stopping.current ? ' Stopped.' : ''}`)
    } catch { setMessage('The cover search finished, but the page could not refresh. Please reload.') }
    finally { running.current = false; setProgress(null) }
  }
  return <div className="flex gap-2 items-center flex-wrap"><button type="button" className="btn btn-secondary" disabled={!!progress || !missing.length} onClick={run}>Find missing covers ({missing.length})</button>{progress ? <><span className="card-meta" role="status">Searching Google Books / Open Library… {progress.done} of {progress.total}</span><button type="button" className="btn btn-ghost" onClick={() => { stopping.current = true }}>Stop</button></> : <span className="card-meta" role="status">{message || 'Google Books + Open Library'}</span>}</div>
}
