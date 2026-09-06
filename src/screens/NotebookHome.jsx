import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useAuth } from '../App'
import { listEntries, formatEntryNum } from '../lib/entries'
import EntryComposerForm from '../components/EntryComposerForm'

// The Notebook's real landing page -- a reverse-chronological stream of
// every entry, with "New entry" expanding the composer inline above it
// rather than /notebook redirecting straight into a separate page. Matches
// the original digging-deep-notebook app's own layout (one continuous
// stream with an expandable form at the top), which this had drifted from.
export default function NotebookHome() {
  const user = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const prefill = location.state || {}

  const [entries, setEntries] = useState(null)
  // /notebook/new (the "+ New entry" links throughout the app, and Bible
  // Study's "Create Notebook Entry" deep-link) always opens the composer
  // immediately; bare /notebook is the stream, unless it arrived with a
  // prefill anyway.
  const [composing, setComposing] = useState(location.pathname === '/notebook/new' || !!(prefill.ref || prefill.body))

  useEffect(() => {
    listEntries(user.id).then((rows) => {
      setEntries([...rows].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
    })
  }, [user.id])

  function handleSaved(entryId) {
    navigate(`/notebook/${entryId}`)
  }

  return (
    <div className="max-w-[1080px] mx-auto page">
      {composing ? (
        <div className="mb-6">
          <EntryComposerForm
            userId={user.id}
            presetRef={prefill.ref}
            presetBody={prefill.body}
            onSaved={handleSaved}
            onCancel={() => setComposing(false)}
          />
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
          <h2 className="!mb-0">Notebook</h2>
          <button type="button" className="btn btn-primary" onClick={() => setComposing(true)}>
            <Plus size={15} strokeWidth={2.75} />
            New entry
          </button>
        </div>
      )}

      {entries === null ? (
        <div className="text-center py-16" style={{ opacity: 0.5 }}>
          Loading…
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16" style={{ opacity: 0.5 }}>
          Nothing written yet -- your first entry will show up here.
        </div>
      ) : (
        <div className="flex flex-col">
          {entries.map((e) => (
            <Link
              key={e.id}
              to={`/notebook/${e.id}`}
              className="flex flex-col gap-1 py-3 hover:bg-surface"
              style={{ borderBottom: '1px solid var(--color-divider)' }}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="card-meta">no. {formatEntryNum(e.number)}</span>
                {e.ref && <span className="tag tag-accent">{e.ref}</span>}
                <span className="card-meta">{new Date(e.created_at).toLocaleDateString()}</span>
              </div>
              <div className="card-title">{e.title || 'Untitled'}</div>
              <p className="card-body !opacity-60" style={{ maxWidth: '70ch' }}>
                {(e.body || '').slice(0, 180)}
              </p>
              {e.tags?.length > 0 && (
                <div className="flex gap-1 flex-wrap mt-0.5">
                  {e.tags.map((t) => (
                    <span key={t} className="tag tag-neutral">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
