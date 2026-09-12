export const HERO_IMAGES = ['/images/study-mountains.webp', '/images/study-lake.webp', '/images/study-olive-grove.webp']

// Calendar arithmetic avoids DST changing the selected image within a local day.
export function dailyHero(date = new Date()) {
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000)
  return HERO_IMAGES[((day % HERO_IMAGES.length) + HERO_IMAGES.length) % HERO_IMAGES.length]
}
