'use server'

import { createClient } from '@/lib/supabase'
import { sendSystemSms } from './sendSms'

/**
 * Sends the 70% SMS quota warning to the laundry admin.
 * Called once per cycle — sets sms_warning_70_sent_at to prevent repeats.
 * Does not count toward the laundry's SMS quota (system message).
 *
 * Spec reference: Rinsion_Business_Overview.md → SMS Quotas and Overage → Warnings
 */
export async function sendQuotaWarningSms(
  laundryId: string,
  subscriptionId: string,
  used: number,
  quota: number,
): Promise<void> {
  const supabase = createClient()

  // Get admin phone
  const { data: admin } = await supabase
    .from('employees')
    .select('phone, first_name')
    .eq('laundry_id', laundryId)
    .eq('role', 'admin')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!admin?.phone) return

  // TODO: confirm message wording after interviews
  const message = `Rinsion: You've used ${used} of ${quota} SMS messages this cycle (70% threshold). Additional messages cost GHS 0.05 each. To increase your limit, upgrade your plan.`

  await sendSystemSms({ laundryId, phone: admin.phone, message, triggerEvent: 'QUOTA_WARNING_70' })

  // Record that the warning was sent so it doesn't fire again this cycle
  await supabase
    .from('subscriptions')
    .update({ sms_warning_70_sent_at: new Date().toISOString() })
    .eq('id', subscriptionId)
}
