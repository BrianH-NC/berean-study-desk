import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search as SearchIcon, User, Loader2, ScanBarcode, Camera, Images } from 'lucide-react'
import { verdictClass, verdictIcon } from '../lib/verdict'
import {
  assessSubject, checksList, checksInsert, listHolyShelfUnchecked, mapAssessmentToRow,
} from '../lib/theologyCheck'
import { fetchBookByISBN } from '../lib/googleBooks'
import { identifyShelfPhoto } from '../lib/shelfPhoto'
import { DoctrineHeader, DoctrineLegend, CreationAssessment } from '../components/DoctrineChrome'
import BarcodeScanner from '../components/BarcodeScanner'

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
  const [showScanner, setShowScanner] = useState(false)
  const [scanLookupLoading, setScanLookupLoading] = useState(false)

  const shelfFileRef = useRef(null)
  const [showShelfScan, setShowShelfScan] = useState(false)
  const [shelfPhotoUrl, setShelfPhotoUrl] = useState(null)
  const [shelfScanning, setShelfScanning] = useState(false)
  const [shelfScanError, setShelfScanError] = useState('')
  const [shelfFound, setShelfFound] = useState(null) // [{ title, author, confidence, include }]
  const [shelfChecking, setShelfChecking] = useState(false)
  const [shelfProgress, setShelfProgress] = useState(null) // { done, total }

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

  async function handleScan(scannedIsbn) {
    setShowScanner(false)
    setSubjectKind('book')
    setIsbn(scannedIsbn)
    setScanLookupLoading(true)
    const book = await fetchBookByISBN(scannedIsbn)
    setScanLookupLoading(false)
    if (book) {
      setTitle(book.title)
      setAuthors(book.author)
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

  async function handleShelfFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setShelfPhotoUrl(URL.createObjectURL(file))
    setShelfFound(null)
    setShelfScanError('')
    setShelfScanning(true)
    try {
      const result = await identifyShelfPhoto(file)
      setShelfFound((result.books || []).map((b) => ({ ...b, include: true })))
    } catch (err) {
      setShelfScanError(err.message)
    } finally {
      setShelfScanning(false)
    }
  }

  function updateShelfFound(i, patch) {
    setShelfFound((prev) => prev.map((b, idx) => (idx === i ? { ...b, ...patch } : b)))
  }

  // Runs checks sequentially (not in parallel) -- each is a real paid Anthropic
  // call, so the user sees exactly what's running and can't accidentally fire
  // a burst of simultaneous requests.
  async function handleRunShelfChecks() {
    const toRun = shelfFound.filter((b) => b.include && b.title?.trim())
    if (toRun.length === 0) return
    setShelfChecking(true)
    let done = 0
    setShelfProgress({ done, total: toRun.length })
    for (const b of toRun) {
      try {
        await runCheck({ kind: 'book', title: b.title.trim(), authors: b.author?.trim() || '' })
      } catch {
        // Continue with the rest even if one subject fails to resolve.
      }
      done++
      setShelfProgress({ done, total: toRun.length })
    }
    setShelfChecking(false)
    setShelfFound(null)
    setShelfPhotoUrl(null)
    await loadChecks()
  }

  return (
    <div className="page doctrine-desk doctrine-index">
      <DoctrineHeader/>
      <div className="doctrine-layout"><div className="doctrine-main">

      {/* New check card */}
      <div className="card mb-5 doctrine-new-check" style={{ background: 'var(--color-accent-100)', padding: '18px 20px' }}>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <div className="seg self-start">
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
          {subjectKind === 'book' && (
            <div className="flex gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => setShowScanner(true)}>
                <ScanBarcode size={15} strokeWidth={2.75} />
                Scan barcode
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowShelfScan((v) => !v)}>
                <Images size={15} strokeWidth={2.75} />
                Scan a shelf
              </button>
            </div>
          )}
        </div>

        {scanLookupLoading && (
          <div className="text-sm mb-2 flex items-center gap-1.5" style={{ opacity: 0.7 }}>
            <Loader2 size={13} strokeWidth={2.75} className="animate-spin" /> Looking up that ISBN…
          </div>
        )}

        <div className="doctrine-framework"><strong>Analysis Framework</strong><br/>Baptist Faith &amp; Message 2000. Additional doctrinal comparisons are available after the check. Creation and origins are assessed separately.</div>
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
              'Run Doctrine Check'
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

        {/* Scan a shelf -- for browsing a real shelf (e.g. in a store) rather
            than your own library; identifies whatever it can read from a
            photo, then runs the checks you select. Nested in this same card
            behind the button above rather than its own separate panel, since
            it's really just a third way to find a subject alongside typing
            one in or scanning a barcode. */}
        {showShelfScan && (
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--color-divider)' }}>
            <div className="card-body mb-2">
              Photograph any shelf — a store, a friend's study — and check whichever books you pick from what's read.
            </div>

            {!shelfFound && !shelfScanning && (
              <button type="button" className="btn btn-secondary" onClick={() => shelfFileRef.current?.click()}>
                <Camera size={15} strokeWidth={2.75} />
                Choose a photo
              </button>
            )}
            <input
              ref={shelfFileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleShelfFileChange}
            />

            {shelfPhotoUrl && (shelfScanning || shelfFound) && (
              <div className="flex gap-5 mt-3 flex-wrap">
                <img src={shelfPhotoUrl} alt="" className="rounded-md" style={{ width: 140, objectFit: 'cover' }} />
                <div className="flex-1" style={{ minWidth: 260 }}>
                  {shelfScanning && (
                    <div className="flex items-center gap-2" style={{ opacity: 0.7 }}>
                      <Loader2 size={16} strokeWidth={2.75} className="animate-spin" /> Reading spines…
                    </div>
                  )}
                  {shelfScanError && (
                    <div className="text-sm" style={{ color: 'var(--color-accent-800)' }}>
                      {shelfScanError}
                    </div>
                  )}
                  {shelfFound && (
                    <>
                      <div className="card-kicker mb-2">
                        {shelfFound.length} spines read · {shelfFound.filter((b) => b.include).length} selected
                      </div>
                      <div className="flex flex-col gap-1.5 mb-3" style={{ maxHeight: 280, overflowY: 'auto' }}>
                        {shelfFound.map((b, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={b.include} onChange={(e) => updateShelfFound(i, { include: e.target.checked })} />
                            <input
                              className="input flex-1"
                              style={{ minHeight: 28, padding: '3px 8px', fontSize: 13 }}
                              value={b.title || ''}
                              onChange={(e) => updateShelfFound(i, { title: e.target.value })}
                            />
                            <input
                              className="input flex-1"
                              style={{ minHeight: 28, padding: '3px 8px', fontSize: 13 }}
                              value={b.author || ''}
                              onChange={(e) => updateShelfFound(i, { author: e.target.value })}
                            />
                            <span className="tag tag-neutral shrink-0" style={{ fontSize: 10 }} title={`${b.confidence} confidence`}>
                              {b.confidence}
                            </span>
                          </div>
                        ))}
                      </div>
                      {shelfChecking ? (
                        <div className="flex items-center gap-2 text-sm" style={{ opacity: 0.7 }}>
                          <Loader2 size={15} strokeWidth={2.75} className="animate-spin" />
                          Checking {shelfProgress.done} of {shelfProgress.total}…
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleRunShelfChecks}
                            disabled={shelfFound.filter((b) => b.include).length === 0}
                          >
                            Check {shelfFound.filter((b) => b.include).length} book
                            {shelfFound.filter((b) => b.include).length === 1 ? '' : 's'}
                          </button>
                          <button type="button" className="btn btn-secondary" onClick={() => shelfFileRef.current?.click()}>
                            Try another photo
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
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
        <div className="overflow-x-auto">
        <table className="table w-full" style={{ minWidth: 620 }}>
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
        </div>
      )}

            <div className="card mb-5 doctrine-advisory-full" style={{ padding: '16px 20px', borderLeft: '3px solid var(--color-accent)' }}>
        <div className="card-title mb-1">A Note on Theological Assessments</div>
        <div className="card-body mb-1">
          The theological assessments in Berean Study Desk are generated with the assistance of artificial
          intelligence. They are intended to support careful study, comparison, and reflection — not to serve as an
          infallible judgment on a book, teacher, doctrine, or theological position.
        </div>
        <div className="card-body mb-1">
          AI can misunderstand context, overlook nuance, or reach conclusions that deserve further examination. For
          that reason, every assessment should be weighed carefully against Scripture. As the Bereans did, "they
          received the word with all eagerness, examining the Scriptures daily to see if these things were so" (Acts
          17:11).
        </div>
        <div className="card-body">
          <b>Scripture is the final authority.</b> Confessions, commentaries, teachers, and the tools in BSD can help
          us understand the faith, but they remain subordinate to the Word of God. Study prayerfully, seek wise
          counsel when appropriate, and depend on the Holy Spirit to lead into truth.
        </div>
      </div>


      </div><div><DoctrineLegend/><CreationAssessment introduction/></div></div>
      {showScanner && <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} />}
    </div>
  )
}
