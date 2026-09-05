import { useState } from 'react'
import { Check } from 'lucide-react'
import { useAuth } from '../App'
import { supabase } from '../lib/supabase'
import { THEMES, getStoredTheme, applyTheme } from '../lib/theme'

export default function Settings() {
  const user = useAuth()
  const [signingOut, setSigningOut] = useState(false)
  const [displayName, setDisplayName] = useState(user.user_metadata?.display_name || '')
  const [savingName, setSavingName] = useState(false)
  const [theme, setTheme] = useState(getStoredTheme)

  function handlePickTheme(id) {
    setTheme(id)
    applyTheme(id)
  }

  async function handleSignOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    // App.jsx's onAuthStateChange listener handles the redirect back to Auth.
  }

  async function handleSaveName(e) {
    e.preventDefault()
    setSavingName(true)
    try {
      const { error } = await supabase.auth.updateUser({ data: { display_name: displayName.trim() } })
      if (error) throw error
      // updateUser triggers onAuthStateChange, which refreshes the app-wide
      // user object App.jsx hands down via useAuth() -- no extra state needed.
    } catch (err) {
      alert('Error saving: ' + err.message)
    } finally {
      setSavingName(false)
    }
  }

  return (
    <div className="max-w-[1180px] mx-auto page">
      <h2>Settings</h2>
      <div className="flex flex-col gap-4 max-w-[640px]">
        <div className="card">
          <div className="card-title">Account</div>
          <div className="card-body">{user.email}</div>
          <form onSubmit={handleSaveName} className="flex gap-2 items-end mt-1">
            <div className="field flex-1">
              <label htmlFor="display-name">What should I call you?</label>
              <input
                id="display-name"
                className="input"
                placeholder="Your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-secondary" disabled={savingName}>
              {savingName ? 'Saving…' : 'Save'}
            </button>
          </form>
          <button type="button" className="btn btn-secondary self-start mt-2" onClick={handleSignOut} disabled={signingOut}>
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>

        <div className="card">
          <div className="card-title mb-1">Appearance</div>
          <div className="card-body mb-2">Pick a color theme — Day/Evening mode still works the same on top of whichever one you choose.</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                className="flex flex-col gap-2 items-start text-left rounded-card"
                style={{
                  padding: '11px 13px',
                  border: theme === t.id ? '2px solid var(--color-text)' : '1px solid var(--color-divider)',
                  background: 'var(--color-surface)',
                }}
                onClick={() => handlePickTheme(t.id)}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex gap-1">
                    <span className="rounded-full shrink-0" style={{ width: 16, height: 16, background: t.bg, border: '1px solid var(--color-divider)' }} />
                    <span className="rounded-full shrink-0" style={{ width: 16, height: 16, background: t.accent }} />
                    <span className="rounded-full shrink-0" style={{ width: 16, height: 16, background: t.accent2 }} />
                  </div>
                  {theme === t.id && <Check size={14} strokeWidth={3} style={{ color: 'var(--color-accent)' }} />}
                </div>
                <div>
                  <div className="card-title !text-[13.5px]">{t.name}</div>
                  <div className="card-meta">{t.blurb}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-title">Licenses</div>
          <div className="card-body mb-2">
            Scripture quotations marked ESV are from the ESV® Bible (The Holy Bible, English Standard Version®),
            copyright © 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission. All
            rights reserved.
          </div>
          <div className="card-body">
            Scripture quotations marked BSB are from The Holy Bible, Berean Standard Bible (BSB), which was placed
            into the public domain on April 30, 2023 by the Berean Bible Translation Committee. No permission is
            required for its use.
          </div>
        </div>
      </div>
    </div>
  )
}
