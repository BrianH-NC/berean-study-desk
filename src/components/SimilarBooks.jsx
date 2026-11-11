import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../App'
import { supabase } from '../lib/supabase'
import { rankSimilar } from '../lib/libraryPresentation'

export default function SimilarBooks({ book }) {
  const user = useAuth()
  const [similar, setSimilar] = useState(null)
  const { id, subjects, tags } = book

  useEffect(() => {
    if (!subjects?.length) return
    let active = true
    supabase
      .from('books')
      .select('id,title,author,tags,subjects')
      .eq('user_id', user.id)
      .neq('id', id)
      .overlaps('subjects', subjects)
      .limit(200)
      .then(({ data, error }) => {
        if (active) setSimilar(error ? [] : rankSimilar({ id, subjects, tags }, data || []))
      })
    return () => { active = false }
  }, [user.id, id, subjects, tags])

  if (!book.subjects?.length || !similar?.length) return null
  return (
    <div className="mt-4">
      <h3>More like this</h3>
      <ul className="similar-books" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {similar.map((b) => (
          <li key={b.id} className="py-1">
            <Link to={`/shelf/${b.id}`}>{b.title}</Link>
            {b.author && <span className="card-meta"> · {b.author}</span>}
            <small className="block card-meta">{b.shared.slice(0, 3).join(' · ')}</small>
          </li>
        ))}
      </ul>
    </div>
  )
}
