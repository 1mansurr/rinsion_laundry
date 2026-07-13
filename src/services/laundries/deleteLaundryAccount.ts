'use server'

import { createClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { requireRole } from '@/lib/auth'
import { revalidateTag } from 'next/cache'
import { ROLES } from '@/constants/statuses'
import { ACTIVITY_ACTION_TYPES } from '@/constants/subscriptionStatuses'
import type { ServiceResult } from '@/types/serviceResult'

/**
 * Tenant-admin action — closes the whole laundry account. Runs on the
 * regular RLS-bound session client (this is the tenant's own admin acting
 * on their own laundry, not a cross-tenant platform action, so this does
 * NOT use createAdminClient()/requirePlatformAdmin() the way
 * services/platform/suspendLaundry.ts does).
 *
 * laundries.deleted_at is the signal getMyProfile() checks to fully block
 * navigation for every employee of this laundry, not just the caller —
 * revalidateTag('employee-profile') invalidates the shared, unparameterized
 * cache tag for everyone at once, so this takes effect on each employee's
 * very next request, not after the 5-minute cache TTL.
 */
export async function deleteLaundryAccount(): Promise<ServiceResult<null>> {
  const profile = await getMyProfile()
  const check = requireRole(profile, ROLES.ADMIN)
  if (!check.success) return check
  const caller = check.data

  const supabase = createClient()

  const { error: laundryErr } = await supabase
    .from('laundries')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', caller.laundryId)

  if (laundryErr) return { success: false, error: laundryErr.message }

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('laundry_id', caller.laundryId)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (sub) {
    await supabase.from('subscriptions').update({ status: 'cancelled' }).eq('id', sub.id)
  }

  await supabase.from('activity_logs').insert({
    laundry_id: caller.laundryId,
    employee_id: caller.id,
    action_type: ACTIVITY_ACTION_TYPES.LAUNDRY_ACCOUNT_DELETED,
    description: 'Laundry account closed',
  })

  revalidateTag('employee-profile')
  await supabase.auth.signOut()

  return { success: true, data: null }
}
