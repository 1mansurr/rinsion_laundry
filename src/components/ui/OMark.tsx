// The notched-ring "o" — Rinsion's core mark.
// Spin props animate via rin-spin keyframe (Tailwind animate-spin-ring).
// For pickup-code frame use thin=true; for loading/icon use default.

interface OMarkProps {
  size?: number
  variant?: 'default' | 'reversed' | 'muted-red'
  spinning?: boolean
  thin?: boolean
  className?: string
}

const STROKE_COLOR = {
  default: '#0F3D2E',
  reversed: '#FAF8F5',
  'muted-red': '#B0413A',
}

export function OMark({
  size = 24,
  variant = 'default',
  spinning = false,
  thin = false,
  className = '',
}: OMarkProps) {
  const stroke = STROKE_COLOR[variant]

  if (thin) {
    // Code-frame ring: thin stroke, wider radius, tighter notch
    return (
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className={className}
        style={{ display: 'block' }}
        aria-hidden
      >
        <circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          stroke={stroke}
          strokeWidth="3"
          strokeLinecap="round"
          pathLength="100"
          strokeDasharray="92 8"
          transform="rotate(-77 50 50)"
        />
      </svg>
    )
  }

  // Standard icon / spinner
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`${spinning ? 'animate-spin-ring origin-center' : ''} ${className}`}
      style={{ display: 'block' }}
      aria-hidden
    >
      <circle
        cx="50"
        cy="50"
        r="37"
        fill="none"
        stroke={stroke}
        strokeWidth="15"
        strokeLinecap="round"
        pathLength="100"
        strokeDasharray={spinning ? '70 30' : '86 14'}
        transform={spinning ? 'rotate(-58 50 50)' : 'rotate(-56 50 50)'}
      />
    </svg>
  )
}
