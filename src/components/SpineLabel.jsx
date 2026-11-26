import { useLayoutEffect, useRef, useState } from 'react'
import { verdictBarColor } from '../lib/verdictRules'
import './SpineLabel.css'

// Label stock settings. Defaults: 1" wide × 1½" tall spine labels on US Letter,
// 8 across × 7 down (the common 56-per-sheet library spine label layout).
export const DEFAULT_LABEL_SETTINGS = { width: 1, height: 1.5, top: 0.25, left: 0.25, gapX: 0, gapY: 0, columns: 8, rows: 7, padding: 0.06, fontPt: 9, bar: 0.125 }
const SETTINGS_KEY = 'bsd:shelf-label-settings'

export function loadLabelSettings() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) || 'null')
    if (saved && typeof saved === 'object') return { ...DEFAULT_LABEL_SETTINGS, ...Object.fromEntries(Object.entries(saved).filter(([k, v]) => k in DEFAULT_LABEL_SETTINGS && Number.isFinite(v))) }
  } catch { /* storage may be blocked */ }
  return { ...DEFAULT_LABEL_SETTINGS }
}
export function saveLabelSettings(settings) {
  try { window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)) } catch { /* storage may be blocked */ }
}

// One spine label drawn at its real printed size. The same element is used
// on screen and in print, so wrapping and overflow are decided the same way.
// Text that doesn't fit is never clipped silently: the label is marked and
// onOverflow reports it.
export default function SpineLabel({ lines, verdict = null, settings = DEFAULT_LABEL_SETTINGS, onOverflow, className = '' }) {
  const ref = useRef(null)
  const [over, setOver] = useState(false)
  const key = (lines || []).join('|')
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const inner = el.firstElementChild
    const cs = window.getComputedStyle(el)
    const availH = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
    const width = () => inner.getBoundingClientRect().width
    // Shrink any line that is wider than the label, one step at a time, down
    // to about 78% of the base size. Fractional sizes are used so sub-pixel
    // rounding never counts as overflow.
    const spans = [...inner.children]
    for (const span of spans) {
      span.style.fontSize = ''
      const base = parseFloat(window.getComputedStyle(span).fontSize)
      let size = base
      while (span.getBoundingClientRect().width > width() + 0.5 && size > base * 0.78) { size -= 0.25; span.style.fontSize = `${size}px` }
    }
    const tooWide = spans.some(span => span.getBoundingClientRect().width > width() + 0.5)
    const overflow = tooWide || inner.getBoundingClientRect().height > availH + 0.5
    setOver(overflow)
    onOverflow?.(overflow)
  }, [key, settings.width, settings.height, settings.padding, settings.fontPt, settings.bar, verdict, onOverflow])
  if (!lines) return null
  const color = settings.bar > 0 ? verdictBarColor(verdict) : null
  // The bar's space is reserved whether or not this book has a verdict, so
  // every label on a sheet has its text in the same place.
  const barIn = settings.bar > 0 ? settings.bar : 0
  const style = { width: `${settings.width}in`, height: `${settings.height}in`, padding: `${settings.padding + barIn}in ${settings.padding}in ${settings.padding}in`, fontSize: `${settings.fontPt}pt` }
  return <div ref={ref} className={`spine-label ${over ? 'is-over' : ''} ${className}`} style={style} aria-label={`Spine label: ${lines.join(', ')}${verdict ? `, ${verdict}` : ''}`}>
    {color && <span className="spine-bar" style={{ height: `${barIn}in`, background: color }} aria-hidden="true" />}
    <div className="spine-label-text"><span className="spine-cat">{lines[0]}</span><span className="spine-sub">{lines[1]}</span><span className="spine-author">{lines[2]}</span></div>
  </div>
}
