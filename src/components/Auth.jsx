import { useState } from 'react'
import { supabase } from '../lib/supabase'
import Logo from './Logo'

export default function Auth() {
  const [googleLoading, setGoogleLoading] = useState(false)
  const [showEmail, setShowEmail] = useState(false)
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function handleGoogleSignIn() {
    setGoogleLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: { prompt: 'select_account' },
      },
    })
    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
    // On success, the browser redirects to Google — App.jsx's auth listener
    // picks up the new session when it comes back.
  }

  async function handleEmailSubmit(e) {
    e.preventDefault()
    setEmailLoading(true)
    setError('')
    setMessage('')

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setMessage('Check your email to confirm your account, then sign in.')
    }

    setEmailLoading(false)
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-bg">
      <div className="w-full max-w-[360px] px-6">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <Logo size={56} />
          </div>
          <h1 className="text-[28px] mb-1">Berean Study Desk</h1>
          <div className="text-accent uppercase" style={{ fontSize: 10, letterSpacing: '0.14em' }}>
            Acts 17:11
          </div>
        </div>

        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
        >
          {googleLoading ? 'Signing in…' : 'Sign in with Google'}
        </button>

        {error && (
          <div className="mt-3 rounded-md px-3 py-2 text-sm" style={{ background: 'var(--color-accent-100)', color: 'var(--color-accent-800)' }}>
            {error}
          </div>
        )}
        {message && (
          <div className="mt-3 rounded-md px-3 py-2 text-sm" style={{ background: 'var(--color-accent-2-100)', color: 'var(--color-accent-2-800)' }}>
            {message}
          </div>
        )}

        {!showEmail ? (
          <button type="button" className="btn btn-ghost btn-block mt-3" onClick={() => setShowEmail(true)}>
            Sign in with email &amp; password instead
          </button>
        ) : (
          <form onSubmit={handleEmailSubmit} className="mt-4 flex flex-col gap-3">
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-secondary btn-block" disabled={emailLoading}>
              {emailLoading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Sign up'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            >
              {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
