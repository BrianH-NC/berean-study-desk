// Shared styling for the agree/disagree/unsure stance a Reading-now note can
// carry (entries.stance) -- used on the Reading screen, the Entry page, and
// the Doctrine Check report's "notes on this book" section.
export function stanceClass(stance) {
  if (stance === 'agree') return 'tag-accent-2'
  if (stance === 'disagree') return 'verdict-concern'
  return 'tag-neutral'
}
