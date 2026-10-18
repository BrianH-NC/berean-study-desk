const KEY = 'bsd-sign-in-destination'
export function safeDestination(path) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//') || /[\\\r\n]/.test(path)) return '/'
  return path
}
export function rememberDestination(path) {
  try { sessionStorage.setItem(KEY, JSON.stringify({ path:safeDestination(path), at:Date.now() })) } catch { /* Sign-in remains available. */ }
}
export function takeDestination() {
  try {
    const saved=JSON.parse(sessionStorage.getItem(KEY)||'null')
    sessionStorage.removeItem(KEY)
    return saved && Date.now()-saved.at < 3600000 ? safeDestination(saved.path) : '/'
  } catch { return '/' }
}
