import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../App'
import { createEntry, setRelated, listEntries, formatEntryNum, nextGapNumber } from '../lib/entries'

export default function Composer() {
  const user = useAuth()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [ref, setRef] = useState('')
  const [tags, setTags] = useState('')
  const [related, setRelatedInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [previewNumber, setPreviewNumber] = useState(null)
  const [allEntries, setAllEntries] = useState([])

  useEffect(() => {
    listEntries(user.id).then((rows) => {
      setAllEntries(rows)
      setPreviewNumber(nextGapNumber(rows.map((r) => r.number)))
    })
  }, [user.id])

  async function handleSave(e) {
    e.preventDefault()
    if (!body.trim()) return
    setSaving(true)
    setError('')
    try {
      const entry = await createEntry(user.id, {
        title: title.trim() || null,
        body: body.trim(),
        ref: ref.trim() || null,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      })

      const relatedNumbers = related
        .split(',')
        .map((s) => parseFloat(s.trim()))
        .filter((n) => !Number.isNaN(n))
      if (relatedNumbers.length) {
        const relatedIds = allEntries.filter((e) => relatedNumbers.includes(e.number)).map((e) => e.id)
        if (relatedIds.length) await setRelated(entry.id, relatedIds)
      }

      navigate(`/notebook/${entry.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-[1080px] mx-auto" style={{ padding: '30px 40px 70px' }}>
      <div className="card-kicker mb-1">Notebook · Miscellanies</div>
      <h2 className="!mb-4">New entry{previewNumber != null ? `, no. ${formatEntryNum(previewNumber)}` : ''}</h2>

      <form onSubmit={handleSave}>
        <div className="card mb-4" style={{ padding: '18px 20px' }}>
          <input
            className="input !border-none !bg-transparent !text-[23px] font-heading !px-0 mb-2"
            placeholder="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="input !border-none !bg-transparent !px-0"
            style={{ fontSize: 16.5, lineHeight: 1.65, minHeight: 220 }}
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
            <label htmlFor="entry-tags">Tags</label>
            <input id="entry-tags" className="input" placeholder="comma, separated" value={tags} onChange={(e) => setTags(e.target.value)} />
          </div>
          <div className="field" style={{ minWidth: 220 }}>
            <label htmlFor="entry-related">Related entries</label>
            <input
              id="entry-related"
              className="input"
              placeholder="entry numbers, e.g. 12, 45"
              value={related}
              onChange={(e) => setRelatedInput(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="mb-3 text-sm" style={{ color: 'var(--color-accent-800)' }}>
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary" disabled={saving || !body.trim()}>
            {saving ? 'Filing…' : 'File entry'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
