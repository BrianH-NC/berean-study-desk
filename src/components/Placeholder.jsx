// Shared body for the screens not yet built in this pass — keeps every route
// navigable and visually consistent with the shell while the real screen is
// designed in a later phase.
export default function Placeholder({ title, note }) {
  return (
    <div className="max-w-[1180px] mx-auto page">
      <h2>{title}</h2>
      <p className="text-sm" style={{ color: 'color-mix(in srgb, var(--color-text) 55%, transparent)' }}>
        {note || 'Coming in a later pass.'}
      </p>
    </div>
  )
}
