'use server'

import { createAdminClient } from '@/lib/supabase'
import { smsProvider } from '@/lib/sms'

export type RenewalReminderTrigger = 'RENEWAL_REMINDER_3_DAYS' | 'RENEWAL_REMINDER_1_DAY' | 'RENEWAL_REMINDER_DAY_OF'

/**
 * Sends a subscription renewal reminder SMS to the laundry admin.
 * Called by the daily cron job (advanceSubscriptionStatus) at 3 days, 1 day, and day-of cycle end.
 * Does not count toward the laundry's SMS quota.
 * Uses the admin client — cron context has no user session.
 *
 * Spec reference: Rinsion_Business_Overview.md → Subscription Cycles & Renewal → Renewal Reminders
 */
export async function sendRenewalReminderSms(
  laundryId: string,
  plan: string,
  daysLeft: number,
  triggerEvent: RenewalReminderTrigger,
): Promise<boolean> {
  const supabase = createAdminClient()

  const { data: admin } = await supabase
    .from('employees')
    .select('phone')
    .eq('laundry_id', laundryId)
    .eq('role', 'admin')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!admin?.phone) return false

  const planPrices: Record<string, number> = { starter: 90, growth: 180, trial: 90 }
  const amount = planPrices[plan] ?? 90
  const upgradeNote = plan === 'starter' ? ` or GHS ${amount * 2} for Growth` : ''

  // TODO: confirm message wording after interviews
  let message: string
  if (daysLeft === 0) {
    message = `Rinsion: Your subscription expires today. Send GHS ${amount} to renew and keep your laundry running.`
  } else if (daysLeft === 1) {
    message = `Rinsion: Your subscription expires tomorrow. Send GHS ${amount} to renew${upgradeNote}.`
  } else {
    message = `Rinsion: Your subscription ends in ${daysLeft} days. Renew for GHS ${amount}${upgradeNote}.`
  }

  const result = await smsProvider.sendSms(admin.phone, message, 'Rinsion')
  const now = new Date().toISOString()

  await supabase.from('sms_messages').insert({
    laundry_id: laundryId,
    order_id: null,
    customer_id: null,
    phone: admin.phone,
    message,
    trigger_event: triggerEvent,
    provider: 'mnotify',
    provider_message_id: result.providerMessageId ?? null,
    status: result.success ? 'sent' : 'failed',
    counts_toward_cap: false,
    sent_at: result.success ? now : null,
    failed_at: result.success ? null : now,
    error_message: result.errorMessage ?? null,
  })

  return result.success
}
