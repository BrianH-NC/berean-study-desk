import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Camera, Loader2, ScanBarcode } from 'lucide-react'
import { useAuth } from '../App'
import { supabase } from '../lib/supabase'
import { fetchBookByISBN } from '../lib/googleBooks'
import { identifyBookImage } from '../lib/bookPhoto'
import BarcodeScanner from '../components/BarcodeScanner'

const PRIORITIES = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

export default function WishlistAdd() {
  const user = useAuth()
  const navigate = useNavigate()

  const coverFileRef = useRef(null)
  const [showScanner, setShowScanner] = useState(false)
  const [scanLookupLoading, setScanLookupLoading] = useState(false)
  const [photoLoading, setPhotoLoading] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [isbn, setIsbn] = useState('')
  const [coverUrl, setCoverUrl] = useState('')
  const [extraMeta, setExtraMeta] = useState({}) // publisher/pub_date/pages/description from a lookup, carried through silently
  const [priority, setPriority] = useState('medium')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleScan(scannedIsbn) {
    setShowScanner(false)
    setIsbn(scannedIsbn)
    setScanLookupLoading(true)
    const book = await fetchBookByISBN(scannedIsbn)
    setScanLookupLoading(false)
    if (book) {
      setTitle(book.title)
      setAuthor(book.author)
      setCoverUrl(book.cover_url || '')
      setExtraMeta({ publisher: book.publisher, pub_date: book.pub_date, pages: book.pages, description: book.description })
    }
  }

  async function handlePhotoFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoLoading(true)
    setPhotoError('')
    try {
      const result = await identifyBookImage(file)
      if (result.title) setTitle(result.title)
      if (result.author) setAuthor(result.author)
      if (result.isbn) {
        setIsbn(result.isbn)
        const book = await fetchBookByISBN(result.isbn)
        if (book?.cover_url) setCoverUrl(book.cover_url)
        if (book) setExtraMeta({ publisher: book.publisher, pub_date: book.pub_date, pages: book.pages, description: book.description })
      }
      if (!result.title && !result.author) {
        setPhotoError("Couldn't make out a title or author from that photo -- try again or type it in.")
      }
    } catch (err) {
      setPhotoError(err.message)
    } finally {
      setPhotoLoading(false)
      e.target.value = ''
    }
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    setError('')
    try {
      const { error } = await supabase.from('wishlist').insert({
        user_id: user.id,
        title: title.trim(),
        author: author.trim() || null,
        isbn: isbn.trim() || null,
        cover_url: coverUrl.trim() || null,
        publisher: extraMeta.publisher || null,
        pub_date: extraMeta.pub_date || null,
        pages: extraMeta.pages || null,
        description: extraMeta.description || null,
        priority,
        notes: notes.trim() || null,
      })
      if (error) throw error
      navigate('/shelf/wishlist')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-[900px] mx-auto page">
      <div className="card-meta mb-2">
        <Link to="/shelf/wishlist" className="hover:underline">
          ← Wishlist
        </Link>
      </div>
      <h2 className="!mb-4">Add to the wishlist</h2>

      <div className="card mb-5" style={{ padding: '18px 20px' }}>
        <div className="flex gap-2 mb-3 flex-wrap">
          <button type="button" className="btn btn-primary" onClick={() => setShowScanner(true)}>
            <ScanBarcode size={15} strokeWidth={2.75} />
            Scan barcode
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => coverFileRef.current?.click()} disabled={photoLoading}>
            {photoLoading ? <Loader2 size={15} strokeWidth={2.75} className="animate-spin" /> : <Camera size={15} strokeWidth={2.75} />}
            Take a photo
          </button>
          <input ref={coverFileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoFile} />
        </div>

        {scanLookupLoading && (
          <div className="text-sm mb-2 flex items-center gap-1.5" style={{ opacity: 0.7 }}>
            <Loader2 size={13} strokeWidth={2.75} className="animate-spin" /> Looking up that ISBN…
          </div>
        )}
        {photoError && (
          <div className="text-sm mb-2" style={{ color: 'var(--color-accent-800)' }}>
            {photoError}
          </div>
        )}

        <form onSubmit={handleAdd} className="flex flex-col gap-3">
          <div className="flex gap-2 flex-wrap items-end">
            <div className="field" style={{ minWidth: 220 }}>
              <label htmlFor="wl-title">Title</label>
              <input id="wl-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="field" style={{ minWidth: 180 }}>
              <label htmlFor="wl-author">Author</label>
              <input id="wl-author" className="input" value={author} onChange={(e) => setAuthor(e.target.value)} />
            </div>
            <div className="field" style={{ minWidth: 140 }}>
              <label htmlFor="wl-isbn">ISBN (optional)</label>
              <input id="wl-isbn" className="input" value={isbn} onChange={(e) => setIsbn(e.target.value)} />
            </div>
            <div className="field" style={{ minWidth: 120 }}>
              <label htmlFor="wl-priority">Priority</label>
              <select id="wl-priority" className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="wl-notes">Notes (optional)</label>
            <input id="wl-notes" className="input" placeholder="Why this one, or who recommended it…" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-secondary self-start" disabled={saving}>
            {saving ? 'Adding…' : 'Add to wishlist'}
          </button>
        </form>
        {error && (
          <div className="mt-2 text-sm" style={{ color: 'var(--color-accent-800)' }}>
            {error}
          </div>
        )}
      </div>

      {showScanner && <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} />}
    </div>
  )
}
