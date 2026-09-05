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
      <line x1="32" y1="18.5" x2="32" y2="45.5" stroke="var(--color-accent-700)" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="13.5" y1="25" x2="29" y2="25" stroke="var(--color-accent-700)" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="15" y1="33" x2="29" y2="33" stroke="var(--color-accent-700)" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="16.5" y1="41" x2="29" y2="41" stroke="var(--color-accent-700)" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="35" y1="25" x2="50.5" y2="25" stroke="var(--color-accent-700)" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="35" y1="33" x2="49" y2="33" stroke="var(--color-accent-700)" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="35" y1="41" x2="47.5" y2="41" stroke="var(--color-accent-700)" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="46" cy="20" r="8.5" fill="none" stroke="var(--color-accent-700)" strokeWidth="5" />
      <line x1="52" y1="26" x2="58" y2="32" stroke="var(--color-accent-700)" strokeWidth="5.5" strokeLinecap="round" />
    </svg>
  )
}
