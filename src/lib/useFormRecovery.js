import { useEffect, useEffectEvent, useRef, useState } from 'react'

// Drafts stay in this browser tab and are separated by account and form.
export function readRecovery(key) {
  try {
    const value = JSON.parse(sessionStorage.getItem(`bsd-draft:${key}`) || 'null')
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null
  } catch { return null }
}

export function useFormRecovery(key, value, restore, ready = true) {
  const session = useRef(null)
  const [error, setError] = useState('')
  const restoreDraft = useEffectEvent(restore)
  useEffect(() => {
    if (!ready) return
    const serialized = JSON.stringify(value)
    if (session.current?.key !== key) {
      session.current = { key, baseline: serialized, restoring: false }
      const saved = readRecovery(key)
      if (saved) {
        // Do not overwrite recovery with pre-hydration values under StrictMode.
        session.current.restoring = serialized
        restoreDraft(saved)
        return
      }
    }
    if (session.current.restoring === serialized) return
    session.current.restoring = false
    try {
      if (serialized === session.current.baseline) sessionStorage.removeItem(`bsd-draft:${key}`)
      else sessionStorage.setItem(`bsd-draft:${key}`, serialized)
      // Storage is an external system; failures must be visible to the writer.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError('')
    } catch {
      setError('Draft recovery is unavailable in this tab. Save before leaving.')
    }
  }, [key, value, ready])
  useEffect(() => {
    if (!error) return
    const warn = event => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [error])
  function clear(nextValue = value) {
    session.current = { key, baseline: JSON.stringify(nextValue), restoring: false }
    try { sessionStorage.removeItem(`bsd-draft:${key}`) } catch { /* The explicit save still succeeds. */ }
  }
  return { clear, error }
}
