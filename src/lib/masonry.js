// Pure helpers for MasonryCards, which lets a grid of cards of different heights pack into the shortest
// column instead of leaving holes. The grid is made of 1px rows; each card spans as many rows as it is tall.

// How many 1px grid rows a card of this height (plus the gap that follows it) takes up.
export function rowSpan(height, gap = 0) {
  return Math.max(1, Math.ceil((Number(height) || 0) + gap))
}
