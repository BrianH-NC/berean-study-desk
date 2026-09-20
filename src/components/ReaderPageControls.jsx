import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function ReaderPageControls({ previousDisabled, nextDisabled, turn, label, hint = 'Use ← → while the reader is focused' }) {
  return <nav className="reader-page-controls" aria-label="Turn book pages">
    <button className="btn btn-secondary" disabled={previousDisabled} onClick={() => turn(-1)} aria-label="Previous page"><ChevronLeft size={20} aria-hidden="true"/><span>Previous</span></button>
    <div><span className="reader-page-position" aria-live="polite">{label}</span><span className="reader-page-hint">{hint}</span></div>
    <button className="btn btn-primary" disabled={nextDisabled} onClick={() => turn(1)} aria-label="Next page"><span>Next</span><ChevronRight size={20} aria-hidden="true"/></button>
  </nav>
}
