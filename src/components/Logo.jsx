// The BSD mark -- an open book (Acts 17:11's "searched the Scriptures daily")
// under a magnifying glass (the same close-reading spirit as Doctrine Check).
// Colored entirely from theme tokens so it re-themes live across all 6
// palettes and Day/Evening mode, unlike the static-color public/favicon.svg
// (which renders outside the page's CSS and can't reach those variables).
export default function Logo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" style={{ flexShrink: 0 }}>
      <rect x="2" y="2" width="60" height="60" rx="16" fill="var(--color-accent)" />
      <polygon points="32,18 9,15 15,45 32,46" fill="var(--color-bg)" />
      <polygon points="32,18 55,15 49,45 32,46" fill="var(--color-bg)" />
      <circle cx="46" cy="20" r="8.5" fill="none" stroke="var(--color-accent-700)" strokeWidth="5" />
      <line x1="52" y1="26" x2="58" y2="32" stroke="var(--color-accent-700)" strokeWidth="5.5" strokeLinecap="round" />
    </svg>
  )
}
