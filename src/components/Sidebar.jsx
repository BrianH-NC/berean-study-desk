import AccountLink from './AccountLink'
import CommandPalette from './CommandPalette'
import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { CalendarCheck, BookOpen, NotebookPen, Mic, LibraryBig, ShieldCheck, ScanBarcode, Search, Settings, Menu, X, PanelLeft, Heart, Sparkles, ChevronDown, Tags, BookOpenText, CalendarDays, Quote, RotateCcw, Layers } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { APP_VERSION, hasUnseenUpdate } from '../lib/changelog'

// Six destinations, ordered by the day: read, write, listen, then the library and the store.
export const DESTINATIONS = [
  { to: '/', label: 'Today', icon: CalendarCheck, end: true },
  { to: '/bible', label: 'Bible', icon: BookOpen },
  { to: '/notebook', label: 'Notes', icon: NotebookPen },
  { to: '/sermons', label: 'Sermons', icon: Mic },
  { to: '/shelf', label: 'Library', icon: LibraryBig },
  { to: '/checks', label: 'Doctrine Check', icon: ShieldCheck },
]
// Everything else stays reachable, one step away, until it folds into a destination.
export const MORE = [
  { to: '/prayer', label: 'Prayer Journal', icon: Heart },
  { to: '/reading-plans', label: 'Reading plans', icon: CalendarDays },
  { to: '/reading', label: 'Reading now', icon: BookOpenText },
  { to: '/topics', label: 'Topics', icon: Tags },
  { to: '/quotations', label: 'Quotations', icon: Quote },
  { to: '/study-tools', label: 'Review & memorize', icon: RotateCcw },
  { to: '/study-sessions', label: 'Saved study sessions', icon: Layers },
  { to: '/search', label: 'Search', icon: Search },
]
const ACCOUNT = [
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/whats-new', label: 'What’s New', icon: Sparkles, version: APP_VERSION },
]

function NavigationLink({ item, onClick }) {
  const Icon = item.icon
  const label = [item.label, item.count != null && `${item.count}`, item.unseen && 'new updates'].filter(Boolean).join(', ')
  return <NavLink to={item.to} end={item.end} onClick={onClick} className={`nav-item${item.unseen ? ' has-update' : ''}`} title={item.version ? `${item.label} · v${item.version}` : item.label} aria-label={label}>
    <Icon size={20} aria-hidden="true" /><span className="nav-label">{item.label}{item.count != null && <small className="nav-count">{item.count}</small>}</span>
    {item.unseen && <span className="nav-update-dot" aria-hidden="true" />}
  </NavLink>
}

export function BrandMark({ size = 28 }) {
  return <span className="brand-mark" style={{ width: size, height: size, fontSize: Math.round(size * 0.6) }} aria-hidden="true">B</span>
}

export default function Sidebar({ user }) {
  const { pathname } = useLocation()
  const [sermonCount, setSermonCount] = useState(null)
  useEffect(() => { let active = true; const refresh = () => supabase.from('sermons').select('id', { count: 'exact', head: true }).eq('user_id', user.id).then(({ count, error }) => { if (active) setSermonCount(error ? null : count) }); refresh(); window.addEventListener('sermons-changed', refresh); return () => { active = false; window.removeEventListener('sermons-changed', refresh) } }, [user.id])
  const [unseenUpdate, setUnseenUpdate] = useState(() => { try { return hasUnseenUpdate(window.localStorage, user.id) } catch { return false } })
  useEffect(() => { const seen = () => setUnseenUpdate(false); window.addEventListener('whats-new-seen', seen); return () => window.removeEventListener('whats-new-seen', seen) }, [])
  const account = ACCOUNT.map(item => item.to === '/whats-new' ? { ...item, unseen: unseenUpdate } : item)
  const destinations = DESTINATIONS.map(item => item.to === '/sermons' ? { ...item, count: sermonCount } : item)
  const dialog = useRef(null)
  const trigger = useRef(null)
  const [railExpanded, setRailExpanded] = useState(() => { try { return JSON.parse(localStorage.getItem('bsd-navigation-expanded') || 'null') } catch { return null } })
  const expanded = railExpanded === true
  const collapsed = railExpanded === false
  const [menuOpen, setMenuOpen] = useState(false)
  const moreActive = [...MORE, ...ACCOUNT, DESTINATIONS[3], DESTINATIONS[4]].some(item => item.to !== '/' && pathname.startsWith(item.to))
  const moreRouteOpen = MORE.slice(1).some(item => pathname.startsWith(item.to))
  const [paletteOpen, setPaletteOpen] = useState(false)

  useEffect(() => {
    const onKey = event => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setPaletteOpen(open => !open) } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function openMenu(event) { trigger.current = event.currentTarget; dialog.current.showModal(); setMenuOpen(true) }
  function closeMenu() { dialog.current.close() }
  function restoreFocus() { setMenuOpen(false); trigger.current?.focus() }
  function toggleRail() {
    setRailExpanded(value => { const next = !(value ?? window.matchMedia('(min-width: 1280px)').matches); try { localStorage.setItem('bsd-navigation-expanded', JSON.stringify(next)) } catch { /* Storage can be unavailable; the rail still toggles. */ } return next })
  }

  return <>
    <aside className={`heritage-sidebar ${collapsed ? 'is-collapsed' : ''} ${expanded ? 'is-expanded' : ''}`} aria-label="Study desk sidebar">
      <div className="sidebar-brand"><BrandMark /><span className="brand-detail">Berean Study Desk</span></div>
      <button type="button" className="sidebar-search" onClick={() => setPaletteOpen(true)} aria-label="Search everything (Ctrl K)">
        <Search size={16} aria-hidden="true" /><span className="nav-label">Search everything</span><kbd className="nav-label">Ctrl K</kbd>
      </button>
      <nav aria-label="Main navigation" className="sidebar-destinations">
        {destinations.map(item => <NavigationLink key={item.to} item={item} />)}
      </nav>
      <div className="sidebar-footer">
        <h2 className="nav-group-label">More</h2>
        <NavigationLink item={MORE[0]} />
        <details className="sidebar-more" open={moreRouteOpen || undefined}>
          <summary className="nav-item"><ChevronDown size={20} aria-hidden="true" /><span className="nav-label">Tools &amp; pages</span></summary>
          {MORE.slice(1).map(item => <NavigationLink key={item.to} item={item} />)}
        </details>
        {account.map(item => <NavigationLink key={item.to} item={item} />)}
        <button type="button" className="nav-item" title="Resize navigation" aria-label="Expand or collapse navigation" onClick={toggleRail}>
          <PanelLeft size={20} aria-hidden="true" /><span className="nav-label">Collapse sidebar</span>
        </button>
      </div>
    </aside>

    <header className="heritage-header"><BrandMark size={28} /><span className="heritage-header-title">Berean Study Desk</span><button type="button" className="btn btn-icon heritage-header-search" aria-label="Search everything" onClick={() => setPaletteOpen(true)}><Search size={20} aria-hidden="true" /></button><AccountLink user={user} /></header>
    <nav className="heritage-bottom" aria-label="Phone navigation">
      <NavLink to="/" end><CalendarCheck size={22} aria-hidden="true" /><span>Today</span></NavLink>
      <NavLink to="/bible"><BookOpen size={22} aria-hidden="true" /><span>Bible</span></NavLink>
      <NavLink to="/checks?scan=1" className={({ isActive }) => `bottom-check${isActive ? ' active' : ''}`} aria-label="Doctrine Check: scan a book"><span className="bottom-check-disc"><ScanBarcode size={24} aria-hidden="true" /></span><span>Doctrine<br />Check</span></NavLink>
      <NavLink to="/notebook"><NotebookPen size={22} aria-hidden="true" /><span>Notes</span></NavLink>
      <button type="button" className={`${moreActive ? 'is-active' : ''} has-update-slot`} aria-label={unseenUpdate ? 'More destinations, new updates' : 'More destinations'} aria-haspopup="dialog" aria-expanded={menuOpen} onClick={openMenu}>
        <Menu size={22} aria-hidden="true" /><span>More</span>{unseenUpdate && <span className="nav-update-dot" aria-hidden="true" />}
      </button>
    </nav>
    <dialog ref={dialog} className="nav-sheet" aria-labelledby="navigation-title" onClose={restoreFocus}>
      <div className="flex items-center justify-between gap-4 mb-4"><h2 id="navigation-title" className="text-xl mb-0">More</h2><button type="button" className="btn btn-icon" aria-label="Close navigation" onClick={closeMenu}><X size={22} /></button></div>
      <nav aria-label="More destinations" className="flex flex-col gap-1">
        {[destinations[3], destinations[4], ...MORE].map(item => <NavigationLink key={item.to} item={item} onClick={closeMenu} />)}
        <hr className="nav-sheet-rule" />
        {account.map(item => <NavigationLink key={item.to} item={item} onClick={closeMenu} />)}
      </nav>
    </dialog>
    <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} pages={[...DESTINATIONS, ...MORE, ...ACCOUNT]} />
  </>
}
