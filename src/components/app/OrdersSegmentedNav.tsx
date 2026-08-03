import Link from 'next/link'

interface Props {
  active: 'orders' | 'requests'
  pendingCount: number
}

export function OrdersSegmentedNav({ active, pendingCount }: Props) {
  return (
    <div className="inline-flex bg-warm-150 rounded-12 p-1 mb-[18px]">
      <Link
        href="/orders"
        className={`px-4 py-2 rounded-10 text-ui font-semibold transition-colors ${
          active === 'orders' ? 'bg-white text-warm-950 shadow-[0_1px_3px_rgba(0,0,0,.08)]' : 'text-warm-700'
        }`}
      >
        Orders
      </Link>
      <Link
        href="/pickup-requests"
        className={`px-4 py-2 rounded-10 text-ui font-semibold transition-colors flex items-center gap-1.5 ${
          active === 'requests' ? 'bg-white text-warm-950 shadow-[0_1px_3px_rgba(0,0,0,.08)]' : 'text-warm-700'
        }`}
      >
        Requests
        {pendingCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-brand text-canvas text-[10.5px] font-bold">
            {pendingCount}
          </span>
        )}
      </Link>
    </div>
  )
}
