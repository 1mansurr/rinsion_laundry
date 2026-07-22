export function PageSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="max-w-[1180px] mx-auto px-7 py-7 animate-pulse">
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="h-8 bg-warm-200 rounded-12 w-40 mb-2" />
          <div className="h-4 bg-warm-100 rounded-12 w-24" />
        </div>
        <div className="h-10 bg-warm-200 rounded-12 w-28" />
      </div>
      <div className="bg-white border border-warm-300 rounded-18 overflow-hidden">
        <div className="h-10 bg-warm-100 border-b border-warm-200" />
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="px-[22px] py-[14px] border-b border-[#F4F0EA] last:border-0 flex items-center gap-4"
          >
            <div className="h-4 bg-warm-100 rounded flex-1" />
            <div className="h-4 bg-warm-100 rounded flex-[1.5]" />
            <div className="h-4 bg-warm-100 rounded w-16" />
            <div className="h-4 bg-warm-100 rounded w-20" />
            <div className="h-4 bg-warm-100 rounded w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="max-w-[1180px] mx-auto px-7 py-7 animate-pulse">
      <div className="h-8 bg-warm-200 rounded-12 w-40 mb-6" />
      <div className="grid grid-cols-3 gap-4 mb-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="bg-white border border-warm-300 rounded-18 px-5 py-[18px]">
            <div className="h-3 bg-warm-100 rounded w-24 mb-3" />
            <div className="h-7 bg-warm-200 rounded w-32" />
          </div>
        ))}
      </div>
      <div className="bg-white border border-warm-300 rounded-18 h-64" />
    </div>
  )
}
