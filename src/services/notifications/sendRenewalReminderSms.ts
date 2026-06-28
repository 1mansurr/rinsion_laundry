'use server'

import { createClient } from '@/lib/supabase'
import { sendSystemSms } from './sendSms'

type ReminderType = 'RENEWAL_REMINDER_3_DAYS' | 'RENEWAL_REMINDER_1_DAY' | 'RENEWAL_REMINDER_DAY_OF'

/**
 * Sends a subscription renewal reminder SMS to the laundry admin.
 * Called by the daily cron job (Phase 10) at 3 days, 1 day, and day-of cycle end.
 * Does not count toward the laundry's SMS quota.
 *
 * Spec reference: Rinsion_Business_Overview.md → Subscription Cycles & Renewal → Renewal Reminders
 */
export async function sendRenewalReminderSms(laundryId: string, daysLeft: number): Promise<void> {
  const supabase = createClient()

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('laundry_id', laundryId)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: admin } = await supabase
    .from('employees')
    .select('phone, first_name')
    .eq('laundry_id', laundryId)
    .eq('role', 'admin')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!admin?.phone || !sub) return

  const plan = sub.plan as string
  const planPrices: Record<string, number> = { starter: 90, growth: 180 }
  const renewalAmount = planPrices[plan] ?? 90
  const upgradePlan = plan === 'starter' ? 'Growth' : null

  let triggerEvent: ReminderType
  let message: string

  // TODO: confirm message wording after interviews
  if (daysLeft === 0) {
    triggerEvent = 'RENEWAL_REMINDER_DAY_OF'
    message = `Rinsion: Your subscription expires today. Send GHS ${renewalAmount} to renew and keep your laundry running. Contact Rinsion to renew.`
  } else if (daysLeft === 1) {
    triggerEvent = 'RENEWAL_REMINDER_1_DAY'
    message = `Rinsion: Your subscription expires tomorrow. Send GHS ${renewalAmount} to renew${upgradePlan ? ` or GHS ${renewalAmount * 2} for ${upgradePlan}` : ''}. Contact Rinsion to renew.`
  } else {
    triggerEvent = 'RENEWAL_REMINDER_3_DAYS'
    message = `Rinsion: Your subscription ends in ${daysLeft} days. Renew for GHS ${renewalAmount}${upgradePlan ? ` or upgrade to ${upgradePlan} for GHS ${renewalAmount * 2}` : ''}. Contact Rinsion to renew.`
  }

  await sendSystemSms({ laundryId, phone: admin.phone, message, triggerEvent })
}
