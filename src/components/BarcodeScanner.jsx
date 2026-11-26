import { useEffect, useRef, useState } from 'react'
import { Flashlight, FlashlightOff, X } from 'lucide-react'
import { isValidISBN, normalizeISBN } from '../lib/isbn'
import { decodeFrame, preloadBarcodeReader } from '../lib/barcodeReader'
import './BarcodeScanner.css'

// The scan band, as a share of the video frame. Book barcodes are wide and
// short, so only this centre strip is decoded: less work per frame, more frames.
const BAND = { w: 0.86, h: 0.42 }
const MAX_BAND_WIDTH = 1400

// Camera barcode scan with a manual ISBN fallback.
export default function BarcodeScanner({ onScan, onClose }) {
  const videoRef = useRef(null)
  const doneRef = useRef(false)
  const [error, setError] = useState(null)
  const [status, setStatus] = useState('starting')
  const [torch, setTorch] = useState({ supported: false, on: false })
  const trackRef = useRef(null)
  const [manualIsbn, setManualIsbn] = useState('')
  const [isbnError, setIsbnError] = useState('')

  useEffect(() => {
    let stream = null
    let stopped = false
    let lastWarning = 0
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })

    function stop() {
      stopped = true
      if (stream) stream.getTracks().forEach(t => t.stop())
      stream = null
    }

    async function loop() {
      const video = videoRef.current
      while (!stopped && !doneRef.current) {
        if (video && video.readyState >= 2 && video.videoWidth) {
          const vw = video.videoWidth, vh = video.videoHeight
          const sw = Math.round(vw * BAND.w), sh = Math.round(vh * BAND.h)
          const scale = Math.min(1, MAX_BAND_WIDTH / sw)
          canvas.width = Math.round(sw * scale); canvas.height = Math.round(sh * scale)
          ctx.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, canvas.width, canvas.height)
          let text = null
          try { text = await decodeFrame(ctx.getImageData(0, 0, canvas.width, canvas.height)) } catch { /* keep scanning */ }
          if (stopped || doneRef.current) return
          if (text) {
            const isbn = normalizeISBN(text)
            if (isValidISBN(isbn)) {
              doneRef.current = true
              setStatus('found')
              if (navigator.vibrate) navigator.vibrate(60)
              stop()
              onScan(isbn)
              return
            }
            const now = Date.now()
            if (now - lastWarning > 2500) {
              lastWarning = now
              setIsbnError('That barcode isn’t an ISBN. On paperbacks the ISBN barcode is sometimes inside the front cover.')
            }
          }
        }
        await new Promise(r => requestAnimationFrame(r))
      }
    }

    async function start() {
      try {
        const [media] = await Promise.all([
          navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          }),
          preloadBarcodeReader(),
        ])
        if (stopped) { media.getTracks().forEach(t => t.stop()); return }
        stream = media
        const track = stream.getVideoTracks()[0]
        trackRef.current = track
        const caps = track.getCapabilities ? track.getCapabilities() : {}
        const advanced = []
        if (caps.focusMode?.includes?.('continuous')) advanced.push({ focusMode: 'continuous' })
        // Newer iPhones can't focus their main camera close up; a little zoom
        // lets you hold the book far enough away to stay sharp.
        if (caps.zoom && caps.zoom.max >= 1.6) advanced.push({ zoom: Math.min(2, caps.zoom.max) })
        if (advanced.length) track.applyConstraints({ advanced }).catch(() => {})
        setTorch({ supported: Boolean(caps.torch), on: false })
        const video = videoRef.current
        video.srcObject = stream
        await video.play()
        setStatus('scanning')
        loop()
      } catch (err) {
        console.error('Scanner start error:', err)
        stop()
        setError(err?.name === 'NotAllowedError'
          ? 'Camera access is blocked. Allow the camera for this site in your browser settings, or enter the ISBN below.'
          : 'The camera scanner couldn’t start. Enter the ISBN below instead.')
      }
    }

    start()
    return stop
    // onScan is called once; restarting the camera on a new callback identity would flicker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggleTorch() {
    const track = trackRef.current
    if (!track) return
    const on = !torch.on
    track.applyConstraints({ advanced: [{ torch: on }] }).then(() => setTorch(t => ({ ...t, on }))).catch(() => {})
  }

  function handleManualSubmit(e) {
    e.preventDefault()
    if (doneRef.current) return
    const isbn = normalizeISBN(manualIsbn)
    if (!isValidISBN(isbn)) {
      setIsbnError('Enter a valid 10- or 13-character ISBN, including its check digit.')
      return
    }
    doneRef.current = true
    onScan(isbn)
  }

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="dialog-title">Scan a barcode</div>
          <button type="button" className="btn btn-icon btn-ghost" onClick={onClose} aria-label="Close">
            <X size={16} strokeWidth={2.75} />
          </button>
        </div>

        {error ? (
          <div className="dialog-body" role="alert" style={{ color: 'var(--color-accent-800)' }}>{error}</div>
        ) : (
          <div className={`scan-view is-${status}`}>
            <video ref={videoRef} playsInline muted autoPlay aria-label="Camera view" />
            <div className="scan-band" style={{ width: `${BAND.w * 100}%`, height: `${BAND.h * 100}%` }} aria-hidden="true"><span /></div>
            {status === 'starting' && <p className="scan-hint" role="status">Starting the camera…</p>}
            {torch.supported && (
              <button type="button" className="scan-torch" onClick={toggleTorch} aria-pressed={torch.on} aria-label={torch.on ? 'Turn off the light' : 'Turn on the light'}>
                {torch.on ? <FlashlightOff size={18} /> : <Flashlight size={18} />}
              </button>
            )}
          </div>
        )}

        <p className="text-sm text-center" style={{ opacity: 0.6 }}>
          Fit the barcode on the back of the book inside the box
        </p>

        <div className="pt-3" style={{ borderTop: '1px solid var(--color-divider)' }}>
          <p className="text-sm text-center mb-2" style={{ opacity: 0.6 }}>Or enter ISBN manually</p>
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input className="input" placeholder="e.g. 9780451524935" value={manualIsbn} onChange={(e) => setManualIsbn(e.target.value)} />
            <button type="submit" className="btn btn-primary shrink-0">Look up</button>
          </form>
          {isbnError && <p className="text-sm mt-2" role="alert">{isbnError}</p>}
        </div>
      </div>
    </div>
  )
}
