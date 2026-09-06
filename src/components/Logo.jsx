import { useEffect, useState } from 'react'

// The BSD mark -- a manuscript-style capital B with a scroll and quill --
// from the approved brand asset pack (see public/branding/themes). Unlike
// the old inline-SVG attempt, this is a raster image per theme, so it can't
// re-theme via CSS custom properties alone; it re-renders the <img> src when
// the theme attribute changes instead.
const THEME_SLUGS = {
  organic: 'organic',
  vellum: 'vellum-and-ink',
  illuminated: 'illuminated',
  grove: 'quiet-grove',
  slate: 'slate-study',
  clarity: 'clarity',
}

function currentThemeSlug() {
  const id = document.documentElement.getAttribute('data-theme')
  return THEME_SLUGS[id] || 'organic'
}

export default function Logo({ size = 32 }) {
  const [slug, setSlug] = useState(currentThemeSlug)

  useEffect(() => {
    const observer = new MutationObserver(() => setSlug(currentThemeSlug()))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  return (
    <img
      src={`/branding/themes/${slug}/icon-192x192.png`}
      width={size}
      height={size}
      alt=""
      style={{ flexShrink: 0, borderRadius: '22%' }}
    />
  )
}
