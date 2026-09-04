import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../App'
import { supabase } from '../lib/supabase'
import { verdictClass, verdictIcon } from '../lib/verdict'
import { formatEntryNum } from '../lib/entries'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function Home() {
  const user = useAuth()
  const [reading, setReading] = useState(null) // undefined-ish: null = none/not loaded
  const [feed, setFeed] = useState(null) // null = loading

  useEffect(() => {
    let cancelled = false

    async function load() {
      const [{ data: readingBooks }, { data: recentEntries }, { data: recentChecks }] = await Promise.all([
        supabase.from('books').select('*').eq('user_id', user.id).eq('reading_status', 'in-progress').order('updated_at', { ascending: false }).limit(1),
        supabase.from('entries').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(6),
        supabase.from('theology_checks').select('*').order('created_at', { ascending: false }).limit(6),
      ])
      if (cancelled) return

      const book = readingBooks?.[0] || null
      if (book?.isbn) {
        const { data: check } = await supabase.from('theology_checks').select('verdict, summary').eq('isbn', book.isbn).eq('kind', 'book').maybeSingle()
        setReading({ ...book, verdict: check?.verdict, verdictSummary: check?.summary })
      } else {
        setReading(book)
      }

      const combined = [
        ...(recentEntries || []).map((e) => ({ type: 'entry', date: e.created_at, item: e })),
        ...(recentChecks || []).map((c) => ({ type: 'check', date: c.created_at, item: c })),
      ]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 8)
      setFeed(combined)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user.id])

  return (
    <div className="max-w-[1180px] mx-auto" style={{ padding: '30px 40px 70px' }}>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <div className="card-kicker mb-1">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
          <h2 className="!mb-0">
            {greeting()}, {user.user_metadata?.display_name || user.email.split('@')[0]}
          </h2>
        </div>
        <div className="flex gap-2">
          <Link to="/shelf/add" className="btn btn-secondary">
            Add a book
          </Link>
          <Link to="/checks" className="btn btn-secondary">
            Run a check
          </Link>
          <Link to="/notebook/new" className="btn btn-primary">
            + New entry
          </Link>
        </div>
      </div>

      {reading && (
        <div className="card mb-6" style={{ padding: '18px 20px' }}>
          <div className="card-kicker mb-2">Currently reading</div>
          <div className="grid gap-6 items-center" style={{ gridTemplateColumns: '80px 1fr 246px' }}>
            <div className="rounded-sm overflow-hidden bg-neutral-200" style={{ width: 80, aspectRatio: '2/3' }}>
              {reading.cover_url && <img src={reading.cover_url} alt="" className="w-full h-full object-cover" />}
            </div>
            <div>
              <h3 className="!mb-1">{reading.title}</h3>
              <div className="card-meta">{reading.author}</div>
              {reading.tradition && <span className="tag tag-neutral mt-2 inline-block">{reading.tradition}</span>}
            </div>
            {reading.verdict && (
              <div className="pl-6" style={{ borderLeft: '1px solid var(--color-divider)' }}>
                {(() => {
                  const VerdictIcon = verdictIcon(reading.verdict)
                  return (
                    <span className={`tag ${verdictClass(reading.verdict)} flex items-center gap-1 w-fit mb-2`}>
                      <VerdictIcon size={12} strokeWidth={2.75} />
                      {reading.verdict}
                    </span>
                  )
                })()}
                <p className="text-sm" style={{ opacity: 0.75, lineHeight: 1.5 }}>
                  {reading.verdictSummary}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="card-kicker mb-2">Recent notes &amp; checks</div>
      {feed === null ? (
        <div className="text-center py-16" style={{ opacity: 0.5 }}>
          Loading…
        </div>
      ) : feed.length === 0 ? (
        <div className="text-center py-16" style={{ opacity: 0.5 }}>
          Nothing yet — write your first entry or run your first check.
        </div>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
          {feed.map(({ type, item }) =>
            type === 'entry' ? (
              <Link key={item.id} to={`/notebook/${item.id}`} className="card hover:shadow-sm">
                <div className="card-meta">no. {formatEntryNum(item.number)}</div>
                <div className="card-title">{item.title || 'Untitled'}</div>
                <p className="card-body">{(item.body || '').slice(0, 140)}</p>
                {item.tags?.length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-1">
                    {item.tags.slice(0, 3).map((t) => (
                      <span key={t} className="tag tag-neutral">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            ) : (
              (() => {
                const VerdictIcon = verdictIcon(item.verdict)
                return (
                  <Link key={item.id} to={`/checks/${item.id}`} className="card hover:shadow-sm">
                    <div className="card-meta">Doctrine Check</div>
                    <div className="card-title">{item.title || item.name}</div>
                    <span className={`tag ${verdictClass(item.verdict)} flex items-center gap-1 w-fit`}>
                      <VerdictIcon size={12} strokeWidth={2.75} />
                      {item.verdict || 'Unable to Assess'}
                    </span>
                  </Link>
                )
              })()
            )
          )}
        </div>
      )}
    </div>
  )
}
