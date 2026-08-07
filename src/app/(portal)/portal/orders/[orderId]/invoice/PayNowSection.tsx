'use client'

import { useRouter } from 'next/navigation'
import { OrderPaystackPayButton } from '@/components/app/OrderPaystackPayButton'
import { formatCurrency } from '@/utils/formatCurrency'

interface Props {
  orderId: string
  balanceDue: number
  defaultPhone: string
}

export function PayNowSection({ orderId, balanceDue, defaultPhone }: Props) {
  const router = useRouter()

  return (
    <div className="border-t border-warm-200 pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-ui font-semibold text-warm-950">Balance due</p>
        <p className="tnum text-ui font-bold text-error-fg">{formatCurrency(balanceDue)}</p>
      </div>
      <OrderPaystackPayButton
        orderId={orderId}
        balance={balanceDue}
        defaultPhone={defaultPhone}
        onPaid={() => router.refresh()}
      />
    </div>
  )
}
