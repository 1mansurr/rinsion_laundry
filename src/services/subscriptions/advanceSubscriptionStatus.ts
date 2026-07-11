import { createAdminClient } from '@/lib/supabase'
import { sendRenewalReminderSms, type RenewalReminderTrigger } from '@/services/notifications/sendRenewalReminderSms'
import { GRACE_PERIOD_SOFT_DAYS, GRACE_PERIOD_HARD_DAYS } from '@/constants/plans'
import { ACTIVITY_ACTION_TYPES } from '@/constants/subscriptionStatuses'

export interface AdvanceResult {
  processed: number
  transitioned: number
  remindersSent: number
  errors: string[]
}

/**
 * Daily cron: advance subscription statuses and send renewal reminders.
 *
 * Status transitions (days past cycle_end_date):
 *   active / trialing  → soft_block  at daysOverdue >= 1
 *   soft_block         → hard_block  at daysOverdue >= 1 + GRACE_PERIOD_SOFT_DAYS (11)
 *   hard_block         → locked      at daysOverdue >= 11 + GRACE_PERIOD_HARD_DAYS  (21)
 *
 * Renewal reminders sent to laundry admin at daysUntilEnd = 3, 1, 0.
 * Deduplicated: checks sms_messages for the current cycle before sending.
 *
 * Uses createAdminClient() throughout — no user session available in cron context.
 * Spec reference: Rinsion_Business_Overview.md → Subscription Cycles & Renewal
 */
export async function advanceSubscriptionStatus(): Promise<AdvanceResult> {
  const supabase = createAdminClient()

  // Midnight UTC at job start — consistent anchor for all date math
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  const { data: subs, error } = await supabase
    .from('subscriptions')
    .select('id, laundry_id, plan, status, cycle_start_date, cycle_end_date')
    .not('status', 'in', '("cancelled","locked")')

  if (error) return { processed: 0, transitioned: 0, remindersSent: 0, errors: [error.message] }
  if (!subs?.length) return { processed: 0, transitioned: 0, remindersSent: 0, errors: [] }

  type SubRow = (typeof subs)[number]

  // Each subscription's status transition + reminder check is independent of
  // every other laundry's — run them concurrently instead of one at a time,
  // so this cron doesn't scale linearly (and risk the function timeout) with
  // the number of tenants. Promise.allSettled so one laundry's failure
  // doesn't stop the rest from being processed.
  async function processSub(sub: SubRow): Promise<{ transitioned: boolean; remindersSent: boolean }> {
    const cycleEnd = new Date(sub.cycle_end_date + 'T00:00:00.000Z')
    // daysDiff > 0 = past due; 0 = expires today; < 0 = days remaining
    const daysDiff = Math.floor((today.getTime() - cycleEnd.getTime()) / 86400000)

    // ── Status transitions ──────────────────────────────────────────────────
    let newStatus: string | null = null
    let actionType: string | null = null

    if ((sub.status === 'active' || sub.status === 'trialing') && daysDiff >= 1) {
      newStatus = 'soft_block'
      actionType = ACTIVITY_ACTION_TYPES.SUBSCRIPTION_GRACE_PERIOD_ENTERED
    } else if (sub.status === 'soft_block' && daysDiff >= 1 + GRACE_PERIOD_SOFT_DAYS) {
      newStatus = 'hard_block'
      actionType = ACTIVITY_ACTION_TYPES.SUBSCRIPTION_HARD_BLOCK_ENTERED
    } else if (sub.status === 'hard_block' && daysDiff >= 1 + GRACE_PERIOD_SOFT_DAYS + GRACE_PERIOD_HARD_DAYS) {
      newStatus = 'locked'
      actionType = ACTIVITY_ACTION_TYPES.SUBSCRIPTION_LOCKED
    }

    let transitioned = false
    if (newStatus && actionType) {
      await supabase
        .from('subscriptions')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', sub.id)

      await supabase.from('activity_logs').insert({
        laundry_id: sub.laundry_id,
        employee_id: null,
        action_type: actionType,
        description: `Subscription moved to ${newStatus} (${daysDiff} days past cycle end)`,
      })

      transitioned = true
    }

    // ── Renewal reminders (active/trialing only, 3/1/0 days before end) ────
    // daysUntilEnd is the inverse of daysDiff; only [3,1,0] trigger reminders
    let remindersSent = false
    const daysUntilEnd = -daysDiff
    if (['active', 'trialing'].includes(sub.status) && [3, 1, 0].includes(daysUntilEnd)) {
      const triggerEvent: RenewalReminderTrigger =
        daysUntilEnd === 0 ? 'RENEWAL_REMINDER_DAY_OF'
        : daysUntilEnd === 1 ? 'RENEWAL_REMINDER_1_DAY'
        : 'RENEWAL_REMINDER_3_DAYS'

      // Deduplicate: skip if already sent this cycle
      const { count } = await supabase
        .from('sms_messages')
        .select('id', { count: 'exact', head: true })
        .eq('laundry_id', sub.laundry_id)
        .eq('trigger_event', triggerEvent)
        .gte('created_at', sub.cycle_start_date)

      if ((count ?? 0) === 0) {
        remindersSent = await sendRenewalReminderSms(sub.laundry_id, sub.plan, daysUntilEnd, triggerEvent)
      }
    }

    return { transitioned, remindersSent }
  }

  const results = await Promise.allSettled(subs.map(processSub))

  const errors: string[] = []
  let transitioned = 0
  let remindersSent = 0

  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      if (result.value.transitioned) transitioned++
      if (result.value.remindersSent) remindersSent++
    } else {
      const e = result.reason
      errors.push(`laundry ${subs[i].laundry_id}: ${e instanceof Error ? e.message : String(e)}`)
    }
  })

  return { processed: subs.length, transitioned, remindersSent, errors }
}
