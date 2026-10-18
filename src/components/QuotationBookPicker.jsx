import { pickerIndex } from '../lib/keyboardNavigation'
import { useEffect, useId, useRef, useState } from 'react'

export default function QuotationBookPicker({ books, value, onChange, label = 'Book', disabled = false, required = false, placeholder = 'Type a title or author…' }) {
  const id = useId()
  const list = useRef(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const selected = books.find(book => book.id === value)
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
  const matches = books.filter(book => terms.every(term => `${book.title} ${book.author || ''}`.toLowerCase().includes(term)))
    .sort((a, b) => a.title.localeCompare(b.title))
  useEffect(() => { if(open) list.current?.querySelector(`[id="${id}-${active}"]`)?.scrollIntoView({block:'nearest'}) }, [active,open,id])
  function choose(book) { onChange(book.id); setOpen(false); setQuery(''); setActive(-1) }
  return <div className="quotation-book-picker" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }}>
    <label htmlFor={id}>{label}</label>
    <div className="quotation-book-input">
      <input id={id} className="input" role="combobox" autoComplete="off" aria-autocomplete="list" aria-expanded={open && !disabled} aria-controls={`${id}-list`} aria-activedescendant={open && matches[active] ? `${id}-${active}` : undefined}
        required={required} disabled={disabled} placeholder={placeholder} value={open ? query : selected?.title || query}
        onFocus={() => { if(selected) setQuery(selected.title); setActive(-1); setOpen(true) }}
        onChange={event => { setQuery(event.target.value); setActive(-1); setOpen(true); onChange('') }}
        onKeyDown={event => {
          if (event.key === 'Escape') { event.preventDefault(); setOpen(false) }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); setActive(index => pickerIndex(event.key,open?index:-1,matches.length)) }
          if (event.key === 'Enter' && open) { event.preventDefault(); if (matches[Math.max(0,active)]) choose(matches[Math.max(0,active)]) }
        }} />
      {value && !disabled && <button type="button" aria-label={`Clear ${label.toLowerCase()}`} onClick={() => { onChange(''); setQuery(''); setOpen(false) }}>×</button>}
    </div>
    {open && !disabled && <div ref={list} className="quotation-book-results" id={`${id}-list`} role="listbox" aria-label={label}>
      {matches.map((book, index) => <div key={book.id} id={`${id}-${index}`} role="option" aria-selected={index === active} className={index === active ? 'active' : ''}
        onMouseDown={event => event.preventDefault()} onClick={() => choose(book)} onMouseEnter={() => setActive(index)}>
        <strong>{book.title}</strong>{book.author && <small>{book.author}</small>}
      </div>)}
      {!matches.length && <p role="status">No matching books in your library.</p>}
    </div>}
  </div>
}
