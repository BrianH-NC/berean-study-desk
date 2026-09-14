import { useEffect, useRef, useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { createPortal } from 'react-dom'
import './NoteMenu.css'

export default function NoteMenu({ label = 'Note actions', actions, children }) {
  const [open, setOpen] = useState(false)
  const [position,setPosition]=useState({top:0,left:0})
  const root = useRef(null), trigger = useRef(null), panel = useRef(null)
  useEffect(() => {
    if (!open) return
    panel.current?.querySelector('button')?.focus()
    const outside = e => { if (!root.current?.contains(e.target)&&!panel.current?.contains(e.target)) setOpen(false) }
    const scroll = e => {if(!panel.current?.contains(e.target))setOpen(false)}
    document.addEventListener('pointerdown', outside)
    document.addEventListener('scroll',scroll,true)
    return () => {document.removeEventListener('pointerdown', outside);document.removeEventListener('scroll',scroll,true)}
  }, [open])
  return <div className="notes-menu" ref={root} onKeyDown={e => {
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); trigger.current?.focus() }
    if (open && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
      e.preventDefault()
      const buttons = [...panel.current.querySelectorAll('button')]
      const i = buttons.indexOf(document.activeElement)
      buttons[e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1 : (i + (e.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus()
    }
    if (e.key === 'Tab') setOpen(false)
  }}>
    <button type="button" ref={trigger} aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => {const rect=trigger.current.getBoundingClientRect();setPosition({left:Math.max(8,Math.min(rect.right-240,window.innerWidth-248)),top:Math.max(8,Math.min(rect.bottom,window.innerHeight-Math.min(actions.length*48+12,window.innerHeight-24)-12))});setOpen(!open)}}>{children || <MoreHorizontal size={18}/>}</button>
    {open && createPortal(<div className="notes-menu-panel" style={position} ref={panel} role="menu" aria-label={label}>{actions.map(action => <button role="menuitem" key={action.label} className={action.danger ? 'notes-delete' : ''} onClick={() => { setOpen(false); trigger.current?.focus(); action.run() }}>{action.label}</button>)}</div>,document.body)}
  </div>
}
