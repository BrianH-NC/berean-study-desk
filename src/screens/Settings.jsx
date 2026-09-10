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
    <div className="max-w-[1180px] mx-auto page">
      <h2>Settings</h2>
      <div className="flex flex-col gap-4 max-w-[640px]">
        <div className="card" id="account">
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

        <section className="card" aria-labelledby="about-heading">
          <h3 id="about-heading" className="card-title">About Berean Study Desk</h3>
          <p className="card-body">Search. Study. Discern. · Acts 17:11</p>
          <p className="card-body">AI is advisory. Scripture and the leading of the Holy Spirit are the final authority.</p>
        </section>

        <div className="card">
          <div className="card-title">Licenses</div>
          <div className="card-body mb-2">
            Scripture quotations marked ESV — including wherever ESV is selected as the Bible Study reading
            translation or shown in the comparison panel — are from the ESV® Bible (The Holy Bible, English Standard
            Version®), copyright © 2001 by Crossway, a publishing ministry of Good News Publishers. Used by
            permission. All rights reserved.
          </div>
          <div className="card-body mb-2">
            Scripture quotations marked BSB are from The Holy Bible, Berean Standard Bible (BSB), which was placed
            into the public domain on April 30, 2023 by the Berean Bible Translation Committee. No permission is
            required for its use.
          </div>
          <div className="card-body mb-2">
            Scripture quotations marked NIV are taken from the Holy Bible, New International Version®, NIV®.
            Copyright © 1973, 1978, 1984, 2011 by Biblica, Inc.™ Used by permission of Biblica, Inc.® All rights
            reserved worldwide.
          </div>
          <div className="card-body mb-2">
            Scripture quotations marked NLT are taken from the Holy Bible, New Living Translation, copyright © 1996,
            2004, 2015 by Tyndale House Foundation. Used by permission of Tyndale House Publishers, Inc., Carol
            Stream, Illinois 60188. All rights reserved.
          </div>
          <div className="card-body mb-2">
            Scripture quotations marked CSB have been taken from the Christian Standard Bible®, copyright © 2017 by
            Holman Bible Publishers. Used by permission. Christian Standard Bible® and CSB® are federally registered
            trademarks of Holman Bible Publishers. NIV, NLT, and CSB text is served live through{' '}
            <a href="https://scripture.api.bible" target="_blank" rel="noopener noreferrer">
              API.Bible
            </a>
            .
          </div>
          <div className="card-body">
            Bible commentary and cross-reference data in Bible Study is provided live by the{' '}
            <a href="https://bible.helloao.org" target="_blank" rel="noopener noreferrer">
              Free Use Bible API
            </a>{' '}
            (AO Lab). Commentaries (Matthew Henry, John Calvin, John Gill, Adam Clarke, Jamieson-Fausset-Brown,
            Keil-Delitzsch, Tyndale) are classic public-domain works. Cross-reference data is from{' '}
            <a href="https://www.openbible.info/labs/cross-references/" target="_blank" rel="noopener noreferrer">
              OpenBible.info
            </a>
            , licensed under CC BY 4.0. The reading pane's and comparison panel's other translation options (King
            James Version, American Standard Version, World English Bible, Darby, Young's Literal Translation,
            Douay-Rheims) use public-domain and freely-licensed texts distributed via eBible.org, also served through
            the Free Use Bible API.
          </div>
        </div>
      </div>
    </div>
  )
}
