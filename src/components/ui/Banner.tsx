'use client'

type BannerVariant = 'info' | 'warning' | 'success' | 'destructive'

interface BannerProps {
  variant?: BannerVariant
  title?: string
  children: React.ReactNode
  dismissable?: boolean
  onDismiss?: () => void
  className?: string
}

const STYLES: Record<BannerVariant, { wrap: string; icon: React.ReactNode }> = {
  info: {
    wrap: 'bg-info-bg border-info-border text-info-fg',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
      </svg>
    ),
  },
  warning: {
    wrap: 'bg-warning-bg border-warning-border text-warning-fg',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
      </svg>
    ),
  },
  success: {
    wrap: 'bg-success-bg border-success-border text-success-fg',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
      </svg>
    ),
  },
  destructive: {
    wrap: 'bg-error-bg border-error-border text-error-fg',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
      </svg>
    ),
  },
}

export function Banner({
  variant = 'info',
  title,
  children,
  dismissable = false,
  onDismiss,
  className = '',
}: BannerProps) {
  const { wrap, icon } = STYLES[variant]

  return (
    <div
      role="alert"
      className={`flex gap-3 items-start rounded-9 border px-4 py-3.5 ${wrap} ${className}`}
    >
      <span className="mt-[1px] shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        {title && <p className="text-ui-sm font-semibold mb-0.5">{title}</p>}
        <div className="text-ui-sm">{children}</div>
      </div>
      {dismissable && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 -mr-1 p-1 rounded hover:bg-black/10 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  )
}
