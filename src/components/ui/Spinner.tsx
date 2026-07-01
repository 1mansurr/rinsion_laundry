import { OMark } from './OMark'

interface SpinnerProps {
  size?: number
  variant?: 'default' | 'reversed'
  className?: string
}

// Readability alias for <OMark spinning> at call sites.
export function Spinner({ size = 24, variant = 'default', className }: SpinnerProps) {
  return <OMark size={size} variant={variant} spinning className={className} />
}
