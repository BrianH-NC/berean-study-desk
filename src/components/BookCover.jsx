import { useState } from 'react'

export default function BookCover({ book, compact = false }) {
  const [failedUrl, setFailedUrl] = useState(null)
  return <div className={`book-cover ${compact ? 'book-cover-compact' : ''}`}>
    {book.cover_url && failedUrl !== book.cover_url ? (
      <img src={book.cover_url} alt="" loading="lazy" onError={() => setFailedUrl(book.cover_url)} />
    ) : (
      <div className="book-cover-fallback" aria-hidden="true"><span>{compact ? 'B' : book.title || 'Untitled'}</span>{!compact && <small>{book.author || 'Author unknown'}</small>}</div>
    )}
  </div>
}
