// Clear obsolete appearance preferences; storage can be unavailable in private browsers.
export function initializeTheme() {
  document.documentElement.removeAttribute('data-theme')
  document.documentElement.removeAttribute('data-mode')
  try {
    localStorage.removeItem('bsd-theme')
    localStorage.removeItem('bsd-mode')
  } catch { /* The light baseline does not depend on browser storage. */ }
}
