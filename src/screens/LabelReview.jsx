import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, FileUp, Sparkles } from 'lucide-react'
import { useAuth } from '../App'
import { supabase } from '../lib/supabase'
import { SEED_STATUSES, SHELF_TAXONOMY, hasShelfLabel, parseShelfSeed, planShelfSeed, shelfLabelLines, shelfLabelText, shelfLabelValues, suggestFilingName } from '../lib/shelfLabels'
import { ShelfLabelFields } from '../components/ShelfLabelCard'
import './LabelPrint.css'

const labelText = l => shelfLabelLines({ shelf_category: l.category, shelf_subcategory: l.subcategory, shelf_author: l.author })?.join(' / ') || '—'

// Writes one label with a guard so a record changed since review is skipped.
// expected === null means "only if the book has no label".
async function writeLabel(userId, bookId, label, expected) {
  const values = shelfLabelValues(label)
  let q = supabase.from('books').update(values).eq('user_id', userId).eq('id', bookId)
  q = expected ? q.eq('shelf_category', expected.shelf_category).eq('shelf_subcategory', expected.shelf_subcategory).eq('shelf_author', expected.shelf_author) : q.is('shelf_category', null)
  const { data, error } = await q.select('id')
  if (error) throw error
  return data?.length ? 'changed' : 'skipped'
}

async function runAll(jobs, size = 8) {
  const out = []
  for (let i = 0; i < jobs.length; i += size) out.push(...await Promise.all(jobs.slice(i, i + size).map(j => j().catch(e => ({ status: 'failed', error: e.message })))))
  return out
}

export default function LabelReview() {
  const user = useAuth()
  const [books, setBooks] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [seed, setSeed] = useState(null)
  const [fileName, setFileName] = useState('')
  const [picked, setPicked] = useState({})
  const [busy, setBusy] = useState('')
  const [report, setReport] = useState(null)
  const [drafts, setDrafts] = useState({})
  const [suggestError, setSuggestError] = useState('')

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('books').select('id,title,author,isbn,subjects,shelf_category,shelf_subcategory,shelf_author').eq('user_id', user.id).order('title')
    if (error) setLoadError('Your books could not be loaded. Reload to try again.'); else { setLoadError(''); setBooks(data || []) }
  }, [user.id])
  useEffect(() => { void load() }, [load])

  const plan = useMemo(() => (seed && books ? planShelfSeed(seed.rows, books) : []), [seed, books])
  const groups = useMemo(() => Object.fromEntries(SEED_STATUSES.map(([s]) => [s, plan.map((p, i) => ({ ...p, i })).filter(p => p.status === s)])), [plan])

  async function readFile(file) {
    if (!file) return
    setReport(null); setFileName(file.name)
    const parsed = parseShelfSeed(await file.text())
    setSeed(parsed)
    if (!parsed.error && books) {
      const p = planShelfSeed(parsed.rows, books), next = {}
      p.forEach((x, i) => { if (x.status === 'ready') next[`${i}:${x.books[0].id}`] = true })
      setPicked(next)
    }
  }
  const pick = (key, on) => setPicked(cur => ({ ...cur, [key]: on }))
  const pickedCount = Object.values(picked).filter(Boolean).length

  async function applySeed() {
    setBusy('seed'); setReport(null)
    const jobs = []
    plan.forEach((p, i) => p.books.forEach(b => {
      if (!picked[`${i}:${b.id}`]) return
      const expected = p.status === 'differs' ? { shelf_category: b.shelf_category, shelf_subcategory: b.shelf_subcategory, shelf_author: b.shelf_author } : null
      jobs.push(async () => ({ status: await writeLabel(user.id, b.id, p.row.label, expected), book: b, label: p.row.label }))
    }))
    const results = await runAll(jobs)
    setReport({ kind: 'seed', results })
    setPicked({}); await load(); setBusy('')
  }

  const unlabeled = useMemo(() => (books || []).filter(b => !hasShelfLabel(b)), [books])

  async function suggest() {
    setBusy('suggest'); setSuggestError('')
    try {
      const ids = unlabeled.map(b => b.id)
      const taxonomy = SHELF_TAXONOMY.map(c => ({ key: c.key, code: c.code, name: c.name, subs: c.subs.map(s => ({ key: s.key, code: s.code, name: s.name })) }))
      const found = {}
      for (let i = 0; i < ids.length; i += 25) {
        const { data, error } = await supabase.functions.invoke('shelf-suggest', { body: { bookIds: ids.slice(i, i + 25), taxonomy } })
        if (error || data?.error) throw new Error(data?.error || (await error?.context?.json?.().catch(() => null))?.error || 'Suggestions could not be loaded. Try again.')
        for (const s of data.suggestions || []) found[s.id] = { category: s.category, subcategory: s.subcategory, author: s.author, note: s.note, accept: true }
      }
      setDrafts(cur => ({ ...cur, ...found }))
      if (!Object.keys(found).length) setSuggestError('No suggestions came back. Label these from the list below.')
    } catch (e) { setSuggestError(e.message) } finally { setBusy('') }
  }
  const draftFor = b => drafts[b.id] || { category: '', subcategory: '', author: suggestFilingName(b.author), note: '', accept: false }
  const setDraft = (id, v) => setDrafts(cur => ({ ...cur, [id]: { ...draftFor(unlabeled.find(b => b.id === id)), ...cur[id], ...v } }))
  const acceptable = unlabeled.filter(b => { const d = draftFor(b); if (!d.accept) return false; try { return Boolean(shelfLabelValues(d).shelf_category) } catch { return false } })

  async function applyDrafts() {
    setBusy('drafts'); setReport(null)
    const results = await runAll(acceptable.map(b => async () => ({ status: await writeLabel(user.id, b.id, draftFor(b), null), book: b, label: draftFor(b) })))
    setReport({ kind: 'drafts', results })
    setDrafts(cur => Object.fromEntries(Object.entries(cur).filter(([id]) => !results.some(r => r.book?.id === id && r.status === 'changed'))))
    await load(); setBusy('')
  }

  const count = s => report?.results.filter(r => r.status === s).length || 0

  return <div className="page label-print-page">
    <div className="label-print-controls">
      <Link className="label-back" to="/shelf"><ArrowLeft size={16} aria-hidden="true" />Library</Link>
      <h1>Shelf label review</h1>
      <p className="mb-0">Assign shelf labels in bulk. Nothing is written until you apply, and only books without a label are changed unless you tick Replace on a row. Book details are never changed.</p>
      {loadError && <p role="alert">{loadError}</p>}
      {books && <p className="label-scope">{books.length - unlabeled.length} of {books.length} books labeled · {unlabeled.length} without a label</p>}

      {report && <div className="label-report" role="status"><strong>{count('changed')} labeled.</strong>{count('skipped') ? ` ${count('skipped')} skipped because the book changed since review.` : ''}{count('failed') ? ` ${count('failed')} failed.` : ''}
        {report.results.some(r => r.status !== 'changed') && <ul>{report.results.filter(r => r.status !== 'changed').map((r, i) => <li key={i}>{r.book?.title || 'A book'}: {r.status === 'skipped' ? 'skipped, its label changed after you reviewed it' : r.error}</li>)}</ul>}</div>}

      <section className="card label-section">
        <h2><FileUp size={18} aria-hidden="true" />Load a classification file</h2>
        <p className="card-meta">A tab-separated file with the columns isbn, category, subcategory, filing_author, title and catalog_author. Books are matched by ISBN only; ISBN-10 and ISBN-13 count as the same.</p>
        <input type="file" accept=".tsv,.txt,text/tab-separated-values,text/plain" onChange={e => void readFile(e.target.files?.[0])} disabled={!books} />
        {seed?.error && <p role="alert">{seed.error}</p>}
        {seed && !seed.error && books && <>
          <p className="label-scope">{fileName}: {seed.rows.length} rows</p>
          {SEED_STATUSES.map(([status, title]) => groups[status]?.length ? <details key={status} className="label-group" open={['ready', 'differs', 'ambiguous'].includes(status)}>
            <summary>{title} · {groups[status].length}</summary>
            <ul className="label-rows">{groups[status].map(p => <li key={p.i}>
              <div className="label-row-main"><span className="library-shelf-chip">{p.row.label ? labelText(p.row.label) : `${p.row.categoryCode} / ${p.row.subCode} / ${p.row.author}`}</span><span>{p.row.title || '(no title)'}</span><span className="card-meta">ISBN {p.row.isbn} · line {p.row.line}</span></div>
              {status === 'invalid' && <p className="label-row-note">{p.row.problem}</p>}
              {status === 'nomatch' && <p className="label-row-note">No book in your Library has this ISBN. Add it from Library first if you own it.</p>}
              {p.books.map(b => <label key={b.id} className="label-row-pick">
                {['ready', 'differs', 'ambiguous'].includes(status) && <input type="checkbox" checked={Boolean(picked[`${p.i}:${b.id}`])} onChange={e => pick(`${p.i}:${b.id}`, e.target.checked)} />}
                <span><Link to={`/shelf/${b.id}`}>{b.title}</Link>{b.author ? ` · ${b.author}` : ''}{hasShelfLabel(b) ? <> · now <span className="library-shelf-chip">{shelfLabelText(b)}</span></> : ''}{status === 'differs' ? ' · tick to replace' : status === 'ambiguous' ? ' · tick each copy to label' : ''}</span>
              </label>)}
            </li>)}</ul>
          </details> : null)}
          <button type="button" className="btn btn-primary" disabled={!pickedCount || Boolean(busy)} onClick={applySeed}>{busy === 'seed' ? 'Applying…' : `Apply ${pickedCount} label${pickedCount === 1 ? '' : 's'}`}</button>
        </>}
      </section>

      <section className="card label-section">
        <h2><Sparkles size={18} aria-hidden="true" />Books without a label</h2>
        {!books ? <p role="status">Loading…</p> : !unlabeled.length ? <p className="mb-0">Every book has a shelf label.</p> : <>
          <p className="card-meta">Get suggested placements from each book’s title, author and subjects, guided by how your other books are filed. Review and adjust each one, then apply the ones you tick.</p>
          <div className="flex gap-2 flex-wrap items-center"><button type="button" className="btn btn-secondary" disabled={Boolean(busy)} onClick={suggest}>{busy === 'suggest' ? 'Suggesting…' : `Suggest labels for ${unlabeled.length} book${unlabeled.length === 1 ? '' : 's'}`}</button>{suggestError && <span role="alert">{suggestError}</span>}</div>
          <ul className="label-drafts">{unlabeled.map(b => { const d = draftFor(b); let ok = false; try { ok = Boolean(shelfLabelValues(d).shelf_category) } catch { ok = false } return <li key={b.id}>
            <div className="label-row-main"><label className="label-row-pick"><input type="checkbox" disabled={!ok} checked={ok && d.accept} onChange={e => setDraft(b.id, { accept: e.target.checked })} /><span><Link to={`/shelf/${b.id}`}>{b.title || 'Untitled'}</Link>{b.author ? ` · ${b.author}` : ''}{b.isbn ? '' : ' · no ISBN'}</span></label>{ok && <span className="library-shelf-chip">{labelText(d)}</span>}</div>
            {d.note && <p className="label-row-note">{d.note}</p>}
            <ShelfLabelFields value={d} idPrefix={`draft-${b.id}`} onChange={v => setDraft(b.id, { ...v, accept: true })} />
          </li> })}</ul>
          <button type="button" className="btn btn-primary" disabled={!acceptable.length || Boolean(busy)} onClick={applyDrafts}>{busy === 'drafts' ? 'Applying…' : `Apply ${acceptable.length} label${acceptable.length === 1 ? '' : 's'}`}</button>
        </>}
      </section>
    </div>
  </div>
}
