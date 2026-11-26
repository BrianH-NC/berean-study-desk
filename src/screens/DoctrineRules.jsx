import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { useAuth } from '../App'
import { supabase } from '../lib/supabase'
import { VERDICTS, ruleFor, ruleMatches, verdictBarColor } from '../lib/verdictRules'
import { loadChecksByIsbn, loadVerdictRules } from '../lib/verdictData'
import './LabelPrint.css'

// Author rules: the owner's own verdict for authors they trust. Private to
// this Library; they color labels and badges and win over AI checks.
export default function DoctrineRules() {
  const user = useAuth()
  const [rules, setRules] = useState(null)
  const [books, setBooks] = useState([])
  const [checks, setChecks] = useState({})
  const [form, setForm] = useState({ author: '', verdict: 'Baptism/Polity Distinctive', note: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState('')

  const load = useCallback(async () => {
    try {
      const [r, b, c] = await Promise.all([
        loadVerdictRules(user.id),
        supabase.from('books').select('id,title,author,isbn,shelf_author').eq('user_id', user.id).order('title').then(({ data, error: e }) => { if (e) throw e; return data || [] }),
        loadChecksByIsbn().catch(() => ({})),
      ])
      setRules(r); setBooks(b); setChecks(c); setError('')
    } catch { setError('Your rules could not be loaded. Reload to try again.') }
  }, [user.id])
  useEffect(() => { void load() }, [load])

  const preview = useMemo(() => form.author.trim() ? books.filter(b => ruleMatches({ author: form.author }, b)) : [], [form.author, books])

  async function add(e) {
    e.preventDefault()
    const author = form.author.replace(/\s+/g, ' ').trim()
    if (!author) { setError('Enter an author surname or full name.'); return }
    setBusy(true); setError('')
    const { error: err } = await supabase.from('author_verdict_rules').insert({ user_id: user.id, author, verdict: form.verdict, note: form.note.trim() || null })
    setBusy(false)
    if (err) { setError(err.code === '23505' ? `You already have a rule for ${author}. Change or remove that one.` : err.message); return }
    setForm(f => ({ ...f, author: '', note: '' }))
    await load()
  }
  async function change(rule, verdict) {
    const { error: err } = await supabase.from('author_verdict_rules').update({ verdict, updated_at: new Date().toISOString() }).eq('user_id', user.id).eq('id', rule.id)
    if (err) setError(err.message); else setRules(rs => rs.map(r => (r.id === rule.id ? { ...r, verdict } : r)))
  }
  async function remove(rule) {
    if (!window.confirm(`Remove the rule for ${rule.author}? Those books go back to their Doctrine Check result, or no verdict.`)) return
    const { error: err } = await supabase.from('author_verdict_rules').delete().eq('user_id', user.id).eq('id', rule.id)
    if (err) setError(err.message); else setRules(rs => rs.filter(r => r.id !== rule.id))
  }

  const covered = rule => books.filter(b => ruleFor(b, rules) === rule)
  const Swatch = ({ verdict }) => <span className="verdict-swatch" style={{ background: verdictBarColor(verdict) }} aria-hidden="true" />

  return <div className="page label-print-page">
    <div className="label-print-controls">
      <Link className="label-back" to="/shelf"><ArrowLeft size={16} aria-hidden="true" />Library</Link>
      <h1>Author rules</h1>
      <p className="mb-0">Give authors you trust a standing Doctrine Check verdict. A rule sets the verdict on their books in your Library and the color bar on their spine labels, and it wins over an AI check. Rules are private to you and are never saved as Doctrine Checks.</p>
      {error && <p role="alert">{error}</p>}

      <form className="card label-section" onSubmit={add}>
        <h2>Add a rule</h2>
        <div className="shelf-fields">
          <label htmlFor="rule-author">Author<input id="rule-author" className="input" value={form.author} maxLength={120} placeholder="Beeke, or Michael P.V. Barrett" onChange={e => setForm({ ...form, author: e.target.value })} /></label>
          <label htmlFor="rule-verdict">Verdict<select id="rule-verdict" className="input" value={form.verdict} onChange={e => setForm({ ...form, verdict: e.target.value })}>{VERDICTS.map(v => <option key={v} value={v}>{v}</option>)}</select></label>
          <label htmlFor="rule-note">Note<input id="rule-note" className="input" value={form.note} maxLength={500} placeholder="Optional" onChange={e => setForm({ ...form, note: e.target.value })} /></label>
        </div>
        <p className="card-meta mb-0">A surname matches the book’s filing name or its first credited author. A full name matches that person anywhere in the credits, so you can tell two authors with one surname apart.</p>
        {form.author.trim() && <p className="mb-0"><Swatch verdict={form.verdict} />{preview.length ? `Covers ${preview.length} book${preview.length === 1 ? '' : 's'}: ${preview.slice(0, 6).map(b => b.title).join('; ')}${preview.length > 6 ? '…' : ''}` : 'No books in your Library match yet.'}</p>}
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Add rule'}</button>
      </form>

      <section className="card label-section">
        <h2>Your rules</h2>
        {rules === null ? <p role="status">Loading…</p> : !rules.length ? <p className="mb-0">No rules yet.</p> : <ul className="label-rows">{rules.map(rule => { const list = covered(rule); const differ = list.filter(b => checks[b.isbn]?.verdict && checks[b.isbn].verdict !== rule.verdict); return <li key={rule.id}>
          <div className="label-row-main"><Swatch verdict={rule.verdict} /><strong>{rule.author}</strong>
            <select className="input rule-verdict" aria-label={`Verdict for ${rule.author}`} value={rule.verdict} onChange={e => void change(rule, e.target.value)}>{VERDICTS.map(v => <option key={v} value={v}>{v}</option>)}</select>
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(open === rule.id ? '' : rule.id)}>{list.length} book{list.length === 1 ? '' : 's'}</button>
            <button type="button" className="btn btn-ghost" aria-label={`Remove rule for ${rule.author}`} onClick={() => void remove(rule)}><Trash2 size={16} aria-hidden="true" /></button></div>
          {rule.note && <p className="label-row-note">{rule.note}</p>}
          {differ.length > 0 && <p className="label-row-note">{differ.length} of these {differ.length === 1 ? 'has' : 'have'} an AI check with a different verdict. Your rule is used; the AI result stays on the book page.</p>}
          {open === rule.id && <ul className="rule-books">{list.map(b => <li key={b.id}><Link to={`/shelf/${b.id}`}>{b.title}</Link> · {b.author}{checks[b.isbn]?.verdict ? ` · AI: ${checks[b.isbn].verdict}` : ''}</li>)}</ul>}
        </li> })}</ul>}
      </section>
    </div>
  </div>
}
