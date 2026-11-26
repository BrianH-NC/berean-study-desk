import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Printer, Tag } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { SHELF_TAXONOMY, hasShelfLabel, normalizeFilingName, shelfCategory, shelfLabelLines, shelfLabelValues, shelfSubcategory, suggestFilingName } from '../lib/shelfLabels'
import SpineLabel, { loadLabelSettings } from './SpineLabel'

// Category and dependent subcategory pickers with full names beside each code.
export function ShelfLabelFields({ value, onChange, idPrefix = 'shelf' }) {
  const cat = shelfCategory(value.category)
  return <div className="shelf-fields">
    <label htmlFor={`${idPrefix}-cat`}>Main category
      <select id={`${idPrefix}-cat`} className="input" value={value.category} onChange={e => onChange({ ...value, category: e.target.value, subcategory: '' })}>
        <option value="">Choose…</option>
        {SHELF_TAXONOMY.map(c => <option key={c.key} value={c.key}>{c.code} · {c.name}</option>)}
      </select>
    </label>
    <label htmlFor={`${idPrefix}-sub`}>Subcategory
      <select id={`${idPrefix}-sub`} className="input" value={value.subcategory} disabled={!cat} onChange={e => onChange({ ...value, subcategory: e.target.value })}>
        <option value="">{cat ? 'Choose…' : 'Pick a category first'}</option>
        {cat?.subs.map(s => <option key={s.key} value={s.key}>{s.code === s.name.toUpperCase() ? s.name : `${s.code} · ${s.name}`}</option>)}
      </select>
    </label>
    <label htmlFor={`${idPrefix}-author`}>Author filing name
      <input id={`${idPrefix}-author`} className="input" value={value.author} maxLength={60} placeholder="SURNAME" onChange={e => onChange({ ...value, author: e.target.value.replace(/[\r\n\t]/g, ' ') })} />
    </label>
  </div>
}

export function previewLines(value) {
  const cat = shelfCategory(value.category), s = shelfSubcategory(value.category, value.subcategory)
  const name = normalizeFilingName(value.author)
  if (!cat && !s && !name) return null
  return [cat?.code || '—', s?.code || '—', name || '—']
}

// The Shelf label section on a book: preview, edit, clear.
export default function ShelfLabelCard({ book, verdict = null, userId, onSaved }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [over, setOver] = useState(false)
  const settings = loadLabelSettings()
  const labeled = hasShelfLabel(book)
  const lines = shelfLabelLines(book)

  function start() {
    setValue({ category: book.shelf_category || '', subcategory: book.shelf_subcategory || '', author: book.shelf_author || suggestFilingName(book.author) })
    setError(''); setEditing(true)
  }
  async function write(values) {
    setBusy(true); setError('')
    try {
      const { error: e } = await supabase.from('books').update(values).eq('user_id', userId).eq('id', book.id)
      if (e) throw e
      onSaved(values); setEditing(false)
    } catch (e) { setError(e.message || 'The label could not be saved.') } finally { setBusy(false) }
  }
  async function save(e) {
    e.preventDefault()
    let values
    try { values = shelfLabelValues(value) } catch (err) { setError(err.message); return }
    if (!values.shelf_category) { setError('Choose a category, subcategory and filing name, or use Clear label.'); return }
    await write(values)
  }
  function clear() {
    if (!window.confirm('Clear this book’s shelf label?')) return
    void write({ shelf_category: null, shelf_subcategory: null, shelf_author: null })
  }

  return <section className="card shelf-label-card" aria-labelledby="shelf-label-title">
    <div className="shelf-label-head"><h2 id="shelf-label-title"><Tag size={18} aria-hidden="true" />Shelf label</h2>
      {!editing && <div className="flex gap-2 flex-wrap">
        <button type="button" className="btn btn-secondary" onClick={start}>{labeled ? 'Edit label' : 'Add a label'}</button>
        {labeled && <Link className="btn btn-ghost" to={`/shelf/labels?ids=${book.id}`}><Printer size={16} aria-hidden="true" />Print</Link>}
      </div>}
    </div>
    {!editing ? (labeled
      ? <div className="shelf-label-show"><SpineLabel lines={lines} verdict={verdict} settings={settings} onOverflow={setOver} /><div><p className="mb-1">{shelfCategory(book.shelf_category)?.name}</p><p className="card-meta mb-0">{shelfSubcategory(book.shelf_category, book.shelf_subcategory)?.name}</p>{over && <p className="shelf-over" role="status">This label doesn’t fit the current label size. Shorten the filing name or change the size on the print page.</p>}</div></div>
      : <p className="card-meta mb-0">No shelf label yet. Add one to file this book in shelf order and print its spine label.</p>)
      : <form className="shelf-label-form" onSubmit={save}>
          <ShelfLabelFields value={value} onChange={v => { setValue(v); setError('') }} idPrefix={`shelf-${book.id}`} />
          <div className="shelf-label-preview"><p className="shelf-mini-label">Prints as</p>{previewLines(value) ? <SpineLabel lines={previewLines(value)} verdict={verdict} settings={settings} onOverflow={setOver} /> : <p className="card-meta">Choose a category to see the label.</p>}
            {over && <p className="shelf-over" role="status">Too long for a {settings.width}″ × {settings.height}″ label. Shorten the filing name, or add initials only where you need them.</p>}</div>
          {error && <p role="alert">{error}</p>}
          <div className="flex gap-2 flex-wrap"><button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save label'}</button><button type="button" className="btn btn-secondary" disabled={busy} onClick={() => { setEditing(false); setError('') }}>Cancel</button>{labeled && <button type="button" className="btn btn-ghost" disabled={busy} onClick={clear}>Clear label</button>}</div>
        </form>}
    {!editing && error && <p role="alert">{error}</p>}
  </section>
}
