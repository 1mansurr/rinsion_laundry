'use server'

import { createClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { revalidatePath } from 'next/cache'
import { ORDER_STATUS_TRANSITIONS } from '@/constants/statuses'
import type { OrderStatus } from '@/constants/statuses'
import type { ServiceResult } from '@/types/serviceResult'

export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus
): Promise<ServiceResult<null>> {
  const supabase = createClient()
  const profile = await getMyProfile()
  if (!profile) return { success: false, error: 'Not authenticated.' }
  const emp = { id: profile.id, laundry_id: profile.laundryId }

  const { data: order } = await supabase
    .from('orders')
    .select('status, total')
    .eq('id', orderId)
    .single()

  if (!order) return { success: false, error: 'Order not found.' }

  const currentStatus = order.status as OrderStatus
  const allowed = ORDER_STATUS_TRANSITIONS[currentStatus]
  if (!allowed.includes(newStatus)) {
    return { success: false, error: `Cannot move from ${currentStatus} to ${newStatus}.` }
  }

  if (newStatus === 'collected') {
    const { data: pmts } = await supabase.from('payments').select('amount').eq('order_id', orderId)
    const { data: refs } = await supabase.from('order_refunds').select('amount').eq('order_id', orderId)
    const paid = (pmts ?? []).reduce((s, p) => s + Number(p.amount), 0)
      - (refs ?? []).reduce((s, r) => s + Number(r.amount), 0)
    if (paid < Number(order.total)) {
      const bal = (Number(order.total) - paid).toFixed(2)
      return { success: false, error: `Balance of GHS ${bal} outstanding. Record payment first.` }
    }
  }

  await supabase
    .from('orders')
    .update({ status: newStatus })
    .eq('id', orderId)

  await supabase.from('order_status_history').insert({
    order_id: orderId,
    employee_id: emp.id,
    previous_status: currentStatus,
    new_status: newStatus,
  })

  await supabase.from('activity_logs').insert({
    laundry_id: emp.laundry_id,
    order_id: orderId,
    employee_id: emp.id,
    action_type: 'STATUS_UPDATED',
    description: `Status changed from ${currentStatus} to ${newStatus}`,
  })

  // Send order-ready SMS when status moves to Ready — non-blocking
  if (newStatus === 'ready') {
    import('@/services/notifications/sendOrderReadySms')
      .then(m => m.sendOrderReadySms(orderId))
      .catch(() => null)
  }

  revalidatePath(`/orders/${orderId}`)
  revalidatePath('/orders')
  return { success: true, data: null }
}
