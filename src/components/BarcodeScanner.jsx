import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { isValidISBN, normalizeISBN } from '../lib/isbn'

// Camera barcode scan + manual ISBN fallback, ported from
// holy-shelf/src/components/BarcodeScanner.jsx (same html5-qrcode usage),
// restyled to the Organic design system and wrapped in the .dialog pattern.
export default function BarcodeScanner({ onScan, onClose }) {
  const scannerRef = useRef(null)
  const hasScannedRef = useRef(false)
  const [error, setError] = useState(null)
  const [manualIsbn, setManualIsbn] = useState('')
  const [isbnError, setIsbnError] = useState('')

  useEffect(() => {
    let html5QrCode = null

    async function startScanner() {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode')
        // Book barcodes are EAN-13 (ISBN-13) or occasionally EAN-8/UPC --
        // not QR codes. Without an explicit formatsToSupport list, the
        // decoder isn't guaranteed to watch for 1D barcode formats at all.
        html5QrCode = new Html5Qrcode('bsd-qr-reader', {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
          ],
          verbose: false,
        })
        scannerRef.current = html5QrCode

        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 150 } },
          (decoded) => {
            if (hasScannedRef.current) return
            hasScannedRef.current = true

            const isbn = normalizeISBN(decoded)
            if (isValidISBN(isbn)) {
              const scanner = scannerRef.current
              scannerRef.current = null
              if (scanner) {
                scanner.stop().catch(() => {}).finally(() => onScan(isbn))
              } else {
                onScan(isbn)
              }
            } else {
              hasScannedRef.current = false
              setIsbnError('That barcode is not a valid ISBN. Scan the book’s ISBN barcode or enter it below.')
            }
          },
          () => {}
        )
      } catch (err) {
        console.error('Scanner start error:', err)
        setError('Could not access the camera. Check permissions and try again, or enter the ISBN manually.')
      }
    }

    startScanner()

    return () => {
      const scanner = scannerRef.current
      if (scanner) {
        scannerRef.current = null
        scanner.stop().catch(() => {})
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleManualSubmit(e) {
    e.preventDefault()
    if (hasScannedRef.current) return
    const isbn = normalizeISBN(manualIsbn)
    if (!isValidISBN(isbn)) {
      setIsbnError('Enter a valid 10- or 13-character ISBN, including its check digit.')
      return
    }
    hasScannedRef.current = true
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
          <div className="dialog-body" style={{ color: 'var(--color-accent-800)' }}>
            {error}
          </div>
        ) : (
          <div id="bsd-qr-reader" className="rounded-md overflow-hidden bg-neutral-900" style={{ minHeight: 240 }} />
        )}

        <p className="text-sm text-center" style={{ opacity: 0.6 }}>
          Point your camera at the barcode on the back of the book
        </p>

        <div className="pt-3" style={{ borderTop: '1px solid var(--color-divider)' }}>
          <p className="text-sm text-center mb-2" style={{ opacity: 0.6 }}>
            Or enter ISBN manually
          </p>
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              className="input"
              placeholder="e.g. 9780451524935"
              value={manualIsbn}
              onChange={(e) => setManualIsbn(e.target.value)}
            />
            <button type="submit" className="btn btn-primary shrink-0">
              Look up
            </button>
          </form>
          {isbnError && <p className="text-sm mt-2" role="alert">{isbnError}</p>}
        </div>
      </div>
    </div>
  )
}
