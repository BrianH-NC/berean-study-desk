import { useEffect, useRef, useState } from 'react'
import ePub from 'epubjs'
import DOMPurify from 'dompurify'
import { highlightColors } from '../lib/bookAnnotations'
import ReaderPageControls from './ReaderPageControls'
import { handlePageKey } from '../lib/readerNavigation'

// Book content gets no network access or scripts, including event handlers.
function sanitizeChapter(output, section) {
  const clean = DOMPurify.sanitize(section.output || output, { ALLOWED_URI_REGEXP: /^(?:(?:https?|blob|data):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i, WHOLE_DOCUMENT: true, FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'base', 'meta'], ADD_URI_SAFE_ATTR: [] })
  const policy = "default-src 'none'; img-src blob: data:; style-src 'unsafe-inline' blob:; font-src blob: data:; connect-src 'none'; frame-src 'none'; form-action 'none'"
  section.output = clean.replace(/<head[^>]*>/i, match => `${match}<meta http-equiv="Content-Security-Policy" content="${policy}">`)
}

function flattenToc(items, level = 0) {
  return items.flatMap(item => [{ ...item, depth: level }, ...flattenToc(item.subitems || [], level + 1)])
}

export default function EpubBookReader({ data, initialLocation, jump, onLocation, annotations = [], onSelection, onEscape }) {
  const host = useRef(null)
  const rendition = useRef(null)
  const turnPage = useRef(() => {})
  const [toc, setToc] = useState([])
  const [fontSize, setFontSize] = useState(110)
  const [spacing, setSpacing] = useState(1.6)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const [chapter, setChapter] = useState('')
  const [position, setPosition] = useState({ atStart: true, atEnd: false, label: '' })

  useEffect(() => {
    let active = true
    const book = ePub(undefined, { replacements: 'blobUrl' })
    let opened = false
    const timeout = setTimeout(() => { if (active) setError('This EPUB could not be opened. It may be damaged or encrypted. Try another copy.') }, 30000)
    async function open() {
      await book.open(data.slice(0))
      await book.opened
      await book.ready
      opened = true
      if (!active) { book.destroy(); return }
      // Register after EPUB.js replaces archive paths, so sanitizing is last.
      book.spine.hooks.serialize.register(sanitizeChapter)
      const reader = book.renderTo(host.current, { width: '100%', height: 620, flow: 'paginated', spread: 'none', allowScriptedContent: false, allowPopups: false })
      rendition.current = reader
      let turning = false
      turnPage.current = async direction => {
        const location = reader.currentLocation()
        if (turning || (direction < 0 && location?.atStart) || (direction > 0 && location?.atEnd)) return
        turning = true
        try { await (direction > 0 ? reader.next() : reader.prev()) }
        catch (err) { if (active) setError(err.message) }
        finally { turning = false }
      }
      reader.on('keydown', event => { if (event.key === 'Escape') onEscape?.(); handlePageKey(event, direction => turnPage.current(direction)) })
      reader.on('selected', (cfi, contents) => {
        const quote = contents.window.getSelection()?.toString().trim()
        if (quote) onSelection?.({ quote, location: { cfi } })
      })
      reader.themes.fontSize('110%')
      reader.themes.override('line-height', '1.6', true)
      reader.on('relocated', location => {
        if (active && location?.start?.cfi) {
          setChapter(location.start.href || '')
          const displayed = location.start.displayed
          setPosition({ atStart: !!location.atStart, atEnd: !!location.atEnd, label: displayed ? `Chapter page ${displayed.page} of ${displayed.total}` : 'Reading' })
          onLocation({ cfi: location.start.cfi })
        }
      })
      reader.on('displayError', err => { if (active) setError(`Unable to display this chapter: ${err.message || err}`) })
      reader.hooks.content.register(contents => {
        contents.document.addEventListener('contextmenu', event => {
          const selection = contents.window.getSelection()
          const quote = selection?.toString().trim()
          if (!quote || !selection.rangeCount) return
          event.preventDefault()
          onSelection?.({ quote, location: { cfi: contents.cfiFromRange(selection.getRangeAt(0)) }, addNote: true })
        })
        let touchStart = null
        contents.document.addEventListener('touchstart', event => {
          touchStart = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null
        }, { passive: true })
        contents.document.addEventListener('touchend', event => {
          const start = touchStart; touchStart = null
          if (!start || event.changedTouches.length !== 1 || contents.window.getSelection()?.toString()) return
          const dx = event.changedTouches[0].clientX - start.x, dy = event.changedTouches[0].clientY - start.y
          if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) turnPage.current(dx < 0 ? 1 : -1)
        }, { passive: true })
        contents.document.addEventListener('touchcancel', () => { touchStart = null }, { passive: true })
        contents.document.addEventListener('click', event => {
          const link = event.target.closest?.('a[href]')
          if (!link) return
          event.preventDefault()
          event.stopImmediatePropagation()
          const href = link.getAttribute('href').trim()
          if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href)) return
          const section = book.spine.get(contents.sectionIndex)
          const target = new URL(href, new URL(section.url, 'https://epub.invalid'))
          reader.display(book.path.relative(target.pathname) + target.hash).catch(err => { if (active) setError(err.message) })
        }, true)
      })
      const nav = await book.loaded.navigation
      if (!active) return
      setToc(flattenToc(nav.toc))
      await reader.display(initialLocation?.cfi || undefined)
      clearTimeout(timeout)
      if (active) setReady(true)
    }
    open().catch(err => {
      clearTimeout(timeout)
      if (active) setError(`Unable to open this EPUB. Encrypted or damaged books are not supported. ${err.message || ''}`)
    })
    return () => { active = false; clearTimeout(timeout); rendition.current = null; turnPage.current = () => {}; if (opened) book.destroy() }
  }, [data, initialLocation, onLocation, onSelection, onEscape])

  useEffect(() => { if (ready && jump?.location?.cfi) rendition.current?.display(jump.location.cfi).catch(err => setError(err.message)) }, [jump, ready])
  useEffect(() => { rendition.current?.themes.fontSize(`${fontSize}%`); rendition.current?.themes.override('line-height', String(spacing), true) }, [fontSize, spacing])

  useEffect(() => {
    if (!ready) return
    const reader = rendition.current
    const ranges = new Map(annotations.filter(row => row.location.cfi).map(row => [row.location.cfi, row]))
    for (const [cfi, row] of ranges) {
      try { reader.annotations.highlight(cfi, {}, null, 'saved-passage', { fill: highlightColors[row.color] || highlightColors.yellow, 'fill-opacity': '0.35', 'mix-blend-mode': 'multiply' }) }
      catch { setError('One saved highlight could not be displayed. It is still available in Highlights & notes.') }
    }
    return () => { for (const cfi of ranges.keys()) reader.annotations.remove(cfi, 'highlight') }
  }, [annotations, ready])
  useEffect(() => {
    if (!ready) return
    let frame
    const observer = new ResizeObserver(([entry]) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => rendition.current?.resize(entry.contentRect.width, entry.contentRect.height))
    })
    observer.observe(host.current)
    return () => { observer.disconnect(); cancelAnimationFrame(frame) }
  }, [ready])

  function move(action) { setError(''); Promise.resolve(action()).catch(err => setError(err.message)) }
  return <div className="epub-reader" tabIndex={0} aria-label="EPUB reader" onKeyDown={event => handlePageKey(event, direction => turnPage.current(direction))}>
    <div className="digital-toolbar">
      <label>Chapter <select aria-label="EPUB chapter" value={toc.find(item => item.href?.split('#')[0] === chapter.split('#')[0])?.href || ''} disabled={!ready} onChange={event => { if (event.target.value) move(() => rendition.current.display(event.target.value)) }}><option value="">Table of contents</option>{toc.filter(item => !/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(item.href)).map((item, index) => <option key={index} value={item.href}>{'— '.repeat(item.depth)}{item.label.trim()}</option>)}</select></label>
      <label>Text size <select value={fontSize} onChange={event => setFontSize(Number(event.target.value))}>{[90, 100, 110, 125, 150, 175].map(value => <option key={value} value={value}>{value}%</option>)}</select></label>
      <label>Line spacing <select value={spacing} onChange={event => setSpacing(Number(event.target.value))}><option value="1.4">Compact</option><option value="1.6">Comfortable</option><option value="2">Spacious</option></select></label>
    </div>
    {error && <p role="alert">{error}</p>}
    {!ready && !error && <p role="status">Opening EPUB…</p>}
    <div ref={host} className="epub-pages" aria-label="EPUB book content"/>
    <ReaderPageControls previousDisabled={!ready || position.atStart} nextDisabled={!ready || position.atEnd} turn={direction => turnPage.current(direction)} label={position.label || 'Opening EPUB…'} hint="Swipe the page or use ← →"/>
  </div>
}
