import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { NotebookPen, ShieldCheck, Search, LibraryBig } from 'lucide-react'
import { useAuth } from '../App'
import { supabase } from '../lib/supabase'
import { verdictClass, verdictIcon } from '../lib/verdict'
import { formatEntryNum } from '../lib/entries'
import { fetchVerseOfTheDay } from '../lib/votd'

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
  const [votd, setVotd] = useState(null) // null = loading, false = error

  useEffect(() => {
    let cancelled = false
    fetchVerseOfTheDay()
      .then((v) => {
        if (!cancelled) setVotd(v)
      })
      .catch(() => {
        if (!cancelled) setVotd(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

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
    <div className="max-w-[1180px] mx-auto page">
      <div className="home-welcome mb-6">
        <div>
          <div className="card-kicker mb-1">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
          <h2 className="!mb-0">
            {greeting()}, {user.user_metadata?.display_name || user.email.split('@')[0]}
          </h2>
        </div>
        <p className="mt-3 mb-0 max-w-[65ch]">Search the Scriptures. Keep your notes close. Make room for deliberate study.</p>
      </div>

      <section className="card mb-6 scripture-block" aria-labelledby="focus-title">
        <div className="card-kicker">Today’s Focus</div>
        <h2 id="focus-title" className="text-xl">Examine the Scriptures</h2>
        <p className="card-body">Begin with Acts 17:10–12 and the Bereans’ example of receiving the word and examining the Scriptures.</p>
        <Link to="/bible?book=Acts&chapter=17&verse=10&verseEnd=12" className="btn btn-primary self-start mt-2">Open study</Link>
      </section>
      <section className="mb-6" aria-labelledby="quick-actions-title">
        <h2 id="quick-actions-title" className="card-kicker mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <Link to="/search" className="card home-action"><Search aria-hidden="true" /><span>Search Scripture</span></Link>
          <Link to="/shelf" className="card home-action"><LibraryBig aria-hidden="true" /><span>Open Library</span></Link>
          <Link to="/notebook/new" className="card home-action"><NotebookPen aria-hidden="true" /><span>New Note</span></Link>
          <Link to="/checks" className="card home-action"><ShieldCheck aria-hidden="true" /><span>Doctrine Check</span></Link>
        </div>
      </section>

      <div className="card mb-6" >
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="card-kicker">Verse of the Day</div>
          {votd && (
            <Link
              to={`/bible?book=${encodeURIComponent(votd.book)}&chapter=${votd.chapter}${
                votd.verseStart ? `&verse=${votd.verseStart}` : ''
              }${votd.verseEnd && votd.verseEnd !== votd.verseStart ? `&verseEnd=${votd.verseEnd}` : ''}`}
              className="text-sm hover:underline"
            >
              Read in Bible Study →
            </Link>
          )}
        </div>
        {votd === null ? (
          <div className="text-sm" style={{ opacity: 0.5 }}>
            Loading…
          </div>
        ) : votd === false ? (
          <div className="text-sm" style={{ opacity: 0.5 }}>
            Couldn't load today's verse.
          </div>
        ) : (
          <>
            <p className="scripture-text scripture-block">&ldquo;{votd.text}&rdquo;</p>
            <p className="mt-2" style={{ fontSize: ".75rem", color: "var(--bsd-muted)" }}>
              {votd.reference} (BSB) — daily pick via{' '}
              <a href="https://www.biblegateway.com" target="_blank" rel="noopener noreferrer">
                BibleGateway.com
              </a>
            </p>
          </>
        )}
      </div>

      {reading && (
        <div className="card mb-6" >
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="card-kicker">Currently reading</div>
            <Link to={`/reading/${reading.id}`} className="text-sm hover:underline">
              Continue reading →
            </Link>
          </div>
          <div className="grid gap-4 md:gap-6 items-center grid-cols-1 xl:grid-cols-[80px_1fr_246px]">
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

      <div className="card-kicker mb-2">Recent Activity</div>
      {feed === null ? (
        <div className="text-center py-16" style={{ opacity: 0.5 }}>
          Loading…
        </div>
      ) : feed.length === 0 ? (
        <div className="card"><p className="card-body">Your notes and assessments will appear here as you study.</p><Link to="/notebook/new" className="btn btn-secondary self-start">Write your first note</Link></div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {feed.map(({ type, item }) =>
            type === 'entry' ? (
              <Link key={item.id} to={`/notebook/${item.id}`} className="card hover:shadow-sm">
                <div className="card-meta">
                  <NotebookPen size={12} strokeWidth={2.75} />
                  no. {formatEntryNum(item.number)}
                </div>
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
                    <div className="card-meta">
                      <ShieldCheck size={12} strokeWidth={2.75} />
                      Doctrine Check
                    </div>
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
