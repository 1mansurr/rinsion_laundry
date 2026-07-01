// Rinsion wordmark with custom "i" letterforms (emerald tittles) and notched "o".
// Sizes — sm: 21px (top bar), md: 42px (hero), lg: 96px (marketing).
// Variants — default: charcoal/emerald, reversed: all off-white (dark bg).

interface WordmarkProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'reversed'
  className?: string
}

const SIZES = { sm: 21, md: 42, lg: 96 }

export function Wordmark({ size = 'sm', variant = 'default', className = '' }: WordmarkProps) {
  const fs = SIZES[size]
  const isReversed = variant === 'reversed'
  const textColor = isReversed ? '#FAF8F5' : '#1A1A1A'
  const emerald = isReversed ? '#FAF8F5' : '#0F3D2E'
  // Wordmark "o": r=36, strokeWidth=23 (matches text weight at all sizes)
  const oR = 36
  const oSW = 23

  return (
    <span
      className={className}
      style={{
        fontWeight: 800,
        fontSize: fs,
        letterSpacing: '-0.04em',
        lineHeight: 1,
        whiteSpace: 'nowrap',
        color: textColor,
        display: 'inline-flex',
        alignItems: 'baseline',
      }}
      aria-label="Rinsion"
    >
      {/* R */}
      <span>R</span>

      {/* Custom i — emerald dot + charcoal stem */}
      <ILetter emerald={emerald} text={textColor} />

      {/* ns */}
      <span>ns</span>

      {/* Custom i — second instance */}
      <ILetter emerald={emerald} text={textColor} />

      {/* Notched o as SVG */}
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '0.66em',
          height: '0.66em',
          verticalAlign: 'baseline',
          transform: 'translateY(0.02em)',
          margin: '0 0.004em',
        }}
      >
        <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ display: 'block' }} aria-hidden>
          <circle
            cx="50"
            cy="50"
            r={oR}
            fill="none"
            stroke={emerald}
            strokeWidth={oSW}
            strokeLinecap="round"
            pathLength="100"
            strokeDasharray="86 14"
            transform="rotate(-56 50 50)"
          />
        </svg>
      </span>

      {/* n */}
      <span>n</span>
    </span>
  )
}

function ILetter({ emerald, text }: { emerald: string; text: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        verticalAlign: 'baseline',
        textAlign: 'center',
        lineHeight: 0,
        margin: '0 0.02em',
      }}
    >
      {/* tittle */}
      <span
        style={{
          display: 'block',
          width: '0.18em',
          height: '0.18em',
          borderRadius: '999px',
          background: emerald,
          margin: '0 auto',
        }}
      />
      {/* stem */}
      <span
        style={{
          display: 'block',
          width: '0.16em',
          height: '0.5em',
          borderRadius: '0.04em',
          background: text,
          margin: '0.055em auto 0',
        }}
      />
    </span>
  )
}
