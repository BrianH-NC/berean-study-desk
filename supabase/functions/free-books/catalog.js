export const MAX_BOOK_BYTES = 50 * 1024 * 1024
const PG = 'https://www.gutenberg.org'
const CCEL = 'https://www.ccel.org'
const MIRROR = 'https://gutenberg.pglaf.org'
const text = node => node?.textContent?.replace(/\s+/g, ' ').trim() || ''

export function sourcePage(source, id) {
  if (source === 'gutenberg' && /^[1-9]\d{0,6}$/.test(id)) return `${PG}/ebooks/${id}`
  if (source === 'ccel' && /^[a-z0-9_-]+\.[a-z0-9_-]+$/i.test(id) && id.length < 160) return `${CCEL}/ccel/${id.replace('.', '/')}.html`
  throw new Error('Invalid book identifier.')
}

export function safeSourceUrl(value, base) {
  const url = new URL(value, base)
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !['www.gutenberg.org', 'gutenberg.pglaf.org', 'www.ccel.org', 'ccel.org', 'staticccel.org'].includes(url.hostname)) throw new Error('Unsupported source address.')
  return url.href
}

export function parseGutenbergSearch(xml, parse) {
  const doc = parse(xml, 'text/xml')
  const results = [...doc.querySelectorAll('entry')].flatMap(entry => {
    const id = text(entry.querySelector('id')).match(/\/ebooks\/(\d+)\.opds$/)?.[1]
    return id ? [{ source: 'gutenberg', id, title: text(entry.querySelector('title')), author: text(entry.querySelector('content')), url: sourcePage('gutenberg', id), cover: `${MIRROR}/cache/epub/${id}/pg${id}.cover.small.jpg` }] : []
  })
  return { results, hasNext: !!doc.querySelector('feed > link[rel="next"]') }
}

export function parseGutenbergBook(xml, id, parse) {
  const doc = parse(xml, 'text/xml')
  const entries = [...doc.querySelectorAll('entry')]
  const entry = entries.find(item => item.querySelector('link[type="application/epub+zip"]')) || entries[0]
  if (!entry) throw new Error('Book details are unavailable.')
  const rights = text(entry.querySelector('rights'))
  const formats = []
  // Only import editions explicitly listed as US public domain by Gutenberg.
  if (/^public domain in the usa\.?$/i.test(rights)) {
    const epub = [...doc.querySelectorAll('link[type="application/epub+zip"]')].find(link => link.getAttribute('href')?.endsWith('.epub.images')) || doc.querySelector('link[type="application/epub+zip"]')
    if (epub) {
      const href = epub.getAttribute('href') || ''
      const suffix = href.endsWith('.epub.noimages') ? '' : href.endsWith('.epub3.images') ? '-images-3' : '-images'
      formats.push({ format: 'epub', url: `${MIRROR}/cache/epub/${id}/pg${id}${suffix}.epub` })
    }
  }
  const descriptionDoc = parse(`<html><body>${text(entry.querySelector('content'))}</body></html>`, 'text/html')
  return { source: 'gutenberg', id, title: text(entry.querySelector('title')), author: [...entry.querySelectorAll('author name')].map(text).join('; '), description: text(descriptionDoc.querySelector('body')).slice(0, 1500), rights, url: sourcePage('gutenberg', id), cover: `${MIRROR}/cache/epub/${id}/pg${id}.cover.medium.jpg`, formats }
}

export function parseCcelIndex(html, parse) {
  const doc = parse(html, 'text/html'), books = new Map()
  for (const group of doc.querySelectorAll('.author_bookList')) {
    const authorId = group.id.replace('author_bookList_', '')
    const author = text(doc.getElementById(`author_link_${authorId}`)).replace(/\s*\(\d+ classics\)$/, '')
    for (const link of group.querySelectorAll('a[href]')) {
      let url
      try { url = new URL(link.getAttribute('href'), CCEL) } catch { continue }
      if (!['ccel.org', 'www.ccel.org'].includes(url.hostname)) continue
      const match = url.pathname.match(/^\/ccel\/([a-z0-9_-]+)\/([a-z0-9_-]+)(?:\.html)?$/i)
      if (!match) continue
      const id = `${match[1]}.${match[2]}`
      if (!books.has(id)) books.set(id, { source: 'ccel', id, title: text(link), author, url: sourcePage('ccel', id), cover: null })
    }
  }
  if (!books.size) throw new Error('CCEL catalog is temporarily unavailable.')
  return [...books.values()]
}

export function parseCcelBook(html, id, parse) {
  const url = sourcePage('ccel', id), doc = parse(html, 'text/html')
  const title = text(doc.querySelector('#titlewrapper h1'))
  if (!title) throw new Error('CCEL book details are unavailable. Open the source page to check access.')
  const formats = []
  for (const link of doc.querySelectorAll('a[href]')) {
    let href
    try { href = safeSourceUrl(link.getAttribute('href'), url) } catch { continue }
    const parsed = new URL(href), format = parsed.pathname.match(/\.(pdf|epub)$/i)?.[1].toLowerCase()
    if (!format || !['ccel.org', 'www.ccel.org', 'staticccel.org'].includes(parsed.hostname) || !parsed.pathname.startsWith('/ccel/') || formats.some(item => item.format === format)) continue
    formats.push({ format, url: href })
  }
  let cover = null
  try { const src = doc.querySelector('.book-info-cover')?.getAttribute('src'); if (src) cover = safeSourceUrl(src, url) } catch { /* A cover is optional. */ }
  return { source: 'ccel', id, title, author: text(doc.querySelector('#titlewrapper h3')).replace(/^by\s+/i, ''), description: text(doc.querySelector('.bookinfo_description')).slice(0, 1500), rights: 'CCEL permits personal, educational and non-profit use. Individual editions may carry additional terms; see the source page.', url, cover, formats }
}

export async function readLimited(response, limit) {
  if (Number(response.headers.get('content-length')) > limit) { await response.body?.cancel(); throw new Error('This file is too large to import (50 MB maximum).') }
  const reader = response.body?.getReader()
  if (!reader) throw new Error('The source returned an empty response.')
  const chunks = []; let length = 0
  try {
    while (true) { const { done, value } = await reader.read(); if (done) break; length += value.length; if (length > limit) throw new Error('The source response exceeds the size limit.'); chunks.push(value) }
  } catch (error) { await reader.cancel(); throw error }
  const bytes = new Uint8Array(length); let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
  return bytes
}

export function validateDownload(bytes, format) {
  if (format === 'pdf' ? new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-' : bytes[0] !== 80 || bytes[1] !== 75) throw new Error('The source did not provide a readable book file. It may require sign-in; open the source page instead.')
}
