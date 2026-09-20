import { useEffect, useRef, useState } from 'react'
import { getDocument, GlobalWorkerOptions, TextLayer } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { highlightColors } from '../lib/bookAnnotations'
import ReaderPageControls from './ReaderPageControls'
import { handlePageKey } from '../lib/readerNavigation'

GlobalWorkerOptions.workerSrc = workerUrl

export default function PdfBookReader({ data, initialLocation, jump, onLocation, annotations = [], onSelection }) {
  const canvas = useRef(null)
  const surface = useRef(null)
  const textLayer = useRef(null)
  const captureRef = useRef(null)
  const container = useRef(null)
  const pageViewport = useRef(null)
  const [document, setDocument] = useState(null)
  const [page, setPage] = useState(initialLocation?.page || 1)
  const [zoom, setZoom] = useState(1)
  const [width, setWidth] = useState(600)
  const [error, setError] = useState('')
  const [text, setText] = useState('')
  const [rendering, setRendering] = useState(true)

  useEffect(() => {
    let active = true
    // PDF.js transfers ownership of the buffer to its worker.
    const task = getDocument({ data: data.slice(0), isEvalSupported: false })
    task.onPassword = () => { if (active) setError('This PDF is password protected. Upload an unlocked copy.'); void task.destroy() }
    task.promise.then(doc => { if (active) { setPage(p => Math.min(p, doc.numPages)); setDocument(doc) } })
      .catch(err => { if (active) setError(previous => previous || `Unable to open this PDF: ${err.message}`) })
    return () => { active = false; void task.destroy() }
  }, [data])

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(200, entry.contentRect.width - 24)))
    observer.observe(container.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => { if (jump?.location?.page && document) setPage(Math.min(jump.location.page, document.numPages)) }, [jump, document])

  useEffect(() => {
    if (!document) return
    let active = true, renderTask, layer
    setRendering(true)
    textLayer.current.replaceChildren()
    setError('')
    document.getPage(page).then(async pdfPage => {
      if (!active) return
      const original = pdfPage.getViewport({ scale: 1 })
      const viewport = pdfPage.getViewport({ scale: width / original.width * zoom })
      surface.current.style.width = `${viewport.width}px`
      surface.current.style.height = `${viewport.height}px`
      surface.current.style.setProperty('--total-scale-factor', viewport.scale)
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      const target = canvas.current
      target.width = Math.floor(viewport.width * pixelRatio)
      target.height = Math.floor(viewport.height * pixelRatio)
      target.style.width = `${viewport.width}px`
      target.style.height = `${viewport.height}px`
      renderTask = pdfPage.render({ canvasContext: target.getContext('2d'), viewport, transform: [pixelRatio, 0, 0, pixelRatio, 0, 0] })
      await renderTask.promise
      if (!active) return
      setRendering(false)
      onLocation({ page })
      const content = await pdfPage.getTextContent()
      if (!active) return
      setText(content.items.map(item => item.str + (item.hasEOL ? '\n' : ' ')).join(''))
      layer = new TextLayer({ textContentSource: content, container: textLayer.current, viewport })
      await layer.render()
    }).catch(err => { if (active && err.name !== 'RenderingCancelledException') { setError(err.message); setRendering(false) } })
    return () => { active = false; renderTask?.cancel(); layer?.cancel() }
  }, [document, page, width, zoom, onLocation, onSelection])

  function capture(event, addNote = false) {
    const selected = window.getSelection()
    if (!selected?.rangeCount || !selected.toString().trim() || rendering) return
    const range = selected.getRangeAt(0)
    if (!textLayer.current.contains(range.commonAncestorContainer)) return
    const box = surface.current.getBoundingClientRect()
    const rects = Array.from(range.getClientRects()).filter(r => r.width > 0 && r.height > 0).map(r => ({
      x: Math.max(0, (r.left - box.left) / box.width), y: Math.max(0, (r.top - box.top) / box.height),
      width: Math.min(r.width / box.width, 1), height: Math.min(r.height / box.height, 1),
    })).slice(0, 200)
    if (!rects.length) return
    if (addNote) event.preventDefault()
    onSelection?.({ quote: selected.toString().trim(), location: { page, rects }, addNote })
  }
  useEffect(() => {
    let timer
    const changed = () => { clearTimeout(timer); timer = setTimeout(() => captureRef.current?.(), 180) }
    window.document.addEventListener('selectionchange', changed)
    return () => { clearTimeout(timer); window.document.removeEventListener('selectionchange', changed) }
  }, [])
  useEffect(() => { captureRef.current = () => capture(null) })

  function turn(direction) {
    if (!document) return
    setPage(current => Math.max(1, Math.min(document.numPages, current + direction)))
    pageViewport.current?.scrollTo({ top: 0, left: 0 })
  }
  return <div className="pdf-reader" ref={container} tabIndex={0} aria-label="PDF reader" onKeyDown={event => handlePageKey(event, turn)}>
    <div className="digital-toolbar">
      <label>Page <input aria-label="PDF page" type="number" min="1" max={document?.numPages || 1} value={page} onChange={event => { const next = Number(event.target.value); if (document && Number.isInteger(next) && next >= 1 && next <= document.numPages) setPage(next) }}/>{document && ` of ${document.numPages}`}</label>
      <label>Zoom <select aria-label="PDF zoom" value={zoom} onChange={event => setZoom(Number(event.target.value))}><option value="1">Fit width</option><option value="1.25">125%</option><option value="1.5">150%</option><option value="2">200%</option></select></label>
    </div>
    {error && <p role="alert">{error}</p>}
    {rendering && !error && <p role="status">Loading page…</p>}
    <div className="pdf-page" ref={pageViewport}><div className="pdf-surface" ref={surface} onPointerUp={capture} onContextMenu={event => capture(event, true)} onKeyUp={capture}>
      <canvas ref={canvas} aria-label={`PDF page ${page}`}/><div ref={textLayer} className="textLayer"/>
      <div className="pdf-highlights" aria-hidden="true">{!rendering && annotations.filter(row => row.location.page === page).flatMap(row => (row.location.rects || []).map((rect, i) => <span key={`${row.id}-${i}`} style={{ left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.width * 100}%`, height: `${rect.height * 100}%`, background: highlightColors[row.color] || highlightColors.yellow }}/>))}</div>
    </div></div>
    <ReaderPageControls previousDisabled={!document || page <= 1} nextDisabled={!document || page >= document.numPages} turn={turn} label={document ? `Page ${page} of ${document.numPages}` : 'Opening PDF…'}/>
    <details className="pdf-text"><summary>Page text</summary><p>{text || 'This page has no extractable text. It may be a scanned image.'}</p></details>
  </div>
}
