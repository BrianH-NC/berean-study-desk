// Theme picker (Settings -> Appearance). Each entry's colors here are just
// for rendering the picker's swatches -- the actual tokens live in
// index.css under [data-theme="<id>"] / [data-theme="<id>"][data-mode="dark"].
// "organic" has no override block; it IS the bare :root/[data-mode="dark"]
// defaults, so omitting the attribute (or setting it to "organic") already
// falls back there correctly.
export const THEMES = [
  {
    id: 'organic',
    name: 'Organic',
    blurb: 'What’s live today — warm cream, terracotta, sage.',
    bg: '#f5ead8',
    accent: '#c67139',
    accent2: '#7a8a5e',
  },
  {
    id: 'vellum',
    name: 'Vellum & Ink',
    blurb: 'Gray paper and indigo ink, gold for emphasis.',
    bg: '#f3f1ea',
    accent: '#566ba0',
    accent2: '#ab8a3e',
  },
  {
    id: 'illuminated',
    name: 'Illuminated',
    blurb: 'A rubricated capital — wine red and gold leaf on blush vellum.',
    bg: '#f5e9dd',
    accent: '#a84a49',
    accent2: '#a3812f',
  },
  {
    id: 'grove',
    name: 'Quiet Grove',
    blurb: 'Cool sage-white, moss green leading, warm clay following.',
    bg: '#eef1e8',
    accent: '#5a8355',
    accent2: '#a97654',
  },
  {
    id: 'slate',
    name: 'Slate Study',
    blurb: 'Neutral gray paper, one calm teal to hold focus.',
    bg: '#f4f4f1',
    accent: '#3f8f87',
    accent2: '#5c6a89',
  },
  {
    id: 'clarity',
    name: 'Clarity',
    blurb: 'Crisp cool white, clear blue, warm coral for contrast.',
    bg: '#f6f8fa',
    accent: '#3993d3',
    accent2: '#e0743a',
  },
]

const STORAGE_KEY = 'bsd-theme'
const DEFAULT_THEME = 'organic'

export function getStoredTheme() {
  const stored = localStorage.getItem(STORAGE_KEY)
  return THEMES.some((t) => t.id === stored) ? stored : DEFAULT_THEME
}

export function applyTheme(id) {
  document.documentElement.setAttribute('data-theme', id)
  localStorage.setItem(STORAGE_KEY, id)
}
