'use server'

import { createClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { requireActiveSubscription } from '@/lib/auth'
import { logisticsProvider } from '@/lib/logistics'
import { ACTIVITY_ACTION_TYPES } from '@/constants/subscriptionStatuses'
import { revalidatePath } from 'next/cache'
import type { ServiceResult } from '@/types/serviceResult'

/**
 * The delivery leg's own trigger (docs/customer-portal+rider.md: "When the
 * order reaches Ready status, the laundry should have a Request Delivery
 * button"). Unlike pickup, there's no customer request/approval step first —
 * staff act directly once the order is ready. Mirrors approvePickupRequest.ts
 * minus the pickup_requests layer.
 */
export async function requestDelivery(orderId: string): Promise<ServiceResult<null>> {
  const profile = await getMyProfile()
  if (!profile) return { success: false, error: 'Not authenticated.' }

  const subCheck = await requireActiveSubscription(profile.laundryId)
  if (!subCheck.success) return subCheck

  const supabase = createClient()

  const { data: order } = await supabase
    .from('orders')
    .select('id, status')
    .eq('id', orderId)
    .eq('laundry_id', profile.laundryId)
    .single()

  if (!order) return { success: false, error: 'Order not found.' }
  if (order.status !== 'ready') return { success: false, error: 'Order must be ready before requesting delivery.' }

  const { data: existing } = await supabase
    .from('logistics_requests')
    .select('id')
    .eq('order_id', orderId)
    .eq('kind', 'delivery')
    .not('status', 'in', '(cancelled,failed)')
    .maybeSingle()
  if (existing) return { success: false, error: 'A delivery has already been requested for this order.' }

  const providerResult = await logisticsProvider.createDeliveryRequest({ laundryId: profile.laundryId, orderId })
  if (!providerResult.success) {
    return { success: false, error: providerResult.errorMessage ?? 'Failed to reach the logistics provider.' }
  }

  await supabase.from('logistics_requests').insert({
    laundry_id: profile.laundryId,
    order_id: orderId,
    kind: 'delivery',
    provider: 'rinsion_riders',
    provider_ref_id: providerResult.providerRefId ?? null,
    requested_by_employee_id: profile.id,
    rider_company_id: providerResult.riderCompanyId ?? null,
  })

  await supabase.from('activity_logs').insert({
    laundry_id: profile.laundryId,
    order_id: orderId,
    employee_id: profile.id,
    action_type: ACTIVITY_ACTION_TYPES.DELIVERY_REQUESTED,
    description: 'Delivery requested',
  })

  revalidatePath(`/orders/${orderId}`)
  return { success: true, data: null }
}
