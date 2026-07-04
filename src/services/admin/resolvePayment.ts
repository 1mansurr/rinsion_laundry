'use server'

import { createAdminClient, createClient } from '@/lib/supabase'
import { isInternalAdminEmail } from '@/lib/internal-admins'
import { recordCycleRenewalPayment } from '@/services/subscriptions/recordCycleRenewalPayment'
import { recordUpgradePayment } from '@/services/subscriptions/recordUpgradePayment'
import { ACTIVITY_ACTION_TYPES } from '@/constants/subscriptionStatuses'
import { revalidatePath } from 'next/cache'
import type { ServiceResult } from '@/types/serviceResult'
import type { PlanKey } from '@/constants/plans'

export async function resolvePayment(
  pendingPaymentId: string,
  resolution: 'paid' | 'rejected'
): Promise<ServiceResult<null>> {
  const sessionClient = createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user?.email || !isInternalAdminEmail(user.email)) {
    return { success: false, error: 'Unauthorized.' }
  }

  const supabase = createAdminClient()

  const { data: pending } = await supabase
    .from('pending_payments')
    .select('*')
    .eq('id', pendingPaymentId)
    .is('resolved_at', null)
    .single()

  if (!pending) return { success: false, error: 'Payment not found or already resolved.' }

  if (resolution === 'paid') {
    let result: { success: boolean; error?: string }

    if (pending.payment_type === 'cycle_renewal' || pending.payment_type === 'trial_conversion') {
      result = await recordCycleRenewalPayment({
        laundryId: pending.laundry_id,
        subscriptionId: pending.subscription_id,
        plan: pending.target_plan as PlanKey,
        recordedByEmail: user.email,
        externalReference: pending.reference_code,
      })
    } else if (pending.payment_type === 'upgrade_prorate') {
      const cycleEnd = new Date(pending.target_cycle_end_date + 'T00:00:00.000Z')
      const today = new Date()
      const daysRemaining = Math.max(0, Math.ceil((cycleEnd.getTime() - today.getTime()) / 86400000))
      result = await recordUpgradePayment({
        laundryId: pending.laundry_id,
        subscriptionId: pending.subscription_id,
        cycleStartDate: pending.target_cycle_start_date,
        cycleEndDate: pending.target_cycle_end_date,
        daysRemaining,
        recordedByEmail: user.email,
        externalReference: pending.reference_code,
      })
    } else {
      return { success: false, error: `Unknown payment type: ${pending.payment_type}` }
    }

    if (!result.success) return { success: false, error: result.error ?? 'Unknown error' }
  }

  await supabase
    .from('pending_payments')
    .update({
      resolved_at: new Date().toISOString(),
      resolved_by_email: user.email,
      resolution,
    })
    .eq('id', pendingPaymentId)

  await supabase.from('activity_logs').insert({
    laundry_id: pending.laundry_id,
    employee_id: null,
    internal_admin_email: user.email,
    action_type: ACTIVITY_ACTION_TYPES.INTERNAL_PAYMENT_RESOLVED,
    description: `Pending payment ${resolution} by Rinsion admin ${user.email}`,
  })

  revalidatePath('/internal/manual-payments')
  return { success: true, data: null }
}
