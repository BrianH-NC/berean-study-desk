import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { User, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { verdictClass, verdictIcon } from '../lib/verdict'
import { compareConfession, askFollowup, checksUpdate, CONFESSIONS } from '../lib/theologyCheck'

export default function DoctrineCheckReport() {
  const { id } = useParams()
  const [check, setCheck] = useState(null) // null = loading, false = not found
  const [confessionSlug, setConfessionSlug] = useState(CONFESSIONS[0].slug)
  const [comparing, setComparing] = useState(false)
  const [question, setQuestion] = useState('')
  const [asking, setAsking] = useState(false)

  async function load() {
    const { data } = await supabase.from('theology_checks').select('*').eq('id', id).single()
    setCheck(data || false)
  }

  useEffect(() => {
    load()
  }, [id])

  async function handleCompare() {
    const confession = CONFESSIONS.find((c) => c.slug === confessionSlug)
    setComparing(true)
    try {
      const subject =
        check.kind === 'book'
          ? { kind: 'book', title: check.title, authors: check.authors, isbn: check.isbn }
          : { kind: 'person', name: check.name }
      const result = await compareConfession(subject, confession.name, confession.wideScope)
      const nextComparisons = {
        ...(check.confession_comparisons || {}),
        [confessionSlug]: { ...result, name: confession.name },
      }
      const { error } = await checksUpdate(id, { confession_comparisons: nextComparisons })
      if (error) throw new Error(error)
      setCheck({ ...check, confession_comparisons: nextComparisons })
    } catch (err) {
      alert('Could not run comparison: ' + err.message)
    } finally {
      setComparing(false)
    }
  }

  async function handleAsk(e) {
    e.preventDefault()
    if (!question.trim()) return
    setAsking(true)
    try {
      const checkContext = {
        label: check.title || check.name,
        verdict: check.verdict,
        summary: check.summary,
        strengths: check.strengths,
        concerns: check.concerns,
        denominationalNote: check.denominational_note,
      }
      const { answer } = await askFollowup(checkContext, question.trim())
      const nextFollowups = [...(check.followups || []), { question: question.trim(), answer, ts: new Date().toISOString() }]
      const { error } = await checksUpdate(id, { followups: nextFollowups })
      if (error) throw new Error(error)
      setCheck({ ...check, followups: nextFollowups })
      setQuestion('')
    } catch (err) {
      alert('Could not get an answer: ' + err.message)
    } finally {
      setAsking(false)
    }
  }

  if (check === null) {
    return (
      <div className="max-w-[1080px] mx-auto text-center py-24 page" style={{ opacity: 0.5 }}>
        Loading…
      </div>
    )
  }
  if (check === false) {
    return (
      <div className="max-w-[1080px] mx-auto page">
        <p>Check not found.</p>
        <Link to="/checks" className="btn btn-secondary">
          ← Doctrine Check
        </Link>
      </div>
    )
  }

  const VerdictIcon = verdictIcon(check.verdict)
  const label = check.title || check.name

  return (
    <div className="max-w-[1080px] mx-auto page">
      <div className="card-meta mb-3">
        <Link to="/checks" className="hover:underline">
          Doctrine Check
        </Link>{' '}
        / {label}
      </div>

      {/* Subject header */}
      <div className="card mb-6" style={{ padding: '20px 24px' }}>
        <div className="flex gap-4 items-start">
          {check.kind === 'book' ? (
            <div className="rounded-sm shrink-0 overflow-hidden bg-neutral-200" style={{ width: 96, height: 144 }}>
              {check.cover_url && <img src={check.cover_url} alt="" className="w-full h-full object-cover" />}
            </div>
          ) : (
            <div className="rounded-full shrink-0 flex items-center justify-center bg-neutral-200" style={{ width: 96, height: 96 }}>
              <User size={36} strokeWidth={2.75} style={{ opacity: 0.5 }} />
            </div>
          )}
          <div className="flex-1">
            <h2 className="!mb-1" style={{ fontSize: 30 }}>
              {label}
            </h2>
            {check.kind === 'book' && check.authors && <div className="card-meta mb-2">{check.authors}</div>}
            <span className={`tag ${verdictClass(check.verdict)} flex items-center gap-1 w-fit`} style={{ fontSize: 13 }}>
              <VerdictIcon size={14} strokeWidth={2.75} />
              {check.verdict || 'Unable to Assess'}
            </span>
            {check.tags?.length > 0 && (
              <div className="flex gap-1.5 flex-wrap mt-2">
                {check.tags.map((t) => (
                  <span key={t} className="tag tag-neutral">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:gap-9 grid-cols-1 md:grid-cols-[1fr_296px]">
        {/* Left column */}
        <div className="flex flex-col gap-6">
          <div>
            <h4 className="mb-2">The verdict</h4>
            <p style={{ fontSize: 17, lineHeight: 1.6 }}>{check.summary}</p>
          </div>

          {check.strengths?.length > 0 && (
            <div>
              <div className="card-kicker mb-2">Points of alignment</div>
              <ul className="flex flex-col gap-1.5 pl-4" style={{ fontSize: 14.5, lineHeight: 1.65 }}>
                {check.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {check.concerns?.length > 0 && (
            <div>
              <div className="card-kicker mb-2" style={{ color: 'var(--color-accent-700)' }}>
                Points of concern
              </div>
              <ul className="flex flex-col gap-1.5 pl-4" style={{ fontSize: 14.5, lineHeight: 1.65 }}>
                {check.concerns.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}

          {check.alternative_suggestion && (
            <div className="card">
              <div className="card-kicker">A sounder alternative</div>
              <div style={{ fontSize: 14.5, lineHeight: 1.6 }}>{check.alternative_suggestion}</div>
            </div>
          )}

          {check.denominational_note && (
            <p className="card-meta">{check.denominational_note}</p>
          )}

          {/* Ask about this check */}
          <div>
            <h4 className="mb-2">Ask about this check</h4>
            {check.followups?.length > 0 && (
              <div className="flex flex-col gap-3 mb-3">
                {check.followups.map((f, i) => (
                  <div key={i} className="card" style={{ background: 'var(--color-accent-100)' }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{f.question}</div>
                    <div style={{ fontSize: 13.5, lineHeight: 1.6 }}>{f.answer}</div>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={handleAsk} className="flex gap-2">
              <input
                className="input"
                placeholder="Ask a follow-up question…"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={asking}
              />
              <button type="submit" className="btn btn-secondary shrink-0" disabled={asking || !question.trim()}>
                {asking ? <Loader2 size={14} strokeWidth={2.75} className="animate-spin" /> : 'Ask'}
              </button>
            </form>
          </div>
        </div>

        {/* Right rail */}
        <div className="flex flex-col gap-4">
          <div className="card">
            <div className="card-title">Measured against</div>
            <div className="card-body">Baptist Faith &amp; Message 2000</div>

            <div className="field mt-1">
              <label htmlFor="confession-select">Compare against another</label>
              <select id="confession-select" className="input" value={confessionSlug} onChange={(e) => setConfessionSlug(e.target.value)}>
                {CONFESSIONS.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" className="btn btn-secondary btn-block" onClick={handleCompare} disabled={comparing}>
              {comparing ? 'Comparing…' : 'Compare'}
            </button>
          </div>

          {Object.entries(check.confession_comparisons || {}).map(([slug, comp]) => {
            const CompIcon = verdictIcon(comp.verdict)
            return (
              <div key={slug} className="card">
                <div className="card-title !text-[14px]">{comp.name}</div>
                <span className={`tag ${verdictClass(comp.verdict)} flex items-center gap-1 w-fit`}>
                  <CompIcon size={12} strokeWidth={2.75} />
                  {comp.verdict}
                </span>
                <div className="card-body">{comp.summary}</div>
              </div>
            )
          })}

          <div className="card">
            <div className="card-title">Confidence</div>
            <div className="card-body">
              {check.confidence || 'Unknown'}
              {check.confidence_note && <div className="mt-1">{check.confidence_note}</div>}
            </div>
          </div>

          {check.creation_view && check.creation_view !== 'Not Addressed / Unclear' && (
            <div className="card">
              <div className="card-title">Creation view</div>
              <div className="card-body">{check.creation_view}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
