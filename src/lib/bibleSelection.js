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

// The last passage open in Bible Study, kept apart from the translation
// choices so each is saved by its own effect without overwriting the other.
export const biblePassageKey = userId => `bsd:bible-passage:${userId}`
export const DEFAULT_PASSAGE = { book: 'John', chapter: 3, verseRange: null }

export function restoreBiblePassage(storage, userId, books) {
  let saved
  try { saved = JSON.parse(storage?.getItem(biblePassageKey(userId)) || 'null') } catch { /* Fall back to the default passage. */ }
  const chapter = Number(saved?.chapter)
  if (!books.includes(saved?.book) || !Number.isInteger(chapter) || chapter < 1) return DEFAULT_PASSAGE
  const start = Number(saved.verseRange?.start), end = Number(saved.verseRange?.end)
  const verseRange = Number.isInteger(start) && Number.isInteger(end) && start >= 1 && end >= start ? { start, end } : null
  return { book: saved.book, chapter, verseRange }
}

export function saveBiblePassage(storage, userId, passage) {
  try { storage.setItem(biblePassageKey(userId), JSON.stringify(passage)); return true } catch { return false }
}
