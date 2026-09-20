import { useEffect, useRef, useState } from 'react'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import ReaderPageControls from './ReaderPageControls'
import { handlePageKey } from '../lib/readerNavigation'

GlobalWorkerOptions.workerSrc = workerUrl

export default function PdfBookReader({ data, initialLocation, jump, onLocation }) {
  const canvas = useRef(null)
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
    let active = true, renderTask
    setRendering(true)
    setError('')
    document.getPage(page).then(async pdfPage => {
      if (!active) return
      const original = pdfPage.getViewport({ scale: 1 })
      const viewport = pdfPage.getViewport({ scale: width / original.width * zoom })
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
      if (active) setText(content.items.map(item => item.str + (item.hasEOL ? '\n' : ' ')).join(''))
    }).catch(err => { if (active && err.name !== 'RenderingCancelledException') { setError(err.message); setRendering(false) } })
    return () => { active = false; renderTask?.cancel() }
  }, [document, page, width, zoom, onLocation])

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
    <div className="pdf-page" ref={pageViewport}><canvas ref={canvas} aria-label={`PDF page ${page}`}/></div>
    <ReaderPageControls previousDisabled={!document || page <= 1} nextDisabled={!document || page >= document.numPages} turn={turn} label={document ? `Page ${page} of ${document.numPages}` : 'Opening PDF…'}/>
    <details className="pdf-text"><summary>Page text</summary><p>{text || 'This page has no extractable text. It may be a scanned image.'}</p></details>
  </div>
}
