import { useEffect, useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { fetchCoverCandidates } from '../lib/googleBooks'

// Shows every cover candidate we can find for an ISBN side by side, so the
// user can pick the edition that actually matches their physical copy
// instead of whatever a single "best guess" lookup would have landed on.
export default function ChangeCoverDialog({ isbn, currentUrl, onSelect, onClose }) {
  const [candidates, setCandidates] = useState(null) // null = loading

  useEffect(() => {
    if (!isbn) {
      setCandidates([])
      return
    }
    let cancelled = false
    setCandidates(null)
    fetchCoverCandidates(isbn).then((result) => {
      if (!cancelled) setCandidates(result)
    })
    return () => {
      cancelled = true
    }
  }, [isbn])

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" style={{ width: 'min(480px, 100%)' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="dialog-title">Change cover</div>
          <button type="button" className="btn btn-icon btn-ghost" onClick={onClose} aria-label="Close">
            <X size={16} strokeWidth={2.75} />
          </button>
        </div>

        {!isbn && (
          <p className="dialog-body">Add an ISBN first so I can look up alternate covers — or paste a cover URL directly.</p>
        )}

        {isbn && candidates === null && (
          <div className="flex items-center gap-2 text-sm" style={{ opacity: 0.7 }}>
            <Loader2 size={14} strokeWidth={2.75} className="animate-spin" /> Looking up covers…
          </div>
        )}

        {isbn && candidates?.length === 0 && <p className="dialog-body">No alternate covers found for that ISBN.</p>}

        {candidates?.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {candidates.map((c) => (
              <button
                key={c.source}
                type="button"
                className="flex flex-col items-center gap-1.5"
                onClick={() => onSelect(c.url)}
              >
                <div
                  className="rounded-sm overflow-hidden bg-neutral-200 w-full"
                  style={{
                    aspectRatio: '2/3',
                    border: c.url === currentUrl ? '2px solid var(--color-accent)' : '1px solid var(--color-divider)',
                  }}
                >
                  <img src={c.url} alt="" className="w-full h-full object-cover" />
                </div>
                <span className="card-meta">{c.source}</span>
              </button>
            ))}
          </div>
        )}

        <p className="text-sm" style={{ opacity: 0.6 }}>
          Own a different edition than any of these? Paste its cover URL directly in the field below instead.
        </p>
      </div>
    </div>
  )
}
