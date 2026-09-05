import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  Home, LibraryBig, ShieldCheck, NotebookPen, Search, Tags, BookOpenText,
  Sun, Moon, Settings as SettingsIcon,
} from 'lucide-react'
import { useAuth } from '../App'
import { supabase } from '../lib/supabase'
import { getStoredTheme } from '../lib/theme'

const NAV = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/shelf', label: 'Shelf', icon: LibraryBig, matchPrefixes: ['/shelf'] },
  { to: '/checks', label: 'Doctrine Check', shortLabel: 'Checks', icon: ShieldCheck, matchPrefixes: ['/checks'] },
  { to: '/notebook', label: 'Notebook', icon: NotebookPen, matchPrefixes: ['/notebook'] },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/topics', label: 'Topics', icon: Tags },
  { to: '/reading', label: 'Reading now', shortLabel: 'Reading', icon: BookOpenText, matchPrefixes: ['/reading'] },
]

function getInitialMode() {
  const stored = localStorage.getItem('bsd-mode')
  if (stored === 'dark' || stored === 'light') return stored
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function Sidebar() {
  const user = useAuth()
  const location = useLocation()
  const [mode, setMode] = useState(getInitialMode)
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

  return (
    <>
      {/* Desktop: persistent left rail */}
      <aside className="hidden md:flex shrink-0 h-dvh sticky top-0 flex-col bg-surface" style={{ width: 230 }}>
        <div className="px-4 pt-6 pb-4">
          <div className="font-heading whitespace-nowrap" style={{ fontSize: 18 }}>
            Berean Study Desk
          </div>
          <div className="text-accent uppercase mt-1" style={{ fontSize: 10, letterSpacing: '0.14em' }}>
            Acts 17:11
          </div>
        </div>

        <nav className="flex-1 flex flex-col gap-0.5 overflow-y-auto">
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
                style={{
                  gap: 11,
                  margin: '0 12px',
                  padding: '9px 16px',
                  fontSize: 14,
                  background: active ? 'var(--color-accent)' : 'transparent',
                  color: active ? 'var(--color-bg)' : 'var(--color-text)',
                }}
              >
                <Icon size={16} strokeWidth={2.75} />
                <span className="flex-1">{item.label}</span>
                {count != null && <span style={{ opacity: 0.55, fontSize: 12 }}>{count}</span>}
              </NavLink>
            )
          })}
        </nav>

        <div className="px-4 pb-6 pt-2 flex flex-col gap-2">
          <div className="card !gap-1" style={{ padding: '10px 13px' }}>
            <span className="card-meta">Baptist Faith &amp; Message 2000 · ESV</span>
          </div>

          <div className="seg self-start">
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

          <NavLink to="/settings" className="btn btn-ghost self-start !px-0">
            <SettingsIcon size={15} strokeWidth={2.75} />
            Settings
          </NavLink>
        </div>
      </aside>

      {/* Mobile: compact top bar + fixed bottom tab bar */}
      <div className="md:hidden sticky top-0 z-20 flex items-center justify-between bg-surface px-4 py-3">
        <div className="font-heading" style={{ fontSize: 16 }}>
          Berean Study Desk
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
