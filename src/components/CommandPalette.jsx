import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, CornerDownLeft } from 'lucide-react'
import { parseReference } from '../lib/bsb'
import { scriptureUrl } from '../lib/noteScripture'

// Ctrl K: jump to any page by name, open a passage, or search everything.
export function paletteResults(query, pages) {
  const q = query.trim().toLowerCase()
  const results = []
  const passage = q ? parseReference(query.trim()) : null
  if (passage && /\d/.test(q)) results.push({ key: 'passage', label: `Open ${passage.book} ${passage.chapter}${passage.verseStart ? `:${passage.verseStart}${passage.verseEnd && passage.verseEnd !== passage.verseStart ? `–${passage.verseEnd}` : ''}` : ''}`, hint: 'Bible', to: scriptureUrl(passage) })
  const matches = pages.filter(page => !q || page.label.toLowerCase().includes(q))
  matches.forEach(page => results.push({ key: page.to, label: page.label, hint: 'Go to', to: page.to, icon: page.icon }))
  if (q) results.push({ key: 'search', label: `Search for “${query.trim()}”`, hint: 'Scripture, books, notes', to: `/search?q=${encodeURIComponent(query.trim())}` })
  return results
}

export default function CommandPalette({ open, onClose, pages }) {
  const dialog = useRef(null)
  const input = useRef(null)
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const results = useMemo(() => paletteResults(query, pages), [query, pages])

  useEffect(() => {
    const node = dialog.current
    if (!node) return
    if (open && !node.open) { node.showModal(); setQuery(''); setActive(0); setTimeout(() => input.current?.focus(), 0) }
    if (!open && node.open) node.close()
  }, [open])

  function go(result) { if (!result) return; onClose(); navigate(result.to) }
  function onKeyDown(event) {
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive(i => Math.min(results.length - 1, i + 1)) }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActive(i => Math.max(0, i - 1)) }
    else if (event.key === 'Enter') { event.preventDefault(); go(results[active]) }
  }

  return <dialog ref={dialog} className="command-palette" aria-label="Search everything" onClose={onClose} onClick={event => { if (event.target === dialog.current) onClose() }}>
    <div className="command-input"><Search size={18} aria-hidden="true" />
      <input ref={input} value={query} onChange={event => { setQuery(event.target.value); setActive(0) }} onKeyDown={onKeyDown} placeholder="Jump to a page, open a passage (John 3:16), or search…" aria-label="Search everything" aria-controls="command-results" aria-activedescendant={results[active] ? `command-${active}` : undefined} role="combobox" aria-expanded="true" />
      <kbd>Esc</kbd></div>
    <ul id="command-results" role="listbox" className="command-results">
      {results.map((result, index) => { const Icon = result.icon; return <li key={result.key} id={`command-${index}`} role="option" aria-selected={index === active} className={index === active ? 'is-active' : ''} onMouseEnter={() => setActive(index)} onClick={() => go(result)}>
        {Icon ? <Icon size={18} aria-hidden="true" /> : <Search size={18} aria-hidden="true" />}<span>{result.label}</span><small>{result.hint}</small>{index === active && <CornerDownLeft size={14} aria-hidden="true" />}
      </li> })}
    </ul>
  </dialog>
}
