import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, ChevronDown, ChevronUp, Loader2, Maximize2, Minimize2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { createEntry, updateEntry, setRelated, listEntries, formatEntryNum, nextGapNumber, nextSuffixedNumber } from '../lib/entries'
import { uploadEntryPhoto, deleteEntryPhoto } from '../lib/entryPhotos'

// The full original digging-deep-notebook composer, ported and extended for
// BSD: Title/Reference/Topics/Body (with an insert-reference quick action),
// Photos (real Storage uploads here, vs. device-local in the original),
// Related entries (a live-search picker instead of raw "type numbers"),
// an Advanced-mode section (My Library book link, page, video link, entry
// number override), and a Focus-mode overlay. Shared between creating a new
// entry and editing an existing one -- the original used one form for both.
export default function EntryComposerForm({ userId, initial, initialRelated, presetRef, presetBody, onSaved, onCancel }) {
  const isEdit = !!initial

  const [title, setTitle] = useState(initial?.title || '')
  const [body, setBody] = useState(initial?.body || presetBody || '')
  const [ref, setRef] = useState(initial?.ref || presetRef || '')
  const [tagsInput, setTagsInput] = useState((initial?.tags || []).join(', '))
  const [photos, setPhotos] = useState(initial?.photos || [])
  const [uploadingCount, setUploadingCount] = useState(0)
  const [photoError, setPhotoError] = useState('')

  const [allEntries, setAllEntries] = useState([])
  const [relatedSelections, setRelatedSelections] = useState(initialRelated || [])
  const [relatedQuery, setRelatedQuery] = useState('')

  const [showRefInsert, setShowRefInsert] = useState(false)
  const [refInsertValue, setRefInsertValue] = useState('')
  const bodyRef = useRef(null)

  const [advanced, setAdvanced] = useState(false)
  const [shelfBookId, setShelfBookId] = useState(initial?.shelf_book_id || '')
  const [myBooks, setMyBooks] = useState([])
  const [page, setPage] = useState(initial?.page || '')
  const [videoUrl, setVideoUrl] = useState(initial?.video_url || '')
  // The field only ever holds a plain whole number -- lettered suffixes
  // (125a) are assigned automatically on collision, never typed directly, so
  // this shows the floored number even for an already-suffixed entry.
  const [numberOverride, setNumberOverride] = useState(isEdit ? String(Math.floor(initial.number)) : '')

  const [focusMode, setFocusMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const previewNumber = useMemo(() => {
    if (isEdit) return initial.number
    return nextGapNumber(allEntries.map((e) => e.number))
  }, [isEdit, initial, allEntries])

  useEffect(() => {
    listEntries(userId).then(setAllEntries)
    supabase
      .from('books')
      .select('id, title')
      .eq('user_id', userId)
      .order('title')
      .then(({ data }) => setMyBooks(data || []))
  }, [userId])

  const relatedSuggestions = useMemo(() => {
    const q = relatedQuery.trim().toLowerCase()
    if (!q) return []
    const selectedIds = new Set(relatedSelections.map((r) => r.id))
    return allEntries
      .filter((e) => e.id !== initial?.id && !selectedIds.has(e.id))
      .filter((e) => (e.title || '').toLowerCase().includes(q) || String(e.number).includes(q))
      .slice(0, 6)
  }, [relatedQuery, allEntries, relatedSelections, initial])

  function addRelated(entry) {
    setRelatedSelections((prev) => [...prev, { id: entry.id, number: entry.number, title: entry.title }])
    setRelatedQuery('')
  }

  function removeRelated(id) {
    setRelatedSelections((prev) => prev.filter((r) => r.id !== id))
  }

  function insertReferenceIntoBody() {
    const text = refInsertValue.trim()
    if (!text) return
    const el = bodyRef.current
    const pos = el && document.activeElement === el ? el.selectionStart : body.length
    setBody((prev) => prev.slice(0, pos) + text + prev.slice(pos))
    setRefInsertValue('')
    setShowRefInsert(false)
    requestAnimationFrame(() => el?.focus())
  }

  async function handlePhotoFiles(e) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setPhotoError('')
    setUploadingCount(files.length)
    for (const file of files) {
      try {
        const url = await uploadEntryPhoto(userId, file)
        setPhotos((prev) => [...prev, url])
      } catch (err) {
        setPhotoError(err.message)
      } finally {
        setUploadingCount((n) => n - 1)
      }
    }
    e.target.value = ''
  }

  async function removePhoto(url) {
    setPhotos((prev) => prev.filter((p) => p !== url))
    deleteEntryPhoto(url).catch(() => {})
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!body.trim()) return
    setSaving(true)
    setError('')
    try {
      const fields = {
        title: title.trim() || null,
        body: body.trim(),
        ref: ref.trim() || null,
        tags: tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
        photos,
        shelf_book_id: shelfBookId || null,
        page: page.trim() || null,
        video_url: videoUrl.trim() || null,
      }

      let entryId = initial?.id
      if (isEdit) {
        // A changed override takes the lowest-gap default's place only if the
        // user actually typed something different from the entry's current
        // number -- otherwise leave it alone entirely.
        const overrideNum = numberOverride.trim() ? parseFloat(numberOverride.trim()) : null
        if (overrideNum != null && overrideNum !== Math.floor(initial.number)) {
          const taken = allEntries.filter((e) => e.id !== initial.id).map((e) => e.number)
          fields.number = taken.includes(overrideNum) ? nextSuffixedNumber(overrideNum, taken) : overrideNum
        }
        await updateEntry(entryId, fields)
      } else {
        if (numberOverride.trim()) {
          const desired = parseFloat(numberOverride.trim())
          const taken = allEntries.map((e) => e.number)
          fields.number = taken.includes(desired) ? nextSuffixedNumber(desired, taken) : desired
        }
        const entry = await createEntry(userId, fields)
        entryId = entry.id
      }

      await setRelated(entryId, relatedSelections.map((r) => r.id))
      onSaved(entryId)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const formBody = (
    <>
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="!mb-0">
          {isEdit ? 'Edit entry' : 'New entry'}, no. {formatEntryNum(previewNumber)}
        </h2>
        <button
          type="button"
          className="btn btn-icon btn-ghost"
          onClick={() => setFocusMode((v) => !v)}
          title={focusMode ? 'Exit focus mode' : 'Focus mode -- hide everything but this form'}
        >
          {focusMode ? <Minimize2 size={16} strokeWidth={2.75} /> : <Maximize2 size={16} strokeWidth={2.75} />}
        </button>
      </div>

      <form onSubmit={handleSave}>
        <div className="card mb-4" style={{ padding: '18px 20px' }}>
          <input
            className="input !border-none !bg-transparent !text-[23px] font-heading !px-0 mb-2"
            placeholder="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="entry-body" style={{ fontSize: 12, opacity: 0.7 }}>
              Entry
            </label>
            <button type="button" className="btn btn-ghost !text-[12px] !px-1" onClick={() => setShowRefInsert((v) => !v)}>
              insert reference…
            </button>
          </div>
          {showRefInsert && (
            <div className="flex gap-2 mb-2">
              <input
                className="input flex-1"
                style={{ minHeight: 32, padding: '4px 12px' }}
                placeholder="e.g. Romans 8:28"
                value={refInsertValue}
                onChange={(e) => setRefInsertValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    insertReferenceIntoBody()
                  }
                }}
                autoFocus
              />
              <button type="button" className="btn btn-secondary" onClick={insertReferenceIntoBody}>
                Insert
              </button>
            </div>
          )}
          <textarea
            id="entry-body"
            ref={bodyRef}
            className="input !border-none !bg-transparent !px-0"
            style={{ fontFamily: "Lora, Georgia, serif", fontSize: "1.0625rem", lineHeight: 1.65, minHeight: 220 }}
            placeholder="Write it out…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
          />
        </div>

        <div className="flex gap-3 flex-wrap mb-4">
          <div className="field" style={{ minWidth: 220 }}>
            <label htmlFor="entry-ref">Scripture reference</label>
            <input id="entry-ref" className="input" placeholder="e.g. Romans 8:28" value={ref} onChange={(e) => setRef(e.target.value)} />
          </div>
          <div className="field" style={{ minWidth: 220 }}>
            <label htmlFor="entry-tags">Topics</label>
            <input id="entry-tags" className="input" placeholder="comma, separated" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} />
          </div>
        </div>

        <div className="field mb-4">
          <label htmlFor="entry-photos-input">Photos (optional)</label>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
              <Camera size={15} strokeWidth={2.75} />
              Add photos
              <input
                id="entry-photos-input"
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                className="hidden"
                onChange={handlePhotoFiles}
              />
            </label>
            {uploadingCount > 0 && (
              <span className="text-sm flex items-center gap-1" style={{ opacity: 0.7 }}>
                <Loader2 size={13} strokeWidth={2.75} className="animate-spin" />
                Uploading {uploadingCount}…
              </span>
            )}
          </div>
          {photoError && (
            <div className="text-sm mt-1" style={{ color: 'var(--color-accent-800)' }}>
              {photoError}
            </div>
          )}
          {photos.length > 0 && (
            <div className="flex gap-2 flex-wrap mt-2">
              {photos.map((url) => (
                <div key={url} style={{ position: 'relative', width: 64, height: 64 }}>
                  <img src={url} alt="" className="w-full h-full object-cover rounded-md" />
                  <button
                    type="button"
                    onClick={() => removePhoto(url)}
                    className="btn btn-icon"
                    style={{
                      position: 'absolute',
                      top: -6,
                      right: -6,
                      width: 20,
                      height: 20,
                      background: 'var(--color-accent-800)',
                      color: 'var(--color-bg)',
                    }}
                    aria-label="Remove photo"
                  >
                    <X size={11} strokeWidth={3} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="field mb-4" style={{ position: 'relative' }}>
          <label htmlFor="entry-related">Related entries</label>
          {relatedSelections.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mb-1.5">
              {relatedSelections.map((r) => (
                <span key={r.id} className="tag tag-neutral flex items-center gap-1">
                  no. {formatEntryNum(r.number)} — {r.title || 'Untitled'}
                  <button type="button" onClick={() => removeRelated(r.id)} aria-label="Remove" style={{ display: 'flex' }}>
                    <X size={11} strokeWidth={3} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <input
            id="entry-related"
            className="input"
            placeholder="Search by title or entry number…"
            value={relatedQuery}
            onChange={(e) => setRelatedQuery(e.target.value)}
          />
          {relatedSuggestions.length > 0 && (
            <div className="card" style={{ position: 'absolute', zIndex: 10, top: '100%', left: 0, right: 0, marginTop: 4, padding: 6 }}>
              {relatedSuggestions.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  className="btn btn-ghost !justify-start w-full !text-[13px]"
                  onClick={() => addRelated(e)}
                >
                  no. {formatEntryNum(e.number)} — {e.title || 'Untitled'}
                </button>
              ))}
            </div>
          )}
        </div>

        <button type="button" className="btn btn-ghost !px-1 mb-2 flex items-center gap-1" onClick={() => setAdvanced((v) => !v)}>
          {advanced ? <ChevronUp size={14} strokeWidth={2.75} /> : <ChevronDown size={14} strokeWidth={2.75} />}
          Advanced
        </button>

        {advanced && (
          <div className="card mb-4 flex flex-col gap-3" style={{ padding: '16px 20px' }}>
            <div className="flex gap-3 flex-wrap">
              <div className="field" style={{ minWidth: 220 }}>
                <label htmlFor="entry-shelfbook">Link to a book in My Library</label>
                <select id="entry-shelfbook" className="input" value={shelfBookId} onChange={(e) => setShelfBookId(e.target.value)}>
                  <option value="">— none —</option>
                  {myBooks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ minWidth: 120 }}>
                <label htmlFor="entry-page">Page</label>
                <input id="entry-page" className="input" placeholder="e.g. 340" value={page} onChange={(e) => setPage(e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="entry-video">Video link</label>
              <input id="entry-video" className="input" placeholder="https://youtube.com/..." value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
            </div>
            <div className="field" style={{ maxWidth: 220 }}>
              <label htmlFor="entry-number">Entry number</label>
              <input id="entry-number" className="input" value={numberOverride} onChange={(e) => setNumberOverride(e.target.value)} />
              <div className="hint text-sm mt-1" style={{ opacity: 0.6 }}>
                By default a new entry fills the lowest number nothing else is using. Override to pick a specific one -- if it's
                already taken, you'll get a lettered version instead (e.g. 125a).
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-3 text-sm" style={{ color: 'var(--color-accent-800)' }}>
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary" disabled={saving || !body.trim() || uploadingCount > 0}>
            {saving ? 'Filing…' : isEdit ? 'Save entry' : 'File entry'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </>
  )

  if (focusMode) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'var(--color-bg)', overflowY: 'auto' }}>
        <div className="max-w-[900px] mx-auto page">{formBody}</div>
      </div>
    )
  }

  return <div>{formBody}</div>
}
