export const MAX_BOOK_BYTES = 50 * 1024 * 1024

export function bookFileFormat(file) {
  const format = file.name?.split('.').pop()?.toLowerCase()
  if (!['pdf', 'epub'].includes(format)) throw new Error('Choose a PDF or EPUB file.')
  if (!file.size || file.size > MAX_BOOK_BYTES) throw new Error('Choose a file between 1 byte and 50 MB.')
  return format
}

export function normalizeReaderLocation(format, value) {
  if (format === 'pdf') {
    const page = Number(value?.page)
    return Number.isInteger(page) && page > 0 ? { page } : null
  }
  if (format !== 'epub') return null
  const cfi = value?.cfi
  return typeof cfi === 'string' && cfi.startsWith('epubcfi(') && cfi.endsWith(')') && cfi.length < 4000 ? { cfi } : null
}

// Serialize writes: a slow older request must not overwrite a newer position.
export function createPositionWriter(save, report = () => {}) {
  let pending = null, running = false
  async function drain() {
    if (running) return
    running = true
    try {
      while (pending) {
        const value = pending
        pending = null
        try { await save(value); report(null) } catch (error) { report(error) }
      }
    } finally { running = false }
  }
  return value => { pending = value; void drain() }
}
