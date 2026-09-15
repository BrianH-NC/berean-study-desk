// Preserve the supplied manuscript B silhouette. Final detailed scroll/quill
// artwork remains an asset handoff; this is the existing simplified vector.
export default function Logo({ size = 32, transparent = false }) {
  return <img src={transparent ? '/branding/modern-heritage/mark-transparent.svg' : '/branding/modern-heritage/mark.svg'} width={size} height={size} alt="" className="shrink-0" />
}

export function BrandLockup() {
  return <div className="brand-wordmark" aria-label="Berean Study Desk"><strong>BEREAN</strong><span>STUDY DESK</span></div>
}
