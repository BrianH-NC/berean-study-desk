import LibraryBookMenu from './LibraryBookMenu'
import { LibraryProgress } from './LibrarySummary'
import { Link } from 'react-router-dom'
import BookCover from './BookCover'
import AssessmentBadge from './AssessmentBadge'
import { primaryCategory, readingStatus } from '../lib/libraryPresentation'
import { shelfLabelText } from '../lib/shelfLabels'
import { ruleFor } from '../lib/verdictRules'

const LabelChip = ({ book }) => { const t = shelfLabelText(book); return t ? <span className="library-shelf-chip" title="Shelf label">{t}</span> : <span className="library-shelf-chip is-none">No label</span> }
const SelectBox = ({ book, selected, onToggle }) => <input type="checkbox" className="library-select" checked={selected.has(book.id)} onChange={() => onToggle(book.id)} aria-label={`Select ${book.title || 'book'} for labels`} />

export default function LibraryCollection({ books, rules = [], assessments, view, libraryFrom, sort, direction, onSort, onEdit, onRemove, assessmentsUnavailable, selecting = false, selected = new Set(), onToggleSelect = () => {} }) {
  const state = { libraryFrom }
  const badge = book => assessmentsUnavailable ? <span className="card-meta">Assessment unavailable</span> : <AssessmentBadge assessment={assessments[book.isbn]} rule={ruleFor(book, rules)} title={book.title} unassessedTo={`/shelf/${book.id}?tab=doctrine`} state={state} />
  if (view === 'list') return <div className="library-records">
    <table className="library-table">
      <caption className="sr-only">Your Library</caption>
      <thead><tr>{selecting && <th scope="col"><span className="sr-only">Select</span></th>}{['Title', 'Author', 'Category', 'Label', 'Verdict', 'Status', 'Progress', 'Actions'].map(label => {
        const key = label.toLowerCase()
        const sortable = ['title', 'author', 'category', 'label'].includes(key)
        const sortKey = key === 'label' ? 'shelf' : key
        return <th key={label} scope="col" aria-sort={sortable ? sort === sortKey ? direction === 'asc' ? 'ascending' : 'descending' : 'none' : undefined}>
          {sortable ? <button type="button" onClick={() => onSort(sortKey)}>{label}{sort === sortKey ? direction === 'asc' ? ' ↑' : ' ↓' : ''}</button> : label}
        </th>
      })}</tr></thead>
      <tbody>{books.map(book => <tr key={book.id}>
        {selecting && <td data-label="Select"><SelectBox book={book} selected={selected} onToggle={onToggleSelect} /></td>}
        <td data-label="Title"><Link to={`/shelf/${book.id}`} state={state} className="library-title"><BookCover book={book} compact /><span>{book.title || 'Untitled'}</span></Link></td>
        <td data-label="Author">{book.author || 'Unknown author'}</td>
        <td data-label="Category">{primaryCategory(book)}</td>
        <td data-label="Label"><LabelChip book={book} /></td>
        <td data-label="Verdict">{badge(book)}</td>
        <td data-label="Status">{readingStatus(book)==='Not Started'?'To Read':readingStatus(book)}</td>
        <td data-label="Progress"><LibraryProgress book={book}/></td>
        <td data-label="Actions"><LibraryBookMenu book={book} state={state} assessment={assessments[book.isbn]} onEdit={onEdit} onRemove={onRemove}/></td>
      </tr>)}</tbody>
    </table>
  </div>
  return <div className={`library-cards ${view === 'shelf' ? 'library-shelf' : ''}`}>
    {books.map(book => <article key={book.id} className={`library-book card ${selecting && selected.has(book.id) ? 'is-selected' : ''}`}>
      {selecting && <SelectBox book={book} selected={selected} onToggle={onToggleSelect} />}
      <Link to={`/shelf/${book.id}`} state={state} className="library-cover-link" aria-label={`Open ${book.title}`}><BookCover book={book} /></Link>
      <h2 className="card-title"><Link to={`/shelf/${book.id}`} state={state}>{book.title || 'Untitled'}</Link></h2>
      <p className="font-ui text-sm text-muted mb-0">{book.author || 'Unknown author'}</p>
      <p className="card-meta">{primaryCategory(book)}</p>
      <LabelChip book={book} />
      {badge(book)}
      <div className="font-ui text-xs text-muted mt-auto pt-2"><span className={`library-reading-status status-${book.reading_status}`}>{readingStatus(book)==='Not Started'?'To Read':readingStatus(book)}</span><LibraryProgress book={book}/></div>
      <LibraryBookMenu book={book} state={state} assessment={assessments[book.isbn]} onEdit={onEdit} onRemove={onRemove}/>
    </article>)}
  </div>
}
