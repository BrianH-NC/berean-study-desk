import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Camera, Loader2 } from 'lucide-react'
import { useAuth } from '../App'
import { supabase } from '../lib/supabase'
import { identifyShelfPhoto } from '../lib/shelfPhoto'

export default function AddBooks() {
  const user = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [photoUrl, setPhotoUrl] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState('')
  const [found, setFound] = useState(null) // [{ title, author, confidence, include }]
  const [saving, setSaving] = useState(false)

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
    setSaving(true)
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
      setSaving(false)
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

      {!found && (
        <div
          className="card flex flex-col items-center gap-3 text-center cursor-pointer"
          style={{ padding: '40px 24px', border: '2px dashed var(--color-neutral-400)' }}
          onClick={() => fileInputRef.current?.click()}
        >
          <Camera size={26} strokeWidth={2.75} style={{ opacity: 0.6 }} />
          <div>
            <div className="card-title">Photograph a shelf</div>
            <div className="card-body">Take or choose a photo of a shelf full of books — I'll read as many spines as I can.</div>
          </div>
          <button type="button" className="btn btn-primary" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}>
            Choose a photo
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}

      {photoUrl && (
        <div className="flex gap-6 mt-5 flex-wrap">
          <img src={photoUrl} alt="" className="rounded-md" style={{ width: 200, objectFit: 'cover' }} />
          <div className="flex-1" style={{ minWidth: 280 }}>
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
                      <span
                        className="tag tag-neutral shrink-0"
                        title={`${b.confidence} confidence`}
                      >
                        {b.confidence}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button type="button" className="btn btn-primary" onClick={handleAddSelected} disabled={saving || includedCount === 0}>
                    {saving ? 'Adding…' : `Add ${includedCount} book${includedCount === 1 ? '' : 's'}`}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
                    Try another photo
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
