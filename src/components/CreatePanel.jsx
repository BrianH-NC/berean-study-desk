import { useEffect, useRef } from 'react'

export default function CreatePanel({ title, editing = false, children }) {
  const panel = useRef(null)
  useEffect(() => {
    if (!editing) return
    panel.current.open = true
    panel.current.scrollIntoView({ block: 'start', behavior: 'smooth' })
    panel.current.querySelector('input,textarea,select')?.focus({ preventScroll: true })
  }, [editing])
  return <details ref={panel} className="create-panel"><summary>{editing ? 'Edit details' : title}</summary>{children}</details>
}
