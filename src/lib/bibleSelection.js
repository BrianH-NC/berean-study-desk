export const bibleSelectionKey = userId => `bsd:bible-selection:${userId}`

export function restoreBibleSelection(storage, userId, preferences) {
  let saved
  try { saved = JSON.parse(storage?.getItem(bibleSelectionKey(userId)) || 'null') } catch { /* Use account defaults if storage is unavailable or damaged. */ }
  const translation = preferences.enabled.includes(saved?.translation) ? saved.translation : preferences.translation
  const compare = Array.isArray(saved?.compare) ? saved.compare : preferences.compare
  return {
    translation,
    compare: [...new Set(compare)].filter(id => preferences.enabled.includes(id) && id !== translation),
    parallel: typeof saved?.parallel === 'boolean' ? saved.parallel : preferences.parallel,
  }
}

export function saveBibleSelection(storage, userId, selection) {
  try { storage.setItem(bibleSelectionKey(userId), JSON.stringify(selection)); return true } catch { return false }
}
