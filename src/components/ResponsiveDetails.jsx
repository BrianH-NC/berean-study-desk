import { useEffect, useRef } from 'react'

// Apply the default on a breakpoint change; allow manual toggling in between.
export default function ResponsiveDetails({ query, children, ...props }) {
  const element = useRef(null)
  useEffect(() => {
    const media = window.matchMedia(query)
    const sync = () => { if (element.current) element.current.open = media.matches }
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [query])
  return <details ref={element} {...props}>{children}</details>
}
