import { useEffect, useState } from 'react'
import { fetchEsvPassage } from '../lib/esv'
import { fieldLabel } from '../lib/dgroup'
import './DGroupGuide.css'

const list = v => (Array.isArray(v) ? v.filter(x => x !== null && x !== undefined) : [])
const str = v => (typeof v === 'string' ? v : v == null ? '' : String(v))

export function EsvText({ reference }) {
  const [state, setState] = useState({ status: 'loading' })
  useEffect(() => { let active = true; setState({ status: 'loading' }); fetchEsvPassage(reference).then(r => { if (active) setState({ status: 'ok', text: r.text }) }).catch(() => { if (active) setState({ status: 'error' }) }); return () => { active = false } }, [reference])
  if (state.status === 'loading') return <p className="pk-muted">Loading {reference}…</p>
  if (state.status === 'error') return <p className="pk-muted">The ESV text for {reference} could not load. Reload to try again.</p>
  const parts = state.text.replace(/\s*\(ESV\)\s*$/, '').split(/\[(\d+)\]/)
  return <p className="pk-esv">{parts.map((part, i) => i % 2 ? <sup key={i}>{part}</sup> : <span key={i}>{part}</span>)}</p>
}

const Lines = ({ n = 2 }) => <div className="pk-lines" style={{ height: `${Math.max(1, n) * 0.3}in` }} aria-hidden="true" />
const Prompt = ({ text }) => text ? <p className="pk-prompt">{text}</p> : null

function Dial({ label, low, high }) {
  const ticks = [0, 1, 2, 3, 4].map(i => { const a = Math.PI - (i * Math.PI) / 4; return { x: 60 + 46 * Math.cos(a), y: 62 - 46 * Math.sin(a), lx: 60 + 56 * Math.cos(a), ly: 62 - 56 * Math.sin(a), n: i + 1 } })
  return <figure className="pk-dial"><svg viewBox="0 0 120 74" role="img" aria-label={`${label}: mark a number from 1, ${low}, to 5, ${high}`}>
    <path d="M14 62 A46 46 0 0 1 106 62" fill="none" stroke="var(--pk-tan)" strokeWidth="8" strokeLinecap="round" />
    {ticks.map(t => <g key={t.n}><circle cx={t.x} cy={t.y} r="2.2" fill="var(--pk-charcoal)" /><text x={t.lx} y={t.ly + 3} fontSize="8" textAnchor="middle" fill="var(--pk-charcoal)">{t.n}</text></g>)}
    <circle cx="60" cy="62" r="3.5" fill="var(--pk-sage-ink)" />
  </svg><figcaption><strong>{label}</strong><span>{low}</span><span>{high}</span></figcaption></figure>
}

function Booth({ label }) {
  return <figure className="pk-booth"><svg viewBox="0 0 100 70" aria-hidden="true"><path d="M8 28 L50 6 L92 28 Z" fill="var(--pk-sage)" opacity=".85" /><path d="M8 28 q10.5 8 21 0 q10.5 8 21 0 q10.5 8 21 0 q10.5 8 21 0" fill="#fff" stroke="var(--pk-sage-ink)" strokeWidth="1.2" /><rect x="14" y="34" width="72" height="32" fill="none" stroke="var(--pk-charcoal)" strokeWidth="1.2" /></svg><figcaption>{label}</figcaption></figure>
}

// One interactive exercise, drawn for paper: the men write, rate, circle and match on it.
export function Exercise({ ex }) {
  if (!ex || typeof ex !== 'object') return null
  const t = ex.type
  let body
  if (t === 'rating') body = <table className="pk-table pk-rating"><thead><tr><th /><th colSpan={5}><span>{str(ex.low) || '1'}</span><span>{str(ex.high) || '5'}</span></th></tr></thead><tbody>{list(ex.items).map((it, i) => <tr key={i}><td>{str(it)}</td>{[1, 2, 3, 4, 5].map(n => <td key={n} className="pk-circle-cell"><span className="pk-circle">{n}</span></td>)}</tr>)}</tbody></table>
  else if (t === 'dial') body = <div className="pk-dials">{list(ex.dials).map((d, i) => <Dial key={i} label={str(d.label)} low={str(d.low)} high={str(d.high)} />)}</div>
  else if (t === 'spectrum') body = <div className="pk-spectrum"><span>{str(ex.left)}</span><div className="pk-spectrum-line" aria-hidden="true" /><span>{str(ex.right)}</span></div>
  else if (t === 'table') { const cols = list(ex.columns); body = <table className="pk-table pk-fill"><thead><tr>{cols.map((c, i) => <th key={i}>{str(c)}</th>)}</tr></thead><tbody>{list(ex.rows).map((r, i) => <tr key={i}>{cols.map((_, j) => <td key={j}>{str(list(r)[j])}</td>)}</tr>)}</tbody></table> }
  else if (t === 'checklist') body = <ul className="pk-checklist">{list(ex.items).map((it, i) => <li key={i}><span className="pk-box" aria-hidden="true" />{str(it)}</li>)}</ul>
  else if (t === 'match') { const l = list(ex.left), r = list(ex.right); body = <div className="pk-match">{Array.from({ length: Math.max(l.length, r.length) }, (_, i) => <div key={i} className="pk-match-row"><span>{str(l[i])}</span><i aria-hidden="true" /><i aria-hidden="true" /><span>{str(r[i])}</span></div>)}</div> }
  else if (t === 'nametags') body = <div className="pk-tags">{list(ex.tags).map((tag, i) => <div key={i} className="pk-tag"><div className="pk-tag-top"><strong>HELLO</strong><span>my name is</span></div><div className="pk-tag-blank" /><small>{str(tag?.hint ?? tag)}</small></div>)}</div>
  else if (t === 'booths') body = <div className="pk-booths">{list(ex.labels).map((l, i) => <Booth key={i} label={str(l)} />)}</div>
  else if (t === 'road') body = <svg className="pk-road" viewBox="0 0 600 120" role="img" aria-label={`Mark where you drift: ${str(ex.left)}, ${str(ex.center)}, ${str(ex.right)}`}>
    <rect x="0" y="30" width="150" height="70" fill="var(--pk-tan)" opacity=".35" /><rect x="450" y="30" width="150" height="70" fill="var(--pk-tan)" opacity=".35" />
    <rect x="150" y="30" width="300" height="70" fill="#e9e6df" /><line x1="160" y1="65" x2="440" y2="65" stroke="var(--pk-charcoal)" strokeWidth="2" strokeDasharray="14 10" />
    <text x="75" y="20" fontSize="14" textAnchor="middle" fill="var(--pk-charcoal)" fontWeight="600">{str(ex.left)}</text><text x="300" y="20" fontSize="14" textAnchor="middle" fill="var(--pk-sage-ink)" fontWeight="600">{str(ex.center) || 'The road'}</text><text x="525" y="20" fontSize="14" textAnchor="middle" fill="var(--pk-charcoal)" fontWeight="600">{str(ex.right)}</text>
    <text x="75" y="115" fontSize="10" textAnchor="middle" fill="var(--pk-charcoal)">ditch</text><text x="525" y="115" fontSize="10" textAnchor="middle" fill="var(--pk-charcoal)">ditch</text>
  </svg>
  else if (t === 'putoff') body = <table className="pk-table pk-fill pk-putoff"><thead><tr><th>{str(ex.off) || 'Put off'}</th><th>{str(ex.on) || 'Put on'}</th></tr></thead><tbody>{Array.from({ length: Math.min(6, Number(ex.rows) || 3) }, (_, i) => <tr key={i}><td /><td /></tr>)}</tbody></table>
  else if (t === 'chain') body = <div className="pk-chain">{list(ex.links).map((l, i) => <div key={i} className={`pk-link ${str(l).trim() ? '' : 'is-blank'}`}>{str(l)}</div>)}</div>
  else if (t === 'circles') { const rings = list(ex.rings).slice(0, 4); body = <svg className="pk-circles" viewBox="0 0 320 200" role="img" aria-label={`Concentric circles: ${rings.map(str).join(', ')}`}>{rings.map((_, i) => rings.length - 1 - i).map(i => <circle key={i} cx="160" cy="100" r={28 + i * 24} fill={i === 0 ? 'var(--pk-sage)' : 'none'} fillOpacity=".25" stroke="var(--pk-sage-ink)" strokeWidth="1.4" />)}{rings.map((r, i) => <text key={i} x="160" y={i === 0 ? 104 : 100 - (28 + i * 24) + 13} fontSize="10" textAnchor="middle" fill="var(--pk-charcoal)" fontWeight={i === 0 ? 600 : 400}>{str(r)}</text>)}</svg> }
  else body = <Lines n={Number(ex.lines) || 3} />
  return <div className={`pk-ex pk-ex-${t || 'write'}`}><Prompt text={str(ex.prompt)} />{body}</div>
}

const Questions = ({ items, lines = 2 }) => <ol className="pk-questions">{list(items).map((q, i) => <li key={i}><span>{str(q)}</span><Lines n={lines} /></li>)}</ol>

// One section of the discussion guide.
export function DiscussionSection({ s }) {
  if (!s) return null
  const head = <h2>{str(s.title)}</h2>
  switch (s.kind) {
    case 'warmup': return <section className="pk-section">{head}<Questions items={s.questions} lines={1} /></section>
    case 'text': return <section className="pk-section">{head}<div className="pk-text-pair"><div className="pk-text-box">{s.ref ? <><h3>{str(s.ref).replace(/-/g, '–')}</h3><EsvText reference={s.ref} /></> : null}</div><div><p className="pk-label">As you read</p><ul className="pk-marks">{list(s.instructions).map((m, i) => <li key={i}>{str(m)}</li>)}</ul></div></div></section>
    case 'observe': return <section className="pk-section">{head}<Questions items={s.questions} /></section>
    case 'wordstudy': return <section className="pk-section">{head}<div className="pk-words">{list(s.words).map((w, i) => <div key={i} className="pk-word"><p><span className="pk-greek">{str(w.greek)}</span> <em>{str(w.translit)}</em> · {str(w.gloss)}</p><p>{str(w.note)}</p></div>)}</div></section>
    case 'interpret': return <section className="pk-section">{head}{list(s.movements).map((m, i) => <div key={i} className="pk-movement"><h3>{str(m.heading)}</h3>{str(m.quote).trim() && <blockquote className="pk-quote">“{str(m.quote).replace(/^["“]|["”]$/g, '')}”</blockquote>}<Questions items={m.questions} /><Exercise ex={m.exercise} /></div>)}</section>
    case 'personal': return <section className="pk-section">{head}{list(s.exercises).map((ex, i) => <Exercise key={i} ex={ex} />)}</section>
    case 'prayer': return <section className="pk-section">{head}<ul className="pk-prayer">{list(s.prompts).map((p, i) => <li key={i}>{str(p)}</li>)}</ul></section>
    case 'thisweek': return <section className="pk-section pk-thisweek">{head}<ul className="pk-checklist">{list(s.actions).map((a, i) => <li key={i}><span className="pk-box" aria-hidden="true" />{str(a)}</li>)}</ul>{str(s.next).trim() && <p className="pk-next">{str(s.next)}</p>}</section>
    default: return <section className="pk-section">{head}{s.questions && <Questions items={s.questions} />}{s.exercises && list(s.exercises).map((ex, i) => <Exercise key={i} ex={ex} />)}</section>
  }
}

// The discussion guide's opening: title, big idea, call to worship.
export function DiscussionOpening({ data }) {
  return <section className="pk-section pk-opening">
    {str(data.big_idea).trim() && <p className="pk-bigidea">{str(data.big_idea)}</p>}
    {data.call_to_worship?.ref && <div className="pk-worship"><p className="pk-label">Call to worship · {str(data.call_to_worship.ref)}</p><EsvText reference={data.call_to_worship.ref} />{str(data.call_to_worship.why).trim() && <p className="pk-muted">{str(data.call_to_worship.why)}</p>}</div>}
  </section>
}

export function DiscussionClosing({ data }) {
  if (!data.benediction?.ref) return null
  return <section className="pk-section pk-worship"><p className="pk-label">Benediction · {str(data.benediction.ref)}</p><EsvText reference={data.benediction.ref} /></section>
}

// One part of the leader guide.
export function LeaderPart({ k, value, title }) {
  const v = value
  const head = <h2>{title}</h2>
  if (k === 'overview') return <section className="pk-section">{head}<p>{str(v)}</p></section>
  if (k === 'timing') return <section className="pk-section">{head}<table className="pk-table pk-timing"><thead><tr><th>Minutes</th><th>Segment</th><th>Notes</th></tr></thead><tbody>{list(v).map((r, i) => <tr key={i}><td>{str(r.minutes)}</td><td>{str(r.segment)}</td><td>{str(r.notes)}</td></tr>)}</tbody></table></section>
  if (k === 'running_short' || k === 'before_friday') return <section className="pk-section">{head}<ol className="pk-steps">{list(v).map((x, i) => <li key={i}>{str(x)}</li>)}</ol></section>
  if (k === 'background') return <section className="pk-section">{head}{list(v).map((b, i) => <div key={i} className="pk-bg"><h3>{str(b.heading)}</h3><p>{str(b.body)}</p></div>)}</section>
  if (k === 'answers') return <section className="pk-section">{head}<dl className="pk-answers">{list(v).map((a, i) => <div key={i}><dt>{str(a.question)}</dt><dd>{str(a.answer)}</dd></div>)}</dl></section>
  if (k === 'facilitation') return <section className="pk-section">{head}{list(v).map((f, i) => <div key={i} className="pk-bg"><h3>{str(f.section)}</h3><p>{str(f.notes)}</p></div>)}</section>
  if (k === 'guardrails') return <section className="pk-section">{head}{list(v).map((g, i) => <div key={i} className="pk-guardrail"><strong>{str(g.issue)}</strong><p>{str(g.guidance)}</p></div>)}</section>
  if (k === 'sermon_flags') return list(v).length ? <section className="pk-section">{head}{list(v).map((f, i) => <div key={i} className="pk-guardrail is-flag"><strong>{str(f.claim)}</strong><p>{str(f.note)}</p></div>)}</section> : null
  if (k === 'cards') return <section className="pk-section pk-cards-page">{head}<p className="pk-muted">Cut along the dashed lines. Hand one card to each pair.</p><div className="pk-cards">{list(v).map((c, i) => <div key={i} className="pk-card"><p className="pk-label">Scenario {i + 1}</p><h3>{str(c.title)}</h3><p>{str(c.scenario)}</p><p className="pk-card-q">{str(c.question)}</p></div>)}</div><div className="pk-card-notes">{list(v).map((c, i) => <p key={i}><strong>Card {i + 1}, {str(c.title)}.</strong> {str(c.notes)}</p>)}</div></section>
  return <section className="pk-section">{head}<pre>{JSON.stringify(v, null, 2)}</pre></section>
}

// A plain form over any JSON value: text fields for strings, a row per list item. Type and kind stay fixed.
export function FieldEditor({ value, onChange, label, depth = 0 }) {
  if (typeof value === 'string') {
    const long = value.length > 70 || depth === 0
    return <label className="dge-field">{label && <span>{label}</span>}{long ? <textarea className="input" rows={Math.min(8, Math.max(2, Math.ceil(value.length / 80)))} value={value} onChange={e => onChange(e.target.value)} /> : <input className="input" value={value} onChange={e => onChange(e.target.value)} />}</label>
  }
  if (typeof value === 'number') return <label className="dge-field">{label && <span>{label}</span>}<input className="input" type="number" value={value} onChange={e => onChange(Number(e.target.value))} /></label>
  if (value === null || value === undefined || typeof value === 'boolean') return null
  if (Array.isArray(value)) {
    const blank = value.length && typeof value[0] === 'string' ? '' : null
    return <fieldset className="dge-group">{label && <legend>{label}</legend>}
      {value.map((item, i) => <div key={i} className="dge-item"><FieldEditor value={item} depth={depth + 1} onChange={next => onChange(value.map((x, j) => j === i ? next : x))} /><button type="button" className="btn btn-ghost dge-remove" aria-label={`Remove item ${i + 1}`} onClick={() => onChange(value.filter((_, j) => j !== i))}>Remove</button></div>)}
      {blank !== null && <button type="button" className="btn btn-ghost" onClick={() => onChange([...value, blank])}>Add a line</button>}
    </fieldset>
  }
  return <fieldset className="dge-group">{label && <legend>{label}</legend>}
    {(value.type || value.kind) && <p className="pk-muted">{value.type ? `Exercise: ${value.type}` : ''}</p>}
    {Object.entries(value).filter(([k]) => k !== 'type' && k !== 'kind').map(([k, v]) => <FieldEditor key={k} label={fieldLabel(k)} value={v} depth={depth + 1} onChange={next => onChange({ ...value, [k]: next })} />)}
  </fieldset>
}

export const ESV_NOTICE = 'Scripture quotations are from the ESV® Bible (The Holy Bible, English Standard Version®), © 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission. All rights reserved.'
