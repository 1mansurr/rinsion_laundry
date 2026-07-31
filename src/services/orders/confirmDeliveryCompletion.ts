'use server'

import { createClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { requireActiveSubscription } from '@/lib/auth'
import { logisticsProvider } from '@/lib/logistics'
import { ACTIVITY_ACTION_TYPES } from '@/constants/subscriptionStatuses'
import { revalidatePath } from 'next/cache'
import type { ServiceResult } from '@/types/serviceResult'

/**
 * Staff confirms the rider has handed the order to the customer — the
 * delivery equivalent of verifyAndCollect.ts's pickup-code flow, minus the
 * code (there's no physical counter interaction to verify identity against
 * for a remote delivery). Same balance-must-be-settled rule, same terminal
 * order status ('collected' — the doc's own note on that column: it's the
 * generic "order fulfilled" state regardless of how the customer got it).
 */
export async function confirmDeliveryCompletion(orderId: string): Promise<ServiceResult<null>> {
  const profile = await getMyProfile()
  if (!profile) return { success: false, error: 'Not authenticated.' }

  const subCheck = await requireActiveSubscription(profile.laundryId)
  if (!subCheck.success) return subCheck

  const supabase = createClient()

  const { data: order } = await supabase
    .from('orders')
    .select('id, status, total, payments(amount), order_refunds(amount)')
    .eq('id', orderId)
    .eq('laundry_id', profile.laundryId)
    .single()
  if (!order) return { success: false, error: 'Order not found.' }
  if (order.status !== 'ready') return { success: false, error: 'Order is not ready for delivery.' }

  const payments = (order.payments as { amount: number }[]) ?? []
  const refunds = (order.order_refunds as { amount: number }[]) ?? []
  const paid = payments.reduce((s, p) => s + Number(p.amount), 0) - refunds.reduce((s, r) => s + Number(r.amount), 0)
  if (paid < Number(order.total)) {
    const balance = (Number(order.total) - paid).toFixed(2)
    return { success: false, error: `Balance of GHS ${balance} outstanding. Record payment first.` }
  }

  const { data: logisticsRow } = await supabase
    .from('logistics_requests')
    .select('id, provider_ref_id, status')
    .eq('order_id', orderId)
    .eq('kind', 'delivery')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!logisticsRow) return { success: false, error: 'No delivery has been requested for this order.' }
  if (logisticsRow.status === 'completed') {
    return { success: false, error: 'This delivery has already been marked complete.' }
  }

  const confirmResult = await logisticsProvider.confirmDelivery(logisticsRow.provider_ref_id)
  if (!confirmResult.success) {
    return { success: false, error: confirmResult.errorMessage ?? 'Failed to confirm delivery with the logistics provider.' }
  }

  await supabase
    .from('logistics_requests')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', logisticsRow.id)

  await supabase.from('orders').update({ status: 'collected' }).eq('id', orderId).eq('laundry_id', profile.laundryId)

  await supabase.from('order_status_history').insert({
    order_id: orderId,
    employee_id: profile.id,
    previous_status: 'ready',
    new_status: 'collected',
  })

  await supabase.from('activity_logs').insert({
    laundry_id: profile.laundryId,
    order_id: orderId,
    employee_id: profile.id,
    action_type: ACTIVITY_ACTION_TYPES.DELIVERY_COMPLETED,
    description: 'Order delivered to customer',
  })

  revalidatePath(`/orders/${orderId}`)
  revalidatePath('/orders')
  return { success: true, data: null }
}
