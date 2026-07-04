'use client'
import { useEffect, useState } from 'react'
import { PageSkeleton } from '@/components/ui/PageSkeleton'
import { OrderDetail } from './OrderDetail'
import type {
  OrderDetailNote,
  OrderDetailPayment,
  OrderDetailRefund,
  OrderDetailItem,
  OrderDetailActivity,
} from './OrderDetail'
import type { OrderStatus } from '@/constants/statuses'

type OrderData = {
  orderId: string
  orderNumber: string
  status: OrderStatus
  priority: string
  pickupCode: string
  pickupDate: string | null
  subtotal: number
  taxAmount: number
  total: number
  amountPaid: number
  customerName: string
  customerId: string
  customerPhone: string
  branchName: string
  createdAt: string
  cancelledAt: string | null
  previousStatusOnCancel: string | null
  items: OrderDetailItem[]
  itemTypes: { id: string; name: string }[]
  payments: OrderDetailPayment[]
  refunds: OrderDetailRefund[]
  notes: OrderDetailNote[]
  activities: OrderDetailActivity[]
}

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<OrderData | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetch(`/api/orders/${params.id}`)
      .then(r => {
        if (r.status === 404) { setNotFound(true); return null }
        return r.json()
      })
      .then(d => { if (d) setData(d) })
  }, [params.id])

  if (notFound) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <p className="text-warm-600">Order not found.</p>
    </div>
  )

  if (!data) return <PageSkeleton rows={4} />

  return <OrderDetail {...data} />
}
