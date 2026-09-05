import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Camera, Loader2, ScanBarcode } from 'lucide-react'
import { useAuth } from '../App'
import { supabase } from '../lib/supabase'
import { identifyShelfPhoto } from '../lib/shelfPhoto'
import { identifyBookImage } from '../lib/bookPhoto'
import { fetchBookByISBN } from '../lib/googleBooks'
import BarcodeScanner from '../components/BarcodeScanner'

export default function AddBooks() {
  const user = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const coverFileRef = useRef(null)

  // Single book: scan, photo, or manual entry
  const [showScanner, setShowScanner] = useState(false)
  const [scanLookupLoading, setScanLookupLoading] = useState(false)
  const [photoLoading, setPhotoLoading] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [isbn, setIsbn] = useState('')
  const [coverUrl, setCoverUrl] = useState('')
  const [savingOne, setSavingOne] = useState(false)
  const [oneError, setOneError] = useState('')

  // Whole shelf at a time
  const [showShelfScan, setShowShelfScan] = useState(false)
  const [photoUrl, setPhotoUrl] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState('')
  const [found, setFound] = useState(null) // [{ title, author, confidence, include }]
  const [savingShelf, setSavingShelf] = useState(false)

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

  async function handleAddOne(e) {
    e.preventDefault()
    if (!title.trim()) return
    setSavingOne(true)
    setOneError('')
    try {
      const { error } = await supabase.from('books').insert({
        user_id: user.id,
        title: title.trim(),
        author: author.trim() || null,
        isbn: isbn.trim() || null,
        cover_url: coverUrl || null,
        reading_status: 'unread',
        tags: [],
      })
      if (error) throw error
      navigate('/shelf')
    } catch (err) {
      setOneError(err.message)
    } finally {
      setSavingOne(false)
    }
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoUrl(URL.createObjectURL(file))
    setFound(null)
    setScanError('')
    setScanning(true)
    try {
      const result = await identifyShelfPhoto(file)
      setFound((result.books || []).map((b) => ({ ...b, include: true })))
    } catch (err) {
      setScanError(err.message)
    } finally {
      setScanning(false)
    }
  }

  function updateFound(i, patch) {
    setFound((prev) => prev.map((b, idx) => (idx === i ? { ...b, ...patch } : b)))
  }

  async function handleAddSelected() {
    const toAdd = found.filter((b) => b.include && b.title?.trim())
    if (toAdd.length === 0) return
    setSavingShelf(true)
    try {
      const rows = toAdd.map((b) => ({
        user_id: user.id,
        title: b.title.trim(),
        author: b.author?.trim() || null,
        reading_status: 'unread',
        tags: [],
      }))
      const { error } = await supabase.from('books').insert(rows)
      if (error) throw error
      navigate('/shelf')
    } catch (err) {
      alert('Error adding books: ' + err.message)
    } finally {
      setSavingShelf(false)
    }
  }

  const includedCount = found ? found.filter((b) => b.include).length : 0

  return (
    <div className="max-w-[1140px] mx-auto page">
      <div className="card-meta mb-2">
        <Link to="/shelf" className="hover:underline">
          ← Shelf
        </Link>
      </div>
      <h2 className="!mb-4">Add to the shelf</h2>

      {/* Add one book: scan or type it in */}
      <div className="card mb-5" style={{ padding: '18px 20px' }}>
        <div className="card-title mb-2">Add a book</div>
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

        <form onSubmit={handleAddOne} className="flex gap-2 flex-wrap items-end">
          <div className="field" style={{ minWidth: 220 }}>
            <label htmlFor="ab-title">Title</label>
            <input id="ab-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="field" style={{ minWidth: 180 }}>
            <label htmlFor="ab-author">Author</label>
            <input id="ab-author" className="input" value={author} onChange={(e) => setAuthor(e.target.value)} />
          </div>
          <div className="field" style={{ minWidth: 140 }}>
            <label htmlFor="ab-isbn">ISBN (optional)</label>
            <input id="ab-isbn" className="input" value={isbn} onChange={(e) => setIsbn(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-secondary" disabled={savingOne}>
            {savingOne ? 'Adding…' : 'Add to shelf'}
          </button>
        </form>
        {oneError && (
          <div className="mt-2 text-sm" style={{ color: 'var(--color-accent-800)' }}>
            {oneError}
          </div>
        )}
      </div>

      {/* Whole shelf at a time */}
      {!showShelfScan ? (
        <button type="button" className="btn btn-ghost" onClick={() => setShowShelfScan(true)}>
          Or scan a whole shelf at once →
        </button>
      ) : (
        <div className="card" style={{ padding: '18px 20px' }}>
          <div className="card-title mb-1">Scan a shelf</div>
          <div className="card-body mb-2">Photograph a shelf full of books — I'll read as many spines as I can.</div>

          {!found && !scanning && (
            <button type="button" className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
              <Camera size={15} strokeWidth={2.75} />
              Choose a photo
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />

          {photoUrl && (scanning || found) && (
            <div className="flex gap-5 mt-3 flex-wrap">
              <img src={photoUrl} alt="" className="rounded-md" style={{ width: 140, objectFit: 'cover' }} />
              <div className="flex-1" style={{ minWidth: 260 }}>
                {scanning && (
                  <div className="flex items-center gap-2" style={{ opacity: 0.7 }}>
                    <Loader2 size={16} strokeWidth={2.75} className="animate-spin" /> Reading spines…
                  </div>
                )}
                {scanError && (
                  <div className="text-sm" style={{ color: 'var(--color-accent-800)' }}>
                    {scanError}
                  </div>
                )}

                {found && (
                  <>
                    <div className="card-kicker mb-2">
                      {found.length} spines read · {includedCount} selected
                    </div>
                    <div className="flex flex-col gap-2 mb-4" style={{ maxHeight: 420, overflowY: 'auto' }}>
                      {found.map((b, i) => (
                        <div key={i} className="flex items-center gap-2 card !flex-row" style={{ padding: '8px 12px' }}>
                          <input type="checkbox" checked={b.include} onChange={(e) => updateFound(i, { include: e.target.checked })} />
                          <input
                            className="input flex-1"
                            style={{ minHeight: 30, padding: '4px 10px' }}
                            value={b.title || ''}
                            onChange={(e) => updateFound(i, { title: e.target.value })}
                            placeholder="Title"
                          />
                          <input
                            className="input flex-1"
                            style={{ minHeight: 30, padding: '4px 10px' }}
                            value={b.author || ''}
                            onChange={(e) => updateFound(i, { author: e.target.value })}
                            placeholder="Author"
                          />
                          <span className="tag tag-neutral shrink-0" title={`${b.confidence} confidence`}>
                            {b.confidence}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button type="button" className="btn btn-primary" onClick={handleAddSelected} disabled={savingShelf || includedCount === 0}>
                        {savingShelf ? 'Adding…' : `Add ${includedCount} book${includedCount === 1 ? '' : 's'}`}
                      </button>
                      <button type="button" className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
                        Try another photo
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {showScanner && <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} />}
    </div>
  )
}
