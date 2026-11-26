// Fast book-barcode decoding with ZXing C++ compiled to WebAssembly. Safari on
// iPhone has no built-in BarcodeDetector, and this is several times faster
// than the old JavaScript port. The .wasm file ships with the app (no CDN).

let modulePromise = null

// Loads and compiles the decoder. Safe to call many times; screens with a
// Scan button call it on mount so the first scan doesn't wait on the download.
export function preloadBarcodeReader() {
  if (!modulePromise) {
    modulePromise = Promise.all([
      import('zxing-wasm/reader'),
      import('zxing-wasm/reader/zxing_reader.wasm?url'),
    ]).then(async ([zxing, { default: wasmUrl }]) => {
      await zxing.prepareZXingModule({
        overrides: { locateFile: (path, prefix) => (path.endsWith('.wasm') ? wasmUrl : prefix + path) },
        fireImmediately: true,
      })
      return zxing
    }).catch(err => { modulePromise = null; throw err })
  }
  return modulePromise
}

// Idle-time preload, so it never competes with the page's own loading.
export function preloadBarcodeReaderWhenIdle() {
  const run = () => { preloadBarcodeReader().catch(() => {}) }
  if (typeof window === 'undefined') return
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 3000 })
  else setTimeout(run, 1500)
}

const OPTIONS = {
  formats: ['EANUPC'],
  tryHarder: true,
  tryRotate: true,
  tryInvert: false,
  tryDownscale: true,
  maxNumberOfSymbols: 1,
}

// Decodes one frame (ImageData). Returns the barcode text or null.
export async function decodeFrame(imageData) {
  const zxing = await preloadBarcodeReader()
  const results = await zxing.readBarcodes(imageData, OPTIONS)
  const hit = results.find(r => r.isValid && r.text)
  return hit ? hit.text : null
}
