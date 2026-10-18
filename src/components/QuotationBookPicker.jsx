import { useId, useState } from 'react'

export default function QuotationBookPicker({ books, value, onChange, label = 'Book', disabled = false, required = false, placeholder = 'Type a title or author…' }) {
  const id = useId()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const selected = books.find(book => book.id === value)
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
  const matches = books.filter(book => terms.every(term => `${book.title} ${book.author || ''}`.toLowerCase().includes(term)))
    .sort((a, b) => a.title.localeCompare(b.title))
  function choose(book) { onChange(book.id); setOpen(false); setQuery(''); setActive(0) }
  return <div className="quotation-book-picker" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }}>
    <label htmlFor={id}>{label}</label>
    <div className="quotation-book-input">
      <input id={id} className="input" role="combobox" autoComplete="off" aria-autocomplete="list" aria-expanded={open} aria-controls={`${id}-list`} aria-activedescendant={open && matches[active] ? `${id}-${active}` : undefined}
        required={required} disabled={disabled} placeholder={placeholder} value={open ? query : selected?.title || ''}
        onFocus={() => { setQuery(''); setActive(0); setOpen(true) }}
        onChange={event => { setQuery(event.target.value); setActive(0); setOpen(true); onChange('') }}
        onKeyDown={event => {
          if (event.key === 'Escape') { event.preventDefault(); setOpen(false) }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); setActive(index => Math.max(0, Math.min(matches.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)))) }
          if (event.key === 'Enter' && open) { event.preventDefault(); if (matches[active]) choose(matches[active]) }
        }} />
      {value && !disabled && <button type="button" aria-label={`Clear ${label.toLowerCase()}`} onClick={() => { onChange(''); setQuery(''); setOpen(false) }}>×</button>}
    </div>
    {open && !disabled && <div className="quotation-book-results" id={`${id}-list`} role="listbox" aria-label={label}>
      {matches.map((book, index) => <div key={book.id} id={`${id}-${index}`} role="option" aria-selected={index === active} className={index === active ? 'active' : ''}
        onMouseDown={event => event.preventDefault()} onClick={() => choose(book)} onMouseEnter={() => setActive(index)}>
        <strong>{book.title}</strong>{book.author && <small>{book.author}</small>}
      </div>)}
      {!matches.length && <p role="status">No matching books in your library.</p>}
    </div>}
  </div>
}
