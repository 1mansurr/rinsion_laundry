// Order status pill using the status.* color tokens from tailwind.config.ts.
// All status strings match the DB enum: received | confirmed | processing | ready | collected | cancelled

type OrderStatus = 'received' | 'confirmed' | 'processing' | 'ready' | 'collected' | 'cancelled'

const LABEL: Record<OrderStatus, string> = {
  received: 'Received',
  confirmed: 'Confirmed',
  processing: 'Processing',
  ready: 'Ready',
  collected: 'Collected',
  cancelled: 'Cancelled',
}

const TOKEN: Record<OrderStatus, { bg: string; fg: string; dot: string }> = {
  received:   { bg: 'bg-status-received-bg',   fg: 'text-status-received-fg',   dot: 'bg-status-received-dot' },
  confirmed:  { bg: 'bg-status-confirmed-bg',  fg: 'text-status-confirmed-fg',  dot: 'bg-status-confirmed-dot' },
  processing: { bg: 'bg-status-processing-bg', fg: 'text-status-processing-fg', dot: 'bg-status-processing-dot' },
  ready:      { bg: 'bg-status-ready-bg',      fg: 'text-status-ready-fg',      dot: 'bg-status-ready-dot' },
  collected:  { bg: 'bg-status-collected-bg',  fg: 'text-status-collected-fg',  dot: 'bg-status-collected-dot' },
  cancelled:  { bg: 'bg-status-cancelled-bg',  fg: 'text-status-cancelled-fg',  dot: 'bg-status-cancelled-dot' },
}

interface StatusBadgeProps {
  status: OrderStatus
  className?: string
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const { bg, fg, dot } = TOKEN[status]

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-label font-medium ${bg} ${fg} ${className}`}
    >
      <span className={`w-[6px] h-[6px] rounded-full shrink-0 ${dot}`} aria-hidden />
      {LABEL[status]}
    </span>
  )
}
