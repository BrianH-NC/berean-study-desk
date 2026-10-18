import { menuIndex } from '../lib/keyboardNavigation'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
export default function LibraryBookMenu({book,state,assessment,onEdit,onRemove}) {
  const [open,setOpen]=useState(false)
  const root=useRef(null), trigger=useRef(null)
  useEffect(()=>{if(!open)return;root.current?.querySelector('[role=menuitem]')?.focus();const close=e=>{if(!root.current?.contains(e.target))setOpen(false)};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close)},[open])
  function edit(section) {setOpen(false);trigger.current?.focus();onEdit(book,section)}
  return <div className="library-book-menu" ref={root} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();setOpen(false);trigger.current?.focus()}if(open&&e.key==='Tab'){trigger.current?.focus();setOpen(false)}if(open&&['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();const items=[...root.current.querySelectorAll('[role=menuitem]')];items[menuIndex(e.key,items.indexOf(document.activeElement),items.length)]?.focus()}}}>
    <button type="button" ref={trigger} aria-label={`Actions for ${book.title}`} aria-haspopup="menu" aria-expanded={open} onClick={()=>setOpen(!open)}>⋮</button>
    {open&&<div className="library-book-menu-panel" role="menu" aria-label={`Book actions for ${book.title}`} onClick={e=>{if(e.target.closest('a'))setOpen(false)}}>
      <strong>Study</strong><Link role="menuitem" tabIndex={-1} to={`/shelf/${book.id}`} state={state}>Open Details</Link><Link role="menuitem" tabIndex={-1} to={`/shelf/${book.id}?tab=notes`} state={state}>Open Notes</Link><Link role="menuitem" tabIndex={-1} to={assessment?`/checks/${assessment.id}`:`/shelf/${book.id}?tab=doctrine`} state={state}>{assessment?'View Doctrine Check':'Run Doctrine Check'}</Link>
      <strong>Organize</strong><button role="menuitem" tabIndex={-1} onClick={()=>edit('status')}>Change Status</button><button role="menuitem" tabIndex={-1} onClick={()=>edit('progress')}>Update Progress</button><button role="menuitem" tabIndex={-1} onClick={()=>edit('collections')}>Add to Collection</button><button role="menuitem" tabIndex={-1} onClick={()=>edit('tags')}>Manage Tags</button>
      <strong>Manage</strong><Link role="menuitem" tabIndex={-1} to={`/shelf/${book.id}?edit=1`} state={state}>Edit Book Details</Link><button role="menuitem" tabIndex={-1} className="library-remove" onClick={()=>{setOpen(false);trigger.current?.focus();onRemove(book)}}>Remove from Library</button>
    </div>}
  </div>
}
