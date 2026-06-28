'use server'

import { createClient } from '@/lib/supabase'
import { smsProvider } from '@/lib/sms'
import { computeSmsUsage } from './computeSmsUsage'
import { countFailuresInLast24Hours } from './countFailuresInLast24Hours'
import { SMS_WARNING_THRESHOLD, SMS_FAILURE_24H_THRESHOLD } from '@/constants/plans'

export interface SendSmsInput {
  laundryId: string
  orderId: string | null
  customerId: string | null
  phone: string
  message: string
  triggerEvent: string
}

/**
 * The single chokepoint for all customer-facing SMS sends.
 * Handles quota tracking, failure counting, sms_messages recording, and activity logging.
 * System-to-admin messages (renewal reminders, quota warnings) bypass this and call sendSystemSms.
 *
 * Spec reference: Rinsion_Technical_Overview.md §11 (SMS Quota Enforcement, Failure Counting)
 */
export async function sendSms(input: SendSmsInput): Promise<{ success: boolean }> {
  const supabase = createClient()

  // Get active subscription for quota context
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id, plan, sms_quota, cycle_start_date, cycle_end_date, sms_warning_70_sent_at')
    .eq('laundry_id', input.laundryId)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const quota = sub?.sms_quota ?? 800
  const cycleStart = sub?.cycle_start_date ?? new Date().toISOString().split('T')[0]
  const cycleEnd = sub?.cycle_end_date ?? new Date().toISOString().split('T')[0]

  const used = await computeSmsUsage(input.laundryId, cycleStart, cycleEnd)

  // Fire 70% quota warning once per cycle (side effect — non-blocking)
  if (sub && !sub.sms_warning_70_sent_at && used / quota >= SMS_WARNING_THRESHOLD) {
    const { sendQuotaWarningSms } = await import('./sendQuotaWarningSms')
    sendQuotaWarningSms(input.laundryId, sub.id, used, quota).catch(() => null)
  }

  // Send via provider (overage is allowed — sends always go through)
  const result = await smsProvider.sendSms(input.phone, input.message, 'Rinsion')

  // Determine cap contribution per spec failure-counting rules
  const priorFailures = result.success ? 0 : await countFailuresInLast24Hours(input.laundryId)
  const countsTowardCap = result.success || priorFailures >= SMS_FAILURE_24H_THRESHOLD

  const now = new Date().toISOString()

  await supabase.from('sms_messages').insert({
    laundry_id: input.laundryId,
    order_id: input.orderId,
    customer_id: input.customerId,
    phone: input.phone,
    message: input.message,
    trigger_event: input.triggerEvent,
    provider: 'mnotify',
    provider_message_id: result.providerMessageId ?? null,
    status: result.success ? 'sent' : 'failed',
    counts_toward_cap: countsTowardCap,
    sent_at: result.success ? now : null,
    failed_at: result.success ? null : now,
    error_message: result.errorMessage ?? null,
  })

  await supabase.from('activity_logs').insert({
    laundry_id: input.laundryId,
    order_id: input.orderId,
    action_type: result.success ? 'SMS_SENT' : 'SMS_FAILED',
    description: `${input.triggerEvent} SMS ${result.success ? 'sent' : 'failed'} to ${input.phone}`,
  })

  return { success: result.success }
}

/**
 * Sends a system-to-admin SMS (renewal reminders, quota warnings).
 * Bypasses quota checks. counts_toward_cap is always FALSE for admin messages.
 */
export async function sendSystemSms({
  laundryId,
  phone,
  message,
  triggerEvent,
}: {
  laundryId: string
  phone: string
  message: string
  triggerEvent: string
}): Promise<void> {
  const supabase = createClient()
  const result = await smsProvider.sendSms(phone, message, 'Rinsion')
  const now = new Date().toISOString()

  await supabase.from('sms_messages').insert({
    laundry_id: laundryId,
    order_id: null,
    customer_id: null,
    phone,
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
}
