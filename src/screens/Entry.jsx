import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getEntry, getLinksFor, deleteEntry, formatEntryNum } from '../lib/entries'
import { fetchEsvPassage } from '../lib/esv'
import { supabase } from '../lib/supabase'
import { stanceClass } from '../lib/stance'
import { useAuth } from '../App'
import ScriptureText from '../components/ScriptureText'
import EntryComposerForm from '../components/EntryComposerForm'

export default function Entry() {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = useAuth()

  const [entry, setEntry] = useState(null) // null = loading, false = not found
  const [links, setLinks] = useState({ seeAlso: [], referencedBy: [] })
  const [book, setBook] = useState(null) // the shelf book this note was taken while reading, if any
  const [editing, setEditing] = useState(false)
  const [passage, setPassage] = useState(null) // null = not loaded, false = load failed
  const [passageLoading, setPassageLoading] = useState(false)

  async function load() {
    const e = await getEntry(id)
    setEntry(e || false)
    if (e) {
      setLinks(await getLinksFor(id))
      if (e.shelf_book_id) {
        const { data } = await supabase.from('books').select('id, title').eq('id', e.shelf_book_id).maybeSingle()
        setBook(data || null)
      }
    }
  }

  useEffect(() => {
    load()
  }, [id])

  useEffect(() => {
    if (!entry || !entry.ref) {
      setPassage(null)
      return
    }
    let cancelled = false
    setPassageLoading(true)
    fetchEsvPassage(entry.ref)
      .then((result) => {
        if (!cancelled) setPassage(result)
      })
      .catch(() => {
        if (!cancelled) setPassage(false)
      })
      .finally(() => {
        if (!cancelled) setPassageLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [entry?.ref])

  async function handleDelete() {
    if (!confirm(`Delete entry no. ${formatEntryNum(entry.number)}? This can't be undone.`)) return
    try {
      await deleteEntry(id)
      navigate('/topics')
    } catch (err) {
      alert('Error deleting: ' + err.message)
    }
  }

  if (entry === null) {
    return (
      <div className="max-w-[1080px] mx-auto text-center py-24 page" style={{ opacity: 0.5 }}>
        Loading…
      </div>
    )
  }
  if (entry === false) {
    return (
      <div className="max-w-[1080px] mx-auto page">
        <p>Entry not found.</p>
        <Link to="/topics" className="btn btn-secondary">
          ← Topics
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-[1080px] mx-auto page">
      <div className="flex items-center justify-between mb-4">
        <div className="card-meta">
          <Link to="/topics" className="hover:underline">
            Notebook / Miscellanies
          </Link>{' '}
          · no. {formatEntryNum(entry.number)}
        </div>
        <div className="flex gap-2">
          {!editing && (
            <button type="button" className="btn btn-secondary" onClick={() => setEditing(true)}>
              Edit
            </button>
          )}
          <button type="button" className="btn btn-ghost" style={{ color: 'var(--color-accent-700)' }} onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:gap-9 grid-cols-1 md:grid-cols-[1fr_300px]">
        <div>
          {editing ? (
            <EntryComposerForm
              userId={user.id}
              initial={entry}
              initialRelated={links.seeAlso}
              onSaved={() => {
                load()
                setEditing(false)
              }}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <article>
              <h1 style={{ fontSize: 38, lineHeight: 1.08, maxWidth: '22ch' }}>{entry.title || 'Untitled'}</h1>
              <div className="flex items-center gap-2 flex-wrap mb-4">
                <div className="card-meta">{new Date(entry.created_at).toLocaleDateString()}</div>
                {book && (
                  <Link to={`/reading/${book.id}`} className="card-meta hover:underline">
                    · while reading {book.title}
                  </Link>
                )}
                {entry.stance && <span className={`tag ${stanceClass(entry.stance)}`}>{entry.stance}</span>}
              </div>
              {entry.ref && (
                <div className="card mb-4" style={{ background: 'var(--color-accent-100)', padding: '18px 20px' }}>
                  <div className="card-kicker" style={{ color: 'var(--color-accent-700)' }}>
                    {(passage && passage.canonical) || entry.ref}
                  </div>
                  {passageLoading ? (
                    <div className="text-sm mt-1" style={{ opacity: 0.6 }}>
                      Loading passage…
                    </div>
                  ) : passage === false ? (
                    <div className="text-sm mt-1" style={{ opacity: 0.6 }}>
                      Couldn't look up that reference.
                    </div>
                  ) : passage ? (
                    <p className="mt-1" style={{ fontSize: 15.5, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                      {passage.text}
                    </p>
                  ) : null}
                </div>
              )}
              <ScriptureText text={entry.body} style={{ fontSize: 17, lineHeight: 1.7 }} />
              {entry.photos?.length > 0 && (
                <div className="flex gap-2 flex-wrap mt-4">
                  {entry.photos.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                      <img src={url} alt="" className="rounded-md object-cover" style={{ width: 96, height: 96 }} />
                    </a>
                  ))}
                </div>
              )}
              {entry.video_url && (
                <p className="mt-3">
                  <a href={entry.video_url} target="_blank" rel="noopener noreferrer" className="text-sm hover:underline">
                    Watch video →
                  </a>
                </p>
              )}
              {entry.page && <p className="card-meta mt-2">p. {entry.page}</p>}
              {entry.tags?.length > 0 && (
                <div className="flex gap-1.5 flex-wrap mt-6 pt-4" style={{ borderTop: '1px solid var(--color-divider)' }}>
                  {entry.tags.map((t) => (
                    <span key={t} className="tag tag-neutral">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </article>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {links.seeAlso.length > 0 && (
            <div className="card">
              <div className="card-title">See also</div>
              {links.seeAlso.map((e) => (
                <Link key={e.id} to={`/notebook/${e.id}`} className="text-sm hover:underline">
                  no. {formatEntryNum(e.number)} — {e.title || 'Untitled'}
                </Link>
              ))}
            </div>
          )}
          {links.referencedBy.length > 0 && (
            <div className="card">
              <div className="card-title">Referenced by</div>
              {links.referencedBy.map((e) => (
                <Link key={e.id} to={`/notebook/${e.id}`} className="text-sm hover:underline">
                  no. {formatEntryNum(e.number)} — {e.title || 'Untitled'}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
