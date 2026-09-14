import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
export default function LibraryBookMenu({book,state,assessment,onEdit,onRemove}) {
  const [open,setOpen]=useState(false)
  const root=useRef(null), trigger=useRef(null)
  useEffect(()=>{if(!open)return;const close=e=>{if(!root.current?.contains(e.target))setOpen(false)};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close)},[open])
  function edit(section) {setOpen(false);onEdit(book,section)}
  return <div className="library-book-menu" ref={root} onKeyDown={e=>{if(e.key==='Escape'){setOpen(false);trigger.current?.focus()}}}>
    <button type="button" ref={trigger} aria-label={`Actions for ${book.title}`} aria-expanded={open} onClick={()=>setOpen(!open)}>⋮</button>
    {open&&<div className="library-book-menu-panel" aria-label={`Book actions for ${book.title}`} onClick={e=>{if(e.target.closest('a'))setOpen(false)}}>
      <strong>Study</strong><Link to={`/shelf/${book.id}`} state={state}>Open Details</Link><Link to={`/shelf/${book.id}?tab=notes`} state={state}>Open Notes</Link><Link to={assessment?`/checks/${assessment.id}`:`/shelf/${book.id}?tab=doctrine`} state={state}>{assessment?'View Doctrine Check':'Run Doctrine Check'}</Link>
      <strong>Organize</strong><button onClick={()=>edit('status')}>Change Status</button><button onClick={()=>edit('progress')}>Update Progress</button><button onClick={()=>edit('collections')}>Add to Collection</button><button onClick={()=>edit('tags')}>Manage Tags</button>
      <strong>Manage</strong><Link to={`/shelf/${book.id}?edit=1`} state={state}>Edit Book Details</Link><button className="library-remove" onClick={()=>{setOpen(false);onRemove(book)}}>Remove from Library</button>
    </div>}
  </div>
}
