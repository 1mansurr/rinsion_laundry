import { redirect } from 'next/navigation'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { getOrderDetail } from '@/services/orders/getOrderDetail'
import { OrderDetail } from './OrderDetail'

interface Props {
  params: { id: string }
}

export default async function OrderDetailPage({ params }: Props) {
  const profile = await getMyProfile()
  if (!profile) redirect('/login')

  const data = await getOrderDetail(params.id, profile.laundryId)

  if (!data) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <p className="text-warm-600">Order not found.</p>
    </div>
  )

  return <OrderDetail {...data} />
}
