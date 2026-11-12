import AccountLink from './AccountLink'
import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Home, Search, BookText, LibraryBig, ShieldCheck, NotebookPen, Tags, BookOpenText, Settings, Menu, X, PanelLeft, Mic, CalendarDays, Layers, Quote, Heart, RotateCcw, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { APP_VERSION, hasUnseenUpdate } from '../lib/changelog'
import Logo, { BrandLockup } from './Logo'

// Preserve existing durable URLs and working destinations during the redesign.
const PRIMARY = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/bible', label: 'Bible Study', icon: BookText },
  { to: '/shelf', label: 'Library', icon: LibraryBig },
]
const SECONDARY = [
  { to: '/study-tools', label: 'Review & Study Tools', icon: RotateCcw },
  { to: '/study-sessions', label: 'Saved Study Sessions', icon: Layers },
  { to: '/checks', label: 'Doctrine Check', icon: ShieldCheck },
  { to: '/notebook', label: 'Notes', icon: NotebookPen },
  { to: '/sermons', label: 'Sermons', icon: Mic },
  { to: '/topics', label: 'Topics', icon: Tags },
  { to: '/reading', label: 'Reading now', icon: BookOpenText },
  { to: '/reading-plans', label: 'Reading Plans', icon: CalendarDays },
  { to: '/quotations', label: 'Quotations', icon: Quote },
  { to: '/prayer', label: 'Prayer Journal', icon: Heart },
]
const ACCOUNT = [
  { to: '/whats-new', label: 'What’s New', icon: Sparkles, version: APP_VERSION },
  { to: '/settings', label: 'Settings', icon: Settings },
]

const GROUPS = [
  {label:'Study',paths:['/bible','/notebook','/study-sessions','/sermons','/topics','/checks']},
  {label:'Library',paths:['/shelf','/reading','/quotations']},
  {label:'Daily practice',paths:['/reading-plans','/prayer','/study-tools']},
].map(group=>({...group,items:group.paths.map(path=>[...PRIMARY,...SECONDARY].find(item=>item.to===path))}))

function NavigationLink({ item, onClick }) {
  const Icon = item.icon
  const label = [item.label, item.version && `version ${item.version}`, item.unseen && 'new updates'].filter(Boolean).join(', ')
  return <NavLink to={item.to} end={item.end} onClick={onClick} className={`nav-item${item.unseen ? ' has-update' : ''}`} title={item.version ? `${item.label} · v${item.version}` : item.label} aria-label={label}>
    <Icon size={22} aria-hidden="true" /><span className="nav-label">{item.label}{item.count!=null&&<small className="ml-2 opacity-70">{item.count}</small>}{item.version&&<small className="nav-version">v{item.version}</small>}</span>
    {item.unseen && <span className="nav-update-dot" aria-hidden="true" />}
  </NavLink>
}

export default function Sidebar({user}) {
  const { pathname } = useLocation()
  const [sermonCount,setSermonCount]=useState(null)
  useEffect(()=>{let active=true;const refresh=()=>supabase.from('sermons').select('id',{count:'exact',head:true}).eq('user_id',user.id).then(({count,error})=>{if(active)setSermonCount(error?null:count)});refresh();window.addEventListener('sermons-changed',refresh);return()=>{active=false;window.removeEventListener('sermons-changed',refresh)}},[user.id])
  const [unseenUpdate,setUnseenUpdate]=useState(()=>{try{return hasUnseenUpdate(window.localStorage,user.id)}catch{return false}})
  useEffect(()=>{const seen=()=>setUnseenUpdate(false);window.addEventListener('whats-new-seen',seen);return()=>window.removeEventListener('whats-new-seen',seen)},[])
  const account = ACCOUNT.map(item=>item.to==='/whats-new'?{...item,unseen:unseenUpdate}:item)
  const dialog = useRef(null)
  const trigger = useRef(null)
  const [railExpanded, setRailExpanded] = useState(()=>{try{return JSON.parse(localStorage.getItem('bsd-navigation-expanded')||'null')}catch{return null}})
  const expanded = railExpanded === true
  const collapsed = railExpanded === false
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
    setRailExpanded(value => {const next=!(value ?? window.matchMedia('(min-width: 1280px)').matches);try{localStorage.setItem('bsd-navigation-expanded',JSON.stringify(next))}catch{}return next})
  }

  return <>
    <aside className={`heritage-sidebar ${collapsed ? 'is-collapsed' : ''} ${expanded ? 'is-expanded' : ''}`} aria-label="Study desk sidebar">
      <div className="flex flex-col items-center gap-3">
        <Logo size={40} />
        <div className="brand-detail text-center"><BrandLockup /><p className="font-ui text-xs mt-3 mb-0 text-gold">Search. Study. Discern.</p><p className="font-ui text-xs mb-0">Acts 17:11</p></div>
      </div>
      <nav aria-label="Main navigation" className="sidebar-destinations">
        {PRIMARY.slice(0,2).map(item=><NavigationLink key={item.to} item={item}/>)}{GROUPS.map(group=><section className="nav-group" key={group.label} aria-label={group.label}><h2 className="nav-group-label">{group.label}</h2>{group.items.map(item=><NavigationLink key={item.to} item={{...item,count:item.to==='/sermons'?sermonCount:null}}/>)}</section>)}
      </nav>
      <div className="sidebar-footer">
        {account.map(item => <NavigationLink key={item.to} item={item} />)}
        <button type="button" className="nav-item" title="Resize navigation" aria-label="Expand or collapse navigation" onClick={toggleRail}>
          <PanelLeft size={22} aria-hidden="true" /><span className="nav-label">Resize navigation</span>
        </button>
      </div>
    </aside>

    <header className="heritage-header"><Logo size={32} /><span className="font-heading text-sm">Berean Study Desk</span><AccountLink user={user}/></header>
    <nav className="heritage-bottom" aria-label="Phone navigation">
      {PRIMARY.map(item => {
        const Icon = item.icon
        return <NavLink key={item.to} to={item.to} end={item.end}><Icon size={22} aria-hidden="true" /><span>{item.label}{item.count!=null&&<small className="ml-2 opacity-70">{item.count}</small>}</span></NavLink>
      })}
      <button type="button" className={`${moreActive ? 'is-active' : ''} has-update-slot`} aria-label={unseenUpdate?'More destinations, new updates':'More destinations'} aria-haspopup="dialog" aria-expanded={menuOpen} onClick={openMenu}>
        <Menu size={22} aria-hidden="true" /><span>More</span>{unseenUpdate&&<span className="nav-update-dot" aria-hidden="true"/>}
      </button>
    </nav>
    <dialog ref={dialog} className="nav-sheet" aria-labelledby="navigation-title" onClose={restoreFocus}>
      <div className="flex items-center justify-between gap-4 mb-4"><h2 id="navigation-title" className="text-xl mb-0">Your study desk</h2><button type="button" className="btn btn-icon" aria-label="Close navigation" onClick={closeMenu}><X size={22} /></button></div>
      <nav aria-label="More destinations" className="flex flex-col gap-1">{GROUPS.map(group=><section className="nav-group" key={group.label}><h2 className="nav-group-label">{group.label}</h2>{group.items.map(item=><NavigationLink key={item.to} item={item} onClick={closeMenu}/>)}</section>)}{account.map(item=><NavigationLink key={item.to} item={item} onClick={closeMenu}/>)}</nav>
    </dialog>
  </>
}
