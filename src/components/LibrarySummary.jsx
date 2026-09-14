import { useState } from 'react'
import { Link } from 'react-router-dom'
import BookCover from './BookCover'
import { readingProgress } from '../lib/libraryPresentation'
export function LibraryProgress({book}) {
  const percent=readingProgress(book)
  return <div className="heritage-progress">{percent===null?<span>Progress not recorded</span>:<><progress max="100" value={percent} aria-label={`Reading progress for ${book.title}`}/><span>{percent}%</span></>}</div>
}
export default function LibrarySummary({books,wishlistCount,goal,onGoal,select}) {
  const [editing,setEditing]=useState(false), [target,setTarget]=useState('24'), [error,setError]=useState(''), [saving,setSaving]=useState(false)
  const year=new Date().getFullYear()
  const reading=books.filter(b=>b.reading_status==='in-progress'), completed=books.filter(b=>b.reading_status==='read')
  const annual=completed.filter(b=>b.completed_at?.startsWith(String(year))).length
  const recent=[...books].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,4)
  const smallList=(items)=>items.map(b=><Link className="library-rail-book" key={b.id} to={`/shelf/${b.id}`}><BookCover book={b} compact/><div><strong>{b.title}</strong><span>{b.author}</span>{b.reading_status==='in-progress'&&<LibraryProgress book={b}/>}</div></Link>)
  return <aside className="heritage-library-rail"><section className="card"><h2>Library Summary</h2><div className="library-summary-counts">{[[books.length,'Total Books',''],[reading.length,'Reading','Reading'],[completed.length,'Completed','Completed']].map(([count,label,status])=><button key={label} onClick={()=>select(status)}><strong>{count}</strong><span>{label}</span></button>)}<Link to="/shelf/wishlist"><strong>{wishlistCount ?? '—'}</strong><span>Wishlist</span></Link></div></section>
  <section className="card"><header><h2>Recently Added</h2><button onClick={()=>select('recent')}>See all →</button></header>{smallList(recent)}{!recent.length&&<p>No books yet.</p>}</section>
  <section className="card"><header><h2>Reading Goals</h2><button onClick={()=>{setTarget(String(goal||24));setEditing(!editing)}}>{goal?'Edit':'Set goal'}</button></header>{editing?<form onSubmit={async e=>{e.preventDefault();setSaving(true);setError('');try{await onGoal(Number(target));setEditing(false)}catch(err){setError(err.message)}finally{setSaving(false)}}}><label>Books to complete in {year}<input className="input" required min="1" max="1000" type="number" value={target} onChange={e=>setTarget(e.target.value)}/></label><button className="btn btn-secondary" disabled={saving}>Save goal</button>{error&&<p role="alert">{error}</p>}</form>:<><p><strong>{annual}{goal?` / ${goal}`:''}</strong> books completed in {year}</p>{goal&&<progress max={goal} value={Math.min(annual,goal)} aria-label="Annual reading goal"/>}<small>Based on recorded completion dates.</small></>}</section>
  <section className="card"><header><h2>Currently Reading</h2><button onClick={()=>select('Reading')}>See all →</button></header>{smallList(reading.slice(0,3))}{!reading.length&&<p>Choose a book and mark it Reading to get started.</p>}</section>
  <blockquote className="library-quote">“How much better to get wisdom than gold…”<cite>Proverbs 16:16</cite></blockquote></aside>
}
