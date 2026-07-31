'use server'

import { createClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { requireActiveSubscription } from '@/lib/auth'
import { logisticsProvider } from '@/lib/logistics'
import { ACTIVITY_ACTION_TYPES } from '@/constants/subscriptionStatuses'
import { revalidatePath } from 'next/cache'
import type { ServiceResult } from '@/types/serviceResult'

/**
 * The laundry's approval step (docs/customer-portal+rider.md's core
 * principle: no rider is contacted until this happens). Only after this
 * does logisticsProvider.createPickupRequest ever get called.
 */
export async function approvePickupRequest(pickupRequestId: string): Promise<ServiceResult<null>> {
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
  if (pr.approval_status !== 'pending' && pr.approval_status !== 'delayed') {
    return { success: false, error: `Cannot approve a request that is already ${pr.approval_status}.` }
  }

  const providerResult = await logisticsProvider.createPickupRequest({ laundryId: profile.laundryId, orderId: pr.order_id })
  if (!providerResult.success) {
    return { success: false, error: providerResult.errorMessage ?? 'Failed to reach the logistics provider.' }
  }

  await supabase
    .from('pickup_requests')
    .update({ approval_status: 'approved', decided_by_employee_id: profile.id, decided_at: new Date().toISOString() })
    .eq('id', pickupRequestId)

  await supabase.from('logistics_requests').insert({
    laundry_id: profile.laundryId,
    order_id: pr.order_id,
    kind: 'pickup',
    provider: 'rinsion_riders',
    provider_ref_id: providerResult.providerRefId ?? null,
    requested_by_employee_id: profile.id,
    rider_company_id: providerResult.riderCompanyId ?? null,
  })

  await supabase.from('activity_logs').insert({
    laundry_id: profile.laundryId,
    order_id: pr.order_id,
    employee_id: profile.id,
    action_type: ACTIVITY_ACTION_TYPES.PICKUP_APPROVED,
    description: 'Pickup request approved',
  })

  revalidatePath('/pickup-requests')
  return { success: true, data: null }
}
