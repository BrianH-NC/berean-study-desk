export function handlePageKey(event, turn) {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.repeat) return
  if (event.target?.isContentEditable || event.target?.closest?.('input, textarea, select, [role="textbox"]')) return
  const direction = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
  if (direction) { event.preventDefault(); turn(direction) }
}
