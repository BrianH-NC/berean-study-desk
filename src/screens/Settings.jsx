import { useState } from 'react'
import { useAuth } from '../App'
import { supabase } from '../lib/supabase'

export default function Settings() {
  const user = useAuth()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    // App.jsx's onAuthStateChange listener handles the redirect back to Auth.
  }

  return (
    <div className="max-w-[1180px] mx-auto" style={{ padding: '30px 40px 70px' }}>
      <h2>Settings</h2>
      <div className="flex flex-col gap-4 max-w-[420px]">
        <div className="card">
          <div className="card-title">Account</div>
          <div className="card-body">{user.email}</div>
          <button type="button" className="btn btn-secondary self-start" onClick={handleSignOut} disabled={signingOut}>
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
