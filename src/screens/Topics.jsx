import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../App'
import { listEntries, formatEntryNum, bookNameForRef, canonicalIndex } from '../lib/entries'

export default function Topics() {
  const user = useAuth()
  const [entries, setEntries] = useState(null)
  const [tab, setTab] = useState('topic')
  const [selectedTag, setSelectedTag] = useState(null)

  useEffect(() => {
    listEntries(user.id).then(setEntries)
  }, [user.id])

  const byTag = useMemo(() => {
    if (!entries) return {}
    const map = {}
    entries.forEach((e) => (e.tags || []).forEach((t) => (map[t] = map[t] || []).push(e)))
    return map
  }, [entries])

  const byBook = useMemo(() => {
    if (!entries) return {}
    const map = {}
    entries.forEach((e) => {
      const book = bookNameForRef(e.ref)
      if (book) (map[book] = map[book] || []).push(e)
    })
    return map
  }, [entries])

  const tagNames = Object.keys(byTag).sort((a, b) => byTag[b].length - byTag[a].length)
  const bookNames = Object.keys(byBook).sort((a, b) => canonicalIndex(a) - canonicalIndex(b))

  if (!selectedTag && tab === 'topic' && tagNames.length) setSelectedTag(tagNames[0])

  if (entries === null) {
    return (
      <div className="max-w-[1180px] mx-auto text-center py-24 page" style={{ opacity: 0.5 }}>
        Loading…
      </div>
    )
  }

  return (
    <div className="max-w-[1180px] mx-auto page">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="card-kicker mb-1">
            {entries.length} entries · {tagNames.length} topics · {bookNames.length} books of scripture cited
          </div>
          <h2 className="!mb-4">The index</h2>
        </div>
        <Link to="/notebook/new" className="btn btn-primary">
          + New entry
        </Link>
      </div>

      <div className="seg mb-4">
        <button
          type="button"
          className="seg-opt"
          style={tab === 'topic' ? { background: 'var(--color-accent)', color: 'var(--color-bg)' } : undefined}
          onClick={() => setTab('topic')}
        >
          By topic
        </button>
        <button
          type="button"
          className="seg-opt"
          style={tab === 'book' ? { background: 'var(--color-accent)', color: 'var(--color-bg)' } : undefined}
          onClick={() => setTab('book')}
        >
          By scripture
        </button>
      </div>

      {tab === 'topic' ? (
        tagNames.length === 0 ? (
          <p style={{ opacity: 0.5 }}>No topics tagged yet.</p>
        ) : (
          <div className="grid gap-6 md:gap-8 grid-cols-1 md:grid-cols-[1fr_360px]">
            <div className="flex flex-wrap gap-2 items-start content-start">
              {tagNames.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`tag ${selectedTag === t ? 'tag-accent' : 'tag-outline'}`}
                  onClick={() => setSelectedTag(t)}
                >
                  {t} <span style={{ opacity: 0.6, marginLeft: 4 }}>{byTag[t].length}</span>
                </button>
              ))}
            </div>
            <div>
              {selectedTag && (
                <>
                  <div className="card-kicker mb-2">
                    {selectedTag} · {byTag[selectedTag].length} entries
                  </div>
                  <div className="flex flex-col">
                    {byTag[selectedTag]
                      .sort((a, b) => a.number - b.number)
                      .map((e) => (
                        <Link
                          key={e.id}
                          to={`/notebook/${e.id}`}
                          className="flex gap-3 py-2 hover:underline"
                          style={{ borderBottom: '1px solid var(--color-divider)' }}
                        >
                          <span style={{ width: 40, opacity: 0.5, fontSize: 13 }}>no. {formatEntryNum(e.number)}</span>
                          <span style={{ fontSize: 15.5, fontWeight: 600 }}>{e.title || 'Untitled'}</span>
                        </Link>
                      ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )
      ) : bookNames.length === 0 ? (
        <p style={{ opacity: 0.5 }}>No entries have a scripture reference yet.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {bookNames.map((book) => (
            <div key={book}>
              <div className="card-kicker mb-2">
                {book} · {byBook[book].length}
              </div>
              <div className="flex flex-col">
                {byBook[book]
                  .sort((a, b) => a.number - b.number)
                  .map((e) => (
                    <Link
                      key={e.id}
                      to={`/notebook/${e.id}`}
                      className="flex gap-3 py-2 hover:underline"
                      style={{ borderBottom: '1px solid var(--color-divider)' }}
                    >
                      <span style={{ width: 40, opacity: 0.5, fontSize: 13 }}>no. {formatEntryNum(e.number)}</span>
                      <span style={{ fontSize: 15.5, fontWeight: 600 }}>{e.ref} — {e.title || 'Untitled'}</span>
                    </Link>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
