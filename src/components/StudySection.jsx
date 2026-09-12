import { useEffect, useState } from 'react'

// Expand the study sidebar on desktop; leave more room for Scripture on phones.
export default function StudySection({ title, children }) {
  const [open, setOpen] = useState(() => window.matchMedia('(min-width: 768px)').matches)
  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)')
    const change = () => setOpen(media.matches)
    media.addEventListener('change', change)
    return () => media.removeEventListener('change', change)
  }, [])
  return <details className="card bible-disclosure" open={open} onToggle={e => setOpen(e.currentTarget.open)}><summary>{title}</summary>{children}</details>
}
