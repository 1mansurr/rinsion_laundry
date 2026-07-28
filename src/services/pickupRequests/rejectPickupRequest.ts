'use server'

import { createClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { requireActiveSubscription } from '@/lib/auth'
import { ACTIVITY_ACTION_TYPES } from '@/constants/subscriptionStatuses'
import { revalidatePath } from 'next/cache'
import type { ServiceResult } from '@/types/serviceResult'

export async function rejectPickupRequest(pickupRequestId: string): Promise<ServiceResult<null>> {
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
    return { success: false, error: `Cannot reject a request that is already ${pr.approval_status}.` }
  }

  await supabase
    .from('pickup_requests')
    .update({ approval_status: 'rejected', decided_by_employee_id: profile.id, decided_at: new Date().toISOString() })
    .eq('id', pickupRequestId)

  // Reflects the reality that the laundry never picked this order up —
  // cancel the underlying draft order too, the same terminal state any
  // other cancelled order reaches.
  await supabase.from('orders').update({ status: 'cancelled' }).eq('id', pr.order_id)
  await supabase.from('order_status_history').insert({
    order_id: pr.order_id,
    employee_id: profile.id,
    previous_status: 'draft',
    new_status: 'cancelled',
  })

  await supabase.from('activity_logs').insert({
    laundry_id: profile.laundryId,
    order_id: pr.order_id,
    employee_id: profile.id,
    action_type: ACTIVITY_ACTION_TYPES.PICKUP_REJECTED,
    description: 'Pickup request rejected',
  })

  revalidatePath('/pickup-requests')
  return { success: true, data: null }
}
