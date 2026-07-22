// KPI stat card: label / value / optional delta indicator.
// Uses .tnum class for all numeric values (tabular-nums + lining-nums).

interface StatCardProps {
  label: string
  value: string | number
  delta?: {
    value: string   // e.g. "+12%", "-3"
    direction: 'up' | 'down' | 'neutral'
  }
  className?: string
}

const DELTA_COLORS = {
  up: 'text-success-fg',
  down: 'text-error-fg',
  neutral: 'text-warm-600',
}

export function StatCard({ label, value, delta, className = '' }: StatCardProps) {
  return (
    <div className={`bg-white border border-warm-300 rounded-18 px-5 py-4 ${className}`}>
      <p className="text-label font-medium text-warm-700 mb-1.5">{label}</p>
      <p className="tnum text-[28px] font-semibold text-warm-950 leading-none">
        {value}
      </p>
      {delta && (
        <p className={`tnum text-caption font-medium mt-1.5 ${DELTA_COLORS[delta.direction]}`}>
          {delta.value}
        </p>
      )}
    </div>
  )
}
