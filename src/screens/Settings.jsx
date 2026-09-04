import { useState } from 'react'
import { useAuth } from '../App'
import { supabase } from '../lib/supabase'

export default function Settings() {
  const user = useAuth()
  const [signingOut, setSigningOut] = useState(false)
  const [displayName, setDisplayName] = useState(user.user_metadata?.display_name || '')
  const [savingName, setSavingName] = useState(false)

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
    <div className="max-w-[1180px] mx-auto" style={{ padding: '30px 40px 70px' }}>
      <h2>Settings</h2>
      <div className="flex flex-col gap-4 max-w-[420px]">
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
          <div className="card-title">Licenses</div>
          <div className="card-body">
            Scripture quotations marked ESV are from the ESV® Bible (The Holy Bible, English Standard Version®),
            copyright © 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission. All
            rights reserved.
          </div>
        </div>
      </div>
    </div>
  )
}
