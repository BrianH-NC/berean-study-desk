import { useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Home, Search, BookText, LibraryBig, ShieldCheck, NotebookPen, Tags, BookOpenText, Settings, UserRound, Menu, X, PanelLeft } from 'lucide-react'
import Logo, { BrandLockup } from './Logo'

// Preserve existing durable URLs and working destinations during the redesign.
const PRIMARY = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/bible', label: 'Bible Study', icon: BookText },
  { to: '/shelf', label: 'Library', icon: LibraryBig },
]
const SECONDARY = [
  { to: '/checks', label: 'Doctrine Check', icon: ShieldCheck },
  { to: '/notebook', label: 'Notes', icon: NotebookPen },
  { to: '/topics', label: 'Topics', icon: Tags },
  { to: '/reading', label: 'Reading now', icon: BookOpenText },
]
const ACCOUNT = [
  { to: '/settings', label: 'Settings', icon: Settings, end: true },
  { to: '/settings/profile', label: 'Profile', icon: UserRound },
]

function NavigationLink({ item, onClick }) {
  const Icon = item.icon
  return <NavLink to={item.to} end={item.end} onClick={onClick} className="nav-item" title={item.label} aria-label={item.label}>
    <Icon size={22} aria-hidden="true" /><span className="nav-label">{item.label}</span>
  </NavLink>
}

export default function Sidebar() {
  const { pathname } = useLocation()
  const dialog = useRef(null)
  const trigger = useRef(null)
  const [expanded, setExpanded] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [hovering, setHovering] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const moreActive = [...SECONDARY, ...ACCOUNT].some(item => pathname.startsWith(item.to.split('#')[0]))

  function openMenu(event) {
    trigger.current = event.currentTarget
    dialog.current.showModal()
    setMenuOpen(true)
  }
  function closeMenu() { dialog.current.close() }
  function restoreFocus() {
    setMenuOpen(false)
    trigger.current?.focus()
  }
  function toggleRail() {
    if (window.matchMedia('(min-width: 1280px)').matches) setCollapsed(value => !value)
    else setExpanded(value => !value)
  }

  return <>
    <aside className={`heritage-sidebar ${collapsed ? 'is-collapsed' : ''} ${expanded || hovering ? 'is-expanded' : ''}`}
      onMouseEnter={() => collapsed && setHovering(true)} onMouseLeave={() => setHovering(false)} aria-label="Study desk sidebar">
      <div className="flex flex-col items-center gap-3">
        <Logo size={40} />
        <div className="brand-detail text-center"><BrandLockup /><p className="font-ui text-xs mt-3 mb-0 text-gold">Search. Study. Discern.</p><p className="font-ui text-xs mb-0">Acts 17:11</p></div>
      </div>
      <nav aria-label="Main navigation" className="flex flex-col gap-1 flex-1">
        {[...PRIMARY, ...SECONDARY].map(item => <NavigationLink key={item.to} item={item} />)}
      </nav>
      <div className="flex flex-col gap-1">
        {ACCOUNT.map(item => <NavigationLink key={item.to} item={item} />)}
        <button type="button" className="nav-item" aria-label="Expand or collapse navigation" onClick={toggleRail}>
          <PanelLeft size={22} aria-hidden="true" /><span className="nav-label">Resize navigation</span>
        </button>
      </div>
    </aside>

    <header className="heritage-header"><Logo size={32} /><span className="font-heading text-sm">Berean Study Desk</span></header>
    <nav className="heritage-bottom" aria-label="Phone navigation">
      {PRIMARY.map(item => {
        const Icon = item.icon
        return <NavLink key={item.to} to={item.to} end={item.end}><Icon size={22} aria-hidden="true" /><span>{item.label}</span></NavLink>
      })}
      <button type="button" className={moreActive ? 'is-active' : ''} aria-label="More destinations" aria-haspopup="dialog" aria-expanded={menuOpen} onClick={openMenu}>
        <Menu size={22} aria-hidden="true" /><span>More</span>
      </button>
    </nav>
    <dialog ref={dialog} className="nav-sheet" aria-labelledby="navigation-title" onClose={restoreFocus}>
      <div className="flex items-center justify-between gap-4 mb-4"><h2 id="navigation-title" className="text-xl mb-0">Your study desk</h2><button type="button" className="btn btn-icon" aria-label="Close navigation" onClick={closeMenu}><X size={22} /></button></div>
      <nav aria-label="More destinations" className="flex flex-col gap-1">{[...SECONDARY, ...ACCOUNT].map(item => <NavigationLink key={item.to} item={item} onClick={closeMenu} />)}</nav>
    </dialog>
  </>
}
