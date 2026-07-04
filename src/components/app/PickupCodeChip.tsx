import { OMark } from '@/components/ui/OMark'

// sm: plain monospaced code text — used inline in order rows
// lg: thin OMark ring framing the code — used in PickupFlow and Order Detail header

interface PickupCodeChipProps {
  code: string   // 6-char alphanumeric
  size?: 'sm' | 'lg'
  className?: string
}

export function PickupCodeChip({ code, size = 'sm', className = '' }: PickupCodeChipProps) {
  if (size === 'sm') {
    return (
      <span
        className={`tnum font-mono text-ui-sm font-semibold text-warm-950 tracking-code ${className}`}
      >
        {code}
      </span>
    )
  }

  // lg: thin OMark ring (variant thin) wrapping the numeric code
  return (
    <span
      className={`relative inline-flex items-center justify-center ${className}`}
      aria-label={`Pickup code ${code}`}
    >
      <OMark size={80} thin />
      <span
        className="tnum absolute font-mono font-semibold tracking-code text-warm-950"
        style={{ fontSize: '18px', letterSpacing: '0.06em' }}
        aria-hidden
      >
        {code}
      </span>
    </span>
  )
}
