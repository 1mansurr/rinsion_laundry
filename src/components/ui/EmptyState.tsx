import { OMark } from './OMark'
import { Button } from './Button'

interface EmptyStateProps {
  headline: string
  body?: string
  action?: {
    label: string
    onClick: () => void
    variant?: 'primary' | 'secondary'
  }
  className?: string
}

export function EmptyState({ headline, body, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}>
      {/* Concentric ring decoration */}
      <div className="relative flex items-center justify-center mb-6">
        <div className="absolute w-[104px] h-[104px] rounded-full border border-warm-200" />
        <div className="absolute w-[76px] h-[76px] rounded-full border border-warm-300" />
        <div className="relative z-10 w-12 h-12 rounded-full bg-warm-100 border border-warm-300 flex items-center justify-center">
          <OMark size={24} variant="muted-red" />
        </div>
      </div>

      <h3 className="text-h2 font-semibold text-warm-950 mb-2">{headline}</h3>
      {body && <p className="text-body text-warm-700 max-w-[320px] mb-6">{body}</p>}
      {action && (
        <Button variant={action.variant ?? 'primary'} onClick={action.onClick} size="sm">
          {action.label}
        </Button>
      )}
    </div>
  )
}
