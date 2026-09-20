import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Upload } from 'lucide-react'
import { importBookFile } from '../lib/bookFiles'

export default function UploadBookButton({ userId }) {
  const input = useRef(null)
  const pending = useRef(false)
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  async function upload(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || pending.current) return
    pending.current = true
    setBusy(true)
    try {
      const bookId = await importBookFile(userId, file)
      navigate(`/reading/${bookId}`)
    } catch (error) { alert('Error uploading book: ' + error.message) }
    finally { pending.current = false; setBusy(false) }
  }
  return <div>
    <div className="flex flex-wrap gap-3">
    <button className="btn btn-primary" disabled={busy} onClick={() => input.current.click()}><Upload size={17} aria-hidden="true"/>{busy ? 'Uploading book…' : 'Upload PDF or EPUB'}</button>
    {!busy && <Link to="/reading/free-books" className="btn btn-secondary">Find Free Books</Link>}
    </div>
    <input ref={input} type="file" accept=".pdf,.epub,application/pdf,application/epub+zip" hidden onChange={upload}/>
    <p className="card-meta mt-2" role="status">{busy ? 'Adding your book to the Library and opening the reader…' : 'Choose a file to add it to your Library and start reading. Up to 50 MB.'}</p>
  </div>
}
