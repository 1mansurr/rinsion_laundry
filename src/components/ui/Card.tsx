// White surface card. border-radius: 18px per rinsion_design_system/Rinsion Design System.dc.html.

interface CardProps {
  header?: React.ReactNode
  footer?: React.ReactNode
  className?: string
  children: React.ReactNode
}

export function Card({ header, footer, className = '', children }: CardProps) {
  return (
    <div className={`bg-white border border-warm-300 rounded-18 overflow-hidden ${className}`}>
      {header && (
        <div className="px-5 py-4 border-b border-warm-300">
          {header}
        </div>
      )}
      <div className="p-5">
        {children}
      </div>
      {footer && (
        <div className="px-5 py-4 border-t border-warm-300 bg-warm-50">
          {footer}
        </div>
      )}
    </div>
  )
}
