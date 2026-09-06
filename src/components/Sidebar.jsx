import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  Home, LibraryBig, ShieldCheck, NotebookPen, Search, Tags, BookOpenText, BookText,
  Sun, Moon, Settings as SettingsIcon, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react'
import { useAuth } from '../App'
import { supabase } from '../lib/supabase'
import { getStoredTheme } from '../lib/theme'
import Logo from './Logo'

const NAV = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/shelf', label: 'My Library', icon: LibraryBig, matchPrefixes: ['/shelf'] },
  { to: '/checks', label: 'Doctrine Check', shortLabel: 'Checks', icon: ShieldCheck, matchPrefixes: ['/checks'] },
  { to: '/notebook', label: 'Notebook', icon: NotebookPen, matchPrefixes: ['/notebook'] },
  { to: '/bible', label: 'Bible Study', shortLabel: 'Bible', icon: BookText, matchPrefixes: ['/bible'] },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/topics', label: 'Topics', icon: Tags },
  { to: '/reading', label: 'Reading now', shortLabel: 'Reading', icon: BookOpenText, matchPrefixes: ['/reading'] },
]

const RAIL_WIDTH = 230
const RAIL_WIDTH_COLLAPSED = 64

function getInitialMode() {
  const stored = localStorage.getItem('bsd-mode')
  if (stored === 'dark' || stored === 'light') return stored
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getInitialCollapsed() {
  return localStorage.getItem('bsd-sidebar-collapsed') === 'true'
}

export default function Sidebar() {
  const user = useAuth()
  const location = useLocation()
  const [mode, setMode] = useState(getInitialMode)
  const [collapsed, setCollapsed] = useState(getInitialCollapsed)
  const [hovering, setHovering] = useState(false)
  const [bookCount, setBookCount] = useState(null)
  const [checksCount, setChecksCount] = useState(null)
  const [entriesCount, setEntriesCount] = useState(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-mode', mode)
    localStorage.setItem('bsd-mode', mode)
  }, [mode])

  // The theme itself only ever changes from Settings, which applies it (and
  // the DOM attribute) directly -- this just makes sure whatever was last
  // chosen is still attached to <html> on a fresh load, since Sidebar (not
  // Settings) is the chrome that's guaranteed to mount on every page.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', getStoredTheme())
  }, [])

  useEffect(() => {
    let cancelled = false
    supabase
      .from('books')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .then(({ count }) => {
        if (!cancelled) setBookCount(count ?? null)
      })
    // theology_checks is shared (no user_id), so its count isn't scoped per-user.
    supabase
      .from('theology_checks')
      .select('id', { count: 'exact', head: true })
      .then(({ count }) => {
        if (!cancelled) setChecksCount(count ?? null)
      })
    supabase
      .from('entries')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .then(({ count }) => {
        if (!cancelled) setEntriesCount(count ?? null)
      })
    return () => {
      cancelled = true
    }
  }, [user.id])

  function isActive(item) {
    if (item.matchPrefixes) {
      return item.matchPrefixes.some((p) => location.pathname.startsWith(p))
    }
    return item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
  }

  function countFor(item) {
    return item.to === '/shelf' ? bookCount : item.to === '/checks' ? checksCount : item.to === '/notebook' ? entriesCount : null
  }

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('bsd-sidebar-collapsed', String(next))
      return next
    })
  }

  // Reserve the small icon-only width in the page's actual layout at all
  // times while collapsed, so hovering to peek the full rail overlays the
  // page (sliding out on top of it) instead of shoving content sideways.
  const expanded = !collapsed || hovering

  return (
    <>
      {/* Desktop: persistent left rail */}
      <aside
        className="hidden md:block shrink-0 h-dvh sticky top-0"
        style={{ width: collapsed ? RAIL_WIDTH_COLLAPSED : RAIL_WIDTH }}
        onMouseEnter={() => collapsed && setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <div
          className="flex flex-col h-full bg-surface"
          style={{
            width: expanded ? RAIL_WIDTH : RAIL_WIDTH_COLLAPSED,
            position: collapsed && hovering ? 'absolute' : 'relative',
            top: 0,
            left: 0,
            zIndex: 30,
            boxShadow: collapsed && hovering ? '4px 0 20px rgba(0,0,0,0.18)' : 'none',
            transition: 'width 0.15s ease',
          }}
        >
          <div className="px-4 pt-6 pb-4 flex items-center gap-2" style={{ justifyContent: expanded ? 'flex-start' : 'center' }}>
            <Logo size={24} />
            {expanded && (
              <div style={{ overflow: 'hidden' }}>
                {/* 230px rail minus px-4 padding leaves 198px for icon+gap+text --
                    18px (the old size) doesn't fit next to the icon without
                    clipping; 16px matches the mobile header's size and leaves
                    headroom. */}
                <div className="font-heading whitespace-nowrap" style={{ fontSize: 16 }}>
                  Berean Study Desk
                </div>
                <div className="text-accent uppercase mt-1 whitespace-nowrap" style={{ fontSize: 10, letterSpacing: '0.14em' }}>
                  Acts 17:11
                </div>
              </div>
            )}
          </div>

          <nav className="flex-1 flex flex-col gap-0.5 overflow-y-auto overflow-x-hidden">
            {NAV.map((item) => {
              const active = isActive(item)
              const Icon = item.icon
              const count = countFor(item)
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className="flex items-center rounded-full font-body"
                  title={expanded ? undefined : item.label}
                  style={{
                    gap: 11,
                    margin: expanded ? '0 12px' : '0 14px',
                    padding: expanded ? '9px 16px' : '9px 0',
                    justifyContent: expanded ? 'flex-start' : 'center',
                    fontSize: 14,
                    background: active ? 'var(--color-accent)' : 'transparent',
                    color: active ? 'var(--color-bg)' : 'var(--color-text)',
                  }}
                >
                  <Icon size={16} strokeWidth={2.75} style={{ flexShrink: 0 }} />
                  {expanded && (
                    <>
                      <span className="flex-1 whitespace-nowrap">{item.label}</span>
                      {count != null && <span style={{ opacity: 0.55, fontSize: 12 }}>{count}</span>}
                    </>
                  )}
                </NavLink>
              )
            })}
          </nav>

          <div className="px-4 pb-6 pt-2 flex flex-col gap-2" style={{ alignItems: expanded ? 'stretch' : 'center' }}>
            {expanded && (
              <div className="card !gap-1" style={{ padding: '10px 13px' }}>
                <span className="card-meta">Baptist Faith &amp; Message 2000 · ESV</span>
              </div>
            )}

            <div className="seg self-start" style={expanded ? undefined : { alignSelf: 'center' }}>
              <button
                type="button"
                className="seg-opt"
                style={mode === 'light' ? { background: 'var(--color-accent)', color: 'var(--color-bg)' } : undefined}
                onClick={() => setMode('light')}
                aria-label="Day mode"
              >
                <Sun size={14} strokeWidth={2.75} />
              </button>
              <button
                type="button"
                className="seg-opt"
                style={mode === 'dark' ? { background: 'var(--color-accent)', color: 'var(--color-bg)' } : undefined}
                onClick={() => setMode('dark')}
                aria-label="Evening mode"
              >
                <Moon size={14} strokeWidth={2.75} />
              </button>
            </div>

            <NavLink to="/settings" className="btn btn-ghost self-start !px-0" style={expanded ? undefined : { alignSelf: 'center', padding: 0 }} title={expanded ? undefined : 'Settings'}>
              <SettingsIcon size={15} strokeWidth={2.75} />
              {expanded && 'Settings'}
            </NavLink>

            <button
              type="button"
              className="btn btn-ghost self-start !px-0"
              style={expanded ? undefined : { alignSelf: 'center', padding: 0 }}
              onClick={toggleCollapsed}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <PanelLeftOpen size={15} strokeWidth={2.75} /> : <PanelLeftClose size={15} strokeWidth={2.75} />}
              {expanded && (collapsed ? 'Expand' : 'Collapse')}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile: compact top bar + fixed bottom tab bar */}
      <div className="md:hidden sticky top-0 z-20 flex items-center justify-between bg-surface px-4 py-3">
        <div className="flex items-center gap-2">
          <Logo size={26} />
          <div className="font-heading" style={{ fontSize: 16 }}>
            Berean Study Desk
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="btn btn-icon btn-ghost"
            onClick={() => setMode(mode === 'light' ? 'dark' : 'light')}
            aria-label="Toggle Day/Evening mode"
          >
            {mode === 'light' ? <Moon size={16} strokeWidth={2.75} /> : <Sun size={16} strokeWidth={2.75} />}
          </button>
          <NavLink to="/settings" className="btn btn-icon btn-ghost" aria-label="Settings">
            <SettingsIcon size={16} strokeWidth={2.75} />
          </NavLink>
        </div>
      </div>

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-20 flex bg-surface"
        style={{ borderTop: '1px solid var(--color-divider)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {NAV.map((item) => {
          const active = isActive(item)
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className="flex-1 flex flex-col items-center gap-0.5 py-2"
              style={{ color: active ? 'var(--color-accent)' : 'var(--color-text)' }}
            >
              <Icon size={19} strokeWidth={2.75} />
              <span style={{ fontSize: 9.5, opacity: active ? 1 : 0.7 }}>{item.shortLabel || item.label}</span>
            </NavLink>
          )
        })}
      </nav>
    </>
  )
}
