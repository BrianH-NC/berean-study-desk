import { Link } from 'react-router-dom'
import BookCover from './BookCover'
import AssessmentBadge from './AssessmentBadge'
import { primaryCategory, readingStatus } from '../lib/libraryPresentation'

function Actions({ book, state }) {
  return <Link to={`/shelf/${book.id}`} state={state} className="btn btn-secondary" aria-label={`Open ${book.title}`}>Open</Link>
}

export default function LibraryCollection({ books, assessments, view, libraryFrom, sort, direction, onSort, assessmentsUnavailable }) {
  const state = { libraryFrom }
  const badge = book => assessmentsUnavailable ? <span className="card-meta">Assessment unavailable</span> : <AssessmentBadge assessment={assessments[book.isbn]} title={book.title} unassessedTo={`/shelf/${book.id}?tab=doctrine`} state={state} />
  if (view === 'list') return <div className="library-records">
    <table className="library-table">
      <caption className="sr-only">Your Library</caption>
      <thead><tr>{['Title', 'Author', 'Category', 'Verdict', 'Status', 'Progress', 'Actions'].map(label => {
        const key = label.toLowerCase()
        const sortable = ['title', 'author', 'category'].includes(key)
        return <th key={label} scope="col" aria-sort={sortable ? sort === key ? direction === 'asc' ? 'ascending' : 'descending' : 'none' : undefined}>
          {sortable ? <button type="button" onClick={() => onSort(key)}>{label}{sort === key ? direction === 'asc' ? ' ↑' : ' ↓' : ''}</button> : label}
        </th>
      })}</tr></thead>
      <tbody>{books.map(book => <tr key={book.id}>
        <td data-label="Title"><Link to={`/shelf/${book.id}`} state={state} className="library-title"><BookCover book={book} compact /><span>{book.title || 'Untitled'}</span></Link></td>
        <td data-label="Author">{book.author || 'Unknown author'}</td>
        <td data-label="Category">{primaryCategory(book)}</td>
        <td data-label="Verdict">{badge(book)}</td>
        <td data-label="Status">{readingStatus(book)}</td>
        <td data-label="Progress"><span aria-label="Progress not recorded">—</span></td>
        <td data-label="Actions"><Actions book={book} state={state} /></td>
      </tr>)}</tbody>
    </table>
  </div>
  return <div className={`library-cards ${view === 'shelf' ? 'library-shelf' : ''}`}>
    {books.map(book => <article key={book.id} className="library-book card">
      <Link to={`/shelf/${book.id}`} state={state} className="library-cover-link" aria-label={`Open ${book.title}`}><BookCover book={book} /></Link>
      <h2 className="card-title"><Link to={`/shelf/${book.id}`} state={state}>{book.title || 'Untitled'}</Link></h2>
      <p className="font-ui text-sm text-muted mb-0">{book.author || 'Unknown author'}</p>
      <p className="card-meta">{primaryCategory(book)}</p>
      {badge(book)}
      <div className="font-ui text-xs text-muted mt-auto pt-2">{readingStatus(book)} · <span aria-label="Progress not recorded">Progress —</span></div>
      <Actions book={book} state={state} />
    </article>)}
  </div>
}
