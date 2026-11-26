import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft, Printer, RotateCcw } from 'lucide-react'
import { useAuth } from '../App'
import { supabase } from '../lib/supabase'
import { SHELF_TAXONOMY, hasShelfLabel, shelfLabelLines, sortShelfOrder } from '../lib/shelfLabels'
import SpineLabel, { DEFAULT_LABEL_SETTINGS, LABEL_PRESETS, loadLabelSettings, saveLabelSettings } from '../components/SpineLabel'
import { VERDICTS, effectiveVerdict, verdictBarColor } from '../lib/verdictRules'
import { loadChecksByIsbn, loadVerdictRules } from '../lib/verdictData'
import './LabelPrint.css'

const PAGE = { w: 8.5, h: 11 }
const FIELDS = [
  ['width', 'Label width on the spine (in)', 0.25, 4, 0.01], ['height', 'Label height on the spine (in)', 0.25, 4, 0.01],
  ['columns', 'Labels across', 1, 20, 1], ['rows', 'Labels down', 1, 30, 1],
  ['top', 'Top margin (in)', 0, 3, 0.01], ['left', 'Left margin (in)', 0, 3, 0.01],
  ['gapX', 'Gap across (in)', 0, 2, 0.01], ['gapY', 'Gap down (in)', 0, 2, 0.01],
  ['padding', 'Inner padding (in)', 0, 0.3, 0.01], ['fontPt', 'Text size (pt)', 5, 16, 0.5],
  ['bar', 'Doctrine bar (in, 0 hides)', 0, 0.5, 0.025],
]

// The label's footprint on the sheet: turned sideways when rotate is set.
const cell = s => (s.rotate ? { w: s.height, h: s.width } : { w: s.width, h: s.height })

function layoutProblem(s) {
  const { w, h } = cell(s)
  if (s.left + s.columns * w + (s.columns - 1) * s.gapX > PAGE.w + 0.001) return 'The labels run past the right edge of a Letter page. Reduce the columns, width, gap or left margin.'
  if (s.top + s.rows * h + (s.rows - 1) * s.gapY > PAGE.h + 0.001) return 'The labels run past the bottom of a Letter page. Reduce the rows, height, gap or top margin.'
  return ''
}

// Printable spine labels in shelf order, one per book, laid out on Letter sheets.
export default function LabelPrint() {
  const user = useAuth()
  const location = useLocation()
  const scopeIds = Array.isArray(location.state?.ids) ? location.state.ids : (new URLSearchParams(location.search).get('ids') || '').split(',').filter(Boolean)
  const scope = scopeIds.length ? (location.state?.scope === 'selected' || !location.state ? 'selected' : 'filtered') : 'all'
  const backTo = location.state?.from || '/shelf'
  const [books, setBooks] = useState(null)
  const [error, setError] = useState('')
  const [settings, setSettings] = useState(loadLabelSettings)
  const [category, setCategory] = useState('')
  const [startAt, setStartAt] = useState(1)
  const [calibrate, setCalibrate] = useState(false)
  const [overflow, setOverflow] = useState({})
  const [rules, setRules] = useState([])
  const [checks, setChecks] = useState({})
  const [verdictError, setVerdictError] = useState('')

  useEffect(() => {
    let active = true
    supabase.from('books').select('id,title,author,isbn,pub_date,shelf_category,shelf_subcategory,shelf_author').eq('user_id', user.id)
      .then(({ data, error: e }) => { if (!active) return; if (e) setError('Your books could not be loaded. Reload to try again.'); else setBooks(data || []) })
    Promise.all([loadVerdictRules(user.id), loadChecksByIsbn()])
      .then(([r, c]) => { if (active) { setRules(r); setChecks(c) } })
      .catch(() => { if (active) setVerdictError('Doctrine Check results could not be loaded, so labels would print without color bars. Reload to try again.') })
    return () => { active = false }
  }, [user.id])
  const verdictOf = b => effectiveVerdict(b, rules, checks[b.isbn]).verdict

  function change(key, raw) {
    const n = key === 'rotate' ? (raw ? 1 : 0) : Number(raw)
    if (!Number.isFinite(n)) return
    setSettings(s => { const next = { ...s, [key]: ['columns', 'rows'].includes(key) ? Math.max(1, Math.round(n)) : n }; saveLabelSettings(next); return next })
  }
  function reset() { setSettings({ ...DEFAULT_LABEL_SETTINGS }); saveLabelSettings(DEFAULT_LABEL_SETTINGS); setOverflow({}) }

  const inScope = useMemo(() => {
    if (!books) return []
    const ids = new Set(scopeIds)
    const base = scope === 'all' ? books : books.filter(b => ids.has(b.id))
    return sortShelfOrder(base.filter(b => !category || b.shelf_category === category))
    // scopeIds is derived from location each render; key on its contents.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [books, scope, scopeIds.join(','), category])
  const printable = inScope.filter(hasShelfLabel)
  const missing = scope === 'all' ? [] : inScope.filter(b => !hasShelfLabel(b))
  const perPage = settings.columns * settings.rows
  const skip = Math.min(Math.max(0, Math.round(startAt) - 1), perPage - 1)
  const slots = calibrate ? Array.from({ length: perPage }, (_, i) => ({ calibration: i + 1 })) : [...Array(skip).fill(null), ...printable]
  const pages = []
  for (let i = 0; i < slots.length; i += perPage) pages.push(slots.slice(i, i + perPage))
  const problem = layoutProblem(settings)
  const overBooks = printable.filter(b => overflow[b.id])
  const reportOverflow = useCallback((id, over) => setOverflow(cur => (cur[id] === over ? cur : { ...cur, [id]: over })), [])

  const { w: cellW, h: cellH } = cell(settings)
  const pos = i => ({ left: `${settings.left + (i % settings.columns) * (cellW + settings.gapX)}in`, top: `${settings.top + Math.floor(i / settings.columns) * (cellH + settings.gapY)}in`, width: `${cellW}in`, height: `${cellH}in` })
  const preset = LABEL_PRESETS.find(p => Object.entries(p.values).every(([k, v]) => settings[k] === v))?.key || ''
  function applyPreset(key) { const p = LABEL_PRESETS.find(x => x.key === key); if (!p) return; setSettings(s => { const next = { ...s, ...p.values }; saveLabelSettings(next); return next }); setOverflow({}) }

  return <div className="page label-print-page">
    <div className="label-print-controls">
      <Link className="label-back" to={backTo}><ArrowLeft size={16} aria-hidden="true" />Library</Link>
      <h1>Print shelf labels</h1>
      {error && <p role="alert">{error}</p>}
      {books === null && !error ? <p role="status">Loading…</p> : <>
        <p className="label-scope">{calibrate ? `Calibration sheet: ${perPage} numbered outlines, no books.` : `${printable.length} label${printable.length === 1 ? '' : 's'} on ${pages.length || 0} sheet${pages.length === 1 ? '' : 's'}, in shelf order. ${scope === 'selected' ? `From the ${scopeIds.length} books you selected.` : scope === 'filtered' ? `From the ${scopeIds.length} books matching your Library filters.` : 'All labeled books in your Library.'}`}</p>
        {scope === 'all' && <label className="label-inline">Category<select className="input" value={category} onChange={e => setCategory(e.target.value)}><option value="">All categories</option>{SHELF_TAXONOMY.map(c => <option key={c.key} value={c.key}>{c.code} · {c.name}</option>)}</select></label>}
        {missing.length > 0 && <details className="label-missing" open={missing.length <= 8}><summary>{missing.length} book{missing.length === 1 ? ' has' : 's have'} no shelf label and won’t print</summary><ul>{missing.map(b => <li key={b.id}><Link to={`/shelf/${b.id}`}>{b.title || 'Untitled'}</Link>{b.author ? ` · ${b.author}` : ''}</li>)}</ul></details>}
        {overBooks.length > 0 && !calibrate && <div className="label-warn" role="alert"><strong>{overBooks.length} label{overBooks.length === 1 ? '' : 's'} won’t fit</strong> and {overBooks.length === 1 ? 'is' : 'are'} outlined in red below. Shorten the filing name on the book, lower the text size, or use a larger label.<ul>{overBooks.slice(0, 12).map(b => <li key={b.id}><Link to={`/shelf/${b.id}`}>{shelfLabelLines(b).join(' / ')}</Link> · {b.title}</li>)}</ul></div>}
        {problem && <p className="label-warn" role="alert">{problem}</p>}
        {verdictError && <p className="label-warn" role="alert">{verdictError}</p>}
        {settings.bar > 0 && !calibrate && <div className="label-legend" aria-label="Doctrine bar colors">{VERDICTS.map(v => <span key={v}><span className="verdict-swatch" style={{ background: verdictBarColor(v) }} />{v} ({printable.filter(b => verdictOf(b) === v).length})</span>)}<span>No bar: no verdict yet ({printable.filter(b => !verdictOf(b)).length})</span><Link to="/shelf/doctrine-rules">Author rules</Link></div>}
        <details className="label-settings"><summary>Label stock · {LABEL_PRESETS.find(p => p.key === preset)?.name || `Custom: ${settings.width}″ × ${settings.height}″${settings.rotate ? ' sideways' : ''}, ${settings.columns * settings.rows} per sheet`}</summary>
          <label className="label-inline label-preset">Stock<select className="input" value={preset} onChange={e => applyPreset(e.target.value)}>{!preset && <option value="">Custom</option>}{LABEL_PRESETS.map(p => <option key={p.key} value={p.key}>{p.name}</option>)}</select></label>
          <label className="label-inline label-check"><input type="checkbox" checked={Boolean(settings.rotate)} onChange={e => change('rotate', e.target.checked)} />Sideways stock: print each label turned 90° so it reads upright on the spine</label>
          <div className="label-settings-grid">{FIELDS.map(([key, label, min, max, step]) => <label key={key}>{label}<input className="input" type="number" min={min} max={max} step={step} value={settings[key]} onChange={e => change(key, e.target.value)} /></label>)}</div>
          <button type="button" className="btn btn-ghost" onClick={reset}><RotateCcw size={16} aria-hidden="true" />Reset to 56-per-sheet spine labels</button>
        </details>
        <div className="label-actions">
          <label className="label-inline">Start at label<input className="input" type="number" min={1} max={perPage} value={startAt} onChange={e => setStartAt(Number(e.target.value) || 1)} /></label>
          <label className="label-inline label-check"><input type="checkbox" checked={calibrate} onChange={e => setCalibrate(e.target.checked)} />Calibration sheet</label>
          <button type="button" className="btn btn-primary" disabled={Boolean(problem) || (!calibrate && !printable.length)} onClick={() => window.print()}><Printer size={16} aria-hidden="true" />Print</button>
        </div>
        <p className="label-tip">In the print dialog choose Letter, set the scale to Actual size or 100%, turn off headers and footers, and turn on background graphics so the color bars print. Print the calibration sheet on plain paper first and hold it against a blank label sheet to the light. With sideways stock, each label prints turned so its top, where the color bar sits, faces left; peel it and turn it upright on the spine. If the outlines drift, adjust the margins and gaps above. Use Start at label to finish a partly used sheet.</p>
      </>}
    </div>

    <div className="label-sheets">
      {pages.map((page, p) => <div key={p} className="label-sheet" style={{ width: `${PAGE.w}in`, height: `${PAGE.h}in` }}>
        {page.map((slot, i) => slot === null ? null : slot.calibration
          ? <div key={i} className="label-slot label-calibration" style={pos(i)}>{slot.calibration}{settings.rotate ? <span className="label-cal-top">top ←</span> : null}</div>
          : <div key={slot.id} className="label-slot" style={pos(i)}><div className={settings.rotate ? 'label-turn' : ''} style={settings.rotate ? { width: `${settings.width}in`, height: `${settings.height}in` } : undefined}><SpineLabel lines={shelfLabelLines(slot)} verdict={verdictOf(slot)} settings={settings} rotated={Boolean(settings.rotate)} onOverflow={over => reportOverflow(slot.id, over)} /></div></div>)}
      </div>)}
    </div>
  </div>
}

