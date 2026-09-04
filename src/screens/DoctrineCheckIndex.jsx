import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search as SearchIcon, User, Loader2 } from 'lucide-react'
import { verdictClass, verdictIcon } from '../lib/verdict'
import {
  assessSubject, checksList, checksInsert, listHolyShelfUnchecked, mapAssessmentToRow,
} from '../lib/theologyCheck'

const VERDICT_FILTERS = ['All', 'Sound', 'Caution', 'Concern', 'Distinctive', 'Unable to Assess']

function verdictBucket(verdict) {
  if (!verdict) return 'Unable to Assess'
  if (verdict.startsWith('Sound')) return 'Sound'
  if (verdict.startsWith('Caution')) return 'Caution'
  if (verdict.startsWith('Concern')) return 'Concern'
  if (verdict.startsWith('Baptism')) return 'Distinctive'
  return 'Unable to Assess'
}

export default function DoctrineCheckIndex() {
  const navigate = useNavigate()

  const [checks, setChecks] = useState(null) // null = loading
  const [unchecked, setUnchecked] = useState(null)
  const [checkingIsbn, setCheckingIsbn] = useState(null) // isbn currently being checked from the shelf panel

  const [subjectKind, setSubjectKind] = useState('book')
  const [title, setTitle] = useState('')
  const [authors, setAuthors] = useState('')
  const [isbn, setIsbn] = useState('')
  const [name, setName] = useState('')
  const [running, setRunning] = useState(false)
  const [runError, setRunError] = useState('')

  const [verdictFilter, setVerdictFilter] = useState('All')
  const [kindFilter, setKindFilter] = useState('All')
  const [query, setQuery] = useState('')

  async function loadChecks() {
    try {
      const { data } = await checksList()
      setChecks(data || [])
    } catch (err) {
      alert('Could not load checks: ' + err.message)
      setChecks([])
    }
  }

  async function loadUnchecked() {
    try {
      const { data } = await listHolyShelfUnchecked()
      setUnchecked(data || [])
    } catch {
      setUnchecked([])
    }
  }

  useEffect(() => {
    loadChecks()
    loadUnchecked()
  }, [])

  const stats = useMemo(() => {
    if (!checks) return null
    const s = { total: checks.length, Sound: 0, Caution: 0, Concern: 0, Distinctive: 0, 'Unable to Assess': 0 }
    checks.forEach((c) => {
      s[verdictBucket(c.verdict)]++
    })
    return s
  }, [checks])

  const filtered = useMemo(() => {
    if (!checks) return []
    let list = checks
    if (verdictFilter !== 'All') list = list.filter((c) => verdictBucket(c.verdict) === verdictFilter)
    if (kindFilter !== 'All') list = list.filter((c) => c.kind === kindFilter)
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter(
        (c) => c.title?.toLowerCase().includes(q) || c.name?.toLowerCase().includes(q) || c.authors?.toLowerCase().includes(q)
      )
    }
    return [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }, [checks, verdictFilter, kindFilter, query])

  async function runCheck(subject, extraRowFields = {}) {
    const assessment = await assessSubject(subject)
    const id = crypto.randomUUID()
    const row = {
      id,
      kind: subject.kind,
      isbn: subject.isbn || null,
      title: subject.title || null,
      authors: subject.authors || null,
      name: subject.name || null,
      cover_url: extraRowFields.cover_url || null,
      tags: [],
      is_wishlist: false,
      followups: [],
      confession_comparisons: {},
      created_at: new Date().toISOString(),
      ...mapAssessmentToRow(assessment),
    }
    const { error } = await checksInsert(row)
    if (error) throw new Error(error)
    return id
  }

  async function handleNewCheck(e) {
    e.preventDefault()
    setRunError('')
    setRunning(true)
    try {
      const subject =
        subjectKind === 'book'
          ? { kind: 'book', title: title.trim(), authors: authors.trim(), isbn: isbn.trim() || null }
          : { kind: 'person', name: name.trim() }
      const id = await runCheck(subject)
      navigate(`/checks/${id}`)
    } catch (err) {
      setRunError(err.message)
    } finally {
      setRunning(false)
    }
  }

  async function handleCheckShelfBook(book) {
    setCheckingIsbn(book.isbn)
    try {
      const id = await runCheck(
        { kind: 'book', title: book.title, authors: book.author, isbn: book.isbn },
        { cover_url: book.cover_url }
      )
      navigate(`/checks/${id}`)
    } catch (err) {
      alert('Could not run check: ' + err.message)
      setCheckingIsbn(null)
    }
  }

  return (
    <div className="max-w-[1180px] mx-auto" style={{ padding: '30px 40px 70px' }}>
      <div className="card-kicker mb-1">Measured against the Baptist Faith &amp; Message 2000</div>
      <h2 className="!mb-4">Doctrine Check</h2>

      {/* New check card */}
      <div className="card mb-5" style={{ background: 'var(--color-accent-100)', padding: '18px 20px' }}>
        <div className="seg self-start mb-2">
          <button
            type="button"
            className="seg-opt"
            style={subjectKind === 'book' ? { background: 'var(--color-accent)', color: 'var(--color-bg)' } : undefined}
            onClick={() => setSubjectKind('book')}
          >
            Book or ISBN
          </button>
          <button
            type="button"
            className="seg-opt"
            style={subjectKind === 'person' ? { background: 'var(--color-accent)', color: 'var(--color-bg)' } : undefined}
            onClick={() => setSubjectKind('person')}
          >
            Author or teacher
          </button>
        </div>

        <form onSubmit={handleNewCheck} className="flex gap-2 flex-wrap items-end">
          {subjectKind === 'book' ? (
            <>
              <div className="field" style={{ minWidth: 220 }}>
                <label htmlFor="chk-title">Title</label>
                <input id="chk-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className="field" style={{ minWidth: 180 }}>
                <label htmlFor="chk-authors">Author(s)</label>
                <input id="chk-authors" className="input" value={authors} onChange={(e) => setAuthors(e.target.value)} />
              </div>
              <div className="field" style={{ minWidth: 140 }}>
                <label htmlFor="chk-isbn">ISBN (optional)</label>
                <input id="chk-isbn" className="input" value={isbn} onChange={(e) => setIsbn(e.target.value)} />
              </div>
            </>
          ) : (
            <div className="field" style={{ minWidth: 260 }}>
              <label htmlFor="chk-name">Name</label>
              <input id="chk-name" className="input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          )}
          <button type="submit" className="btn btn-primary" disabled={running}>
            {running ? (
              <>
                <Loader2 size={14} strokeWidth={2.75} className="animate-spin" /> Checking…
              </>
            ) : (
              'Check'
            )}
          </button>
        </form>
        {runError && (
          <div className="mt-2 text-sm" style={{ color: 'var(--color-accent-800)' }}>
            {runError}
          </div>
        )}

        {unchecked && unchecked.length > 0 && (
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--color-divider)' }}>
            <div className="text-sm mb-2">
              Or check your shelf — <b>{unchecked.length}</b> of your books have no verdict yet.
            </div>
            <div className="flex flex-col gap-1.5 max-h-[240px] overflow-y-auto">
              {unchecked.map((b) => (
                <div key={b.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">
                    {b.title} {b.author ? <span style={{ opacity: 0.6 }}>· {b.author}</span> : null}
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary shrink-0"
                    style={{ padding: '4px 12px', fontSize: 12 }}
                    disabled={checkingIsbn === b.isbn}
                    onClick={() => handleCheckShelfBook(b)}
                  >
                    {checkingIsbn === b.isbn ? 'Checking…' : 'Check'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Stat cells */}
      {stats && (
        <div className="flex flex-wrap gap-6 mb-5 pt-3 pb-3" style={{ borderTop: '1px solid var(--color-divider)', borderBottom: '1px solid var(--color-divider)' }}>
          {[
            ['Checks run', stats.total],
            ['Sound', stats.Sound],
            ['Caution', stats.Caution],
            ['Concern', stats.Concern],
            ['Distinctive', stats.Distinctive],
            ['Unable to Assess', stats['Unable to Assess']],
          ].map(([label, value]) => (
            <div key={label}>
              <div className="font-heading" style={{ fontSize: 28 }}>
                {value}
              </div>
              <div className="card-meta">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap mb-3">
        <div className="seg">
          {VERDICT_FILTERS.map((v) => (
            <button
              key={v}
              type="button"
              className="seg-opt"
              style={verdictFilter === v ? { background: 'var(--color-accent)', color: 'var(--color-bg)' } : undefined}
              onClick={() => setVerdictFilter(v)}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="seg">
          {['All', 'book', 'person'].map((k) => (
            <button
              key={k}
              type="button"
              className="seg-opt"
              style={kindFilter === k ? { background: 'var(--color-accent)', color: 'var(--color-bg)' } : undefined}
              onClick={() => setKindFilter(k)}
            >
              {k === 'All' ? 'All' : k === 'book' ? 'Books' : 'People'}
            </button>
          ))}
        </div>
        <div className="relative ml-auto" style={{ width: 210 }}>
          <SearchIcon size={14} strokeWidth={2.75} className="absolute top-1/2 -translate-y-1/2" style={{ left: 12, opacity: 0.5 }} />
          <input className="input" style={{ paddingLeft: 32 }} placeholder="Filter…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      {/* Table */}
      {checks === null ? (
        <div className="text-center py-24" style={{ opacity: 0.5 }}>
          Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24" style={{ opacity: 0.5 }}>
          No checks match that filter.
        </div>
      ) : (
        <table className="table w-full">
          <thead>
            <tr>
              <th style={{ width: '48%' }}>Subject</th>
              <th style={{ width: '12%' }}>Type</th>
              <th style={{ width: '20%' }}>Verdict</th>
              <th style={{ width: '20%' }}>Checked</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const VerdictIcon = verdictIcon(c.verdict)
              return (
                <tr key={c.id} className="cursor-pointer" onClick={() => navigate(`/checks/${c.id}`)}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      {c.kind === 'book' ? (
                        <div className="rounded-sm shrink-0 overflow-hidden bg-neutral-200" style={{ width: 30, height: 45 }}>
                          {c.cover_url && <img src={c.cover_url} alt="" className="w-full h-full object-cover" />}
                        </div>
                      ) : (
                        <div
                          className="rounded-full shrink-0 flex items-center justify-center bg-neutral-200"
                          style={{ width: 30, height: 30 }}
                        >
                          <User size={14} strokeWidth={2.75} style={{ opacity: 0.5 }} />
                        </div>
                      )}
                      <div>
                        <div className="card-title !text-[14px]">{c.title || c.name}</div>
                        {c.kind === 'book' && c.authors && <div className="card-meta">{c.authors}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>{c.kind}</td>
                  <td>
                    <span className={`tag ${verdictClass(c.verdict)} flex items-center gap-1 w-fit`}>
                      <VerdictIcon size={12} strokeWidth={2.75} />
                      {c.verdict || 'Unable to Assess'}
                    </span>
                  </td>
                  <td className="card-meta">{new Date(c.created_at).toLocaleDateString()}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
