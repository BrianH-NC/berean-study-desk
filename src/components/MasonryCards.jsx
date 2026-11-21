import { useLayoutEffect, useRef } from 'react'
import { rowSpan } from '../lib/masonry'

const GAP = 12
const WIDE = '(min-width: 1100px)'

// The Bible Study cards (study tools, commentary, sermons, notes...) in as many columns as fit, each card
// going into whichever column is shortest, so a tall card never leaves a blank space beside it. Cards are
// the `.bible-card` elements inside; the CSS (BibleStudy.css) makes the grid, this gives each card its height.
// When `enabled` is false, or the screen is narrow, the wrapper does nothing and the cards lay out as before.
export default function MasonryCards({ enabled, children }) {
  const root = useRef(null)
  useLayoutEffect(() => {
    const el = root.current
    if (!enabled || !el) return
    const media = window.matchMedia(WIDE)
    let frame = 0
    const layout = () => {
      frame = 0
      for (const card of el.querySelectorAll('.bible-card')) {
        card.style.gridRowEnd = media.matches ? `span ${rowSpan(card.getBoundingClientRect().height, GAP)}` : ''
      }
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(layout) }
    const resizes = new ResizeObserver(schedule)
    const watch = () => { resizes.observe(el); el.querySelectorAll('.bible-card').forEach((card) => resizes.observe(card)) }
    // Cards come and go (commentary opens, notes load); watch each new one.
    const changes = new MutationObserver(() => { watch(); schedule() })
    changes.observe(el, { childList: true, subtree: true })
    media.addEventListener('change', schedule)
    watch(); layout()
    return () => {
      cancelAnimationFrame(frame); resizes.disconnect(); changes.disconnect(); media.removeEventListener('change', schedule)
      el.querySelectorAll('.bible-card').forEach((card) => { card.style.gridRowEnd = '' })
    }
  }, [enabled])
  return enabled ? <div className="bible-cards" ref={root}>{children}</div> : <>{children}</>
}
