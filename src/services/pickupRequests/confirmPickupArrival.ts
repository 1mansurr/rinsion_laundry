'use server'

import { createClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { requireActiveSubscription } from '@/lib/auth'
import { logisticsProvider } from '@/lib/logistics'
import { ACTIVITY_ACTION_TYPES } from '@/constants/subscriptionStatuses'
import { revalidatePath } from 'next/cache'
import type { ServiceResult } from '@/types/serviceResult'

/**
 * Marks the pickup leg complete (a rider has physically delivered the
 * customer's laundry to the shop) and transitions the order from 'draft' to
 * 'received' — bypassing the generic staff "Advance" dropdown in
 * OrderDetail.tsx by design (constants/statuses.ts's comment on 'draft'
 * explains why): this is the ONLY path a draft order can reach 'received'
 * through.
 */
export async function confirmPickupArrival(pickupRequestId: string): Promise<ServiceResult<null>> {
  const profile = await getMyProfile()
  if (!profile) return { success: false, error: 'Not authenticated.' }

  const subCheck = await requireActiveSubscription(profile.laundryId)
  if (!subCheck.success) return subCheck

  const supabase = createClient()

  const { data: pr } = await supabase
    .from('pickup_requests')
    .select('id, order_id, approval_status')
    .eq('id', pickupRequestId)
    .eq('laundry_id', profile.laundryId)
    .single()

  if (!pr) return { success: false, error: 'Pickup request not found.' }
  if (pr.approval_status !== 'approved') {
    return { success: false, error: 'Pickup request must be approved first.' }
  }

  const { data: logisticsRow } = await supabase
    .from('logistics_requests')
    .select('id, provider_ref_id, status')
    .eq('order_id', pr.order_id)
    .eq('kind', 'pickup')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!logisticsRow) return { success: false, error: 'No logistics record found for this pickup.' }
  if (logisticsRow.status === 'completed') {
    return { success: false, error: 'This pickup has already been marked complete.' }
  }

  const confirmResult = await logisticsProvider.confirmPickup(logisticsRow.provider_ref_id)
  if (!confirmResult.success) {
    return { success: false, error: confirmResult.errorMessage ?? 'Failed to confirm pickup with the logistics provider.' }
  }

  await supabase
    .from('logistics_requests')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', logisticsRow.id)

  const { data: order } = await supabase.from('orders').select('status').eq('id', pr.order_id).single()
  if (!order || order.status !== 'draft') {
    return { success: false, error: 'Order is no longer in draft status.' }
  }

  await supabase.from('orders').update({ status: 'received' }).eq('id', pr.order_id)

  await supabase.from('order_status_history').insert({
    order_id: pr.order_id,
    employee_id: profile.id,
    previous_status: 'draft',
    new_status: 'received',
  })

  await supabase.from('activity_logs').insert({
    laundry_id: profile.laundryId,
    order_id: pr.order_id,
    employee_id: profile.id,
    action_type: ACTIVITY_ACTION_TYPES.PICKUP_COMPLETED,
    description: 'Customer laundry received at shop (pickup completed)',
  })

  revalidatePath('/pickup-requests')
  revalidatePath(`/orders/${pr.order_id}`)
  revalidatePath('/orders')
  return { success: true, data: null }
}
