'use server'

import { createClient } from '@/lib/supabase'
import { getActiveSubscription } from '@/services/subscriptions/getActive'
import { computeSmsUsage } from '@/services/notifications/computeSmsUsage'

export interface SmsMessageLogRow {
  id: string
  trigger_event: string
  status: string
  phone: string
  counts_toward_cap: boolean
  created_at: string
  error_message: string | null
}

export interface SmsUsageData {
  subscription: { cycleStartDate: string; cycleEndDate: string; smsQuota: number } | null
  smsUsed: number
  messages: SmsMessageLogRow[]
  quota: number
  usagePct: number
}

export async function getSmsUsageData(laundryId: string): Promise<SmsUsageData> {
  const supabase = createClient()

  const subscription = await getActiveSubscription(laundryId)

  const smsUsed = subscription
    ? await computeSmsUsage(laundryId, subscription.cycleStartDate, subscription.cycleEndDate)
    : 0

  const { data: messages } = await supabase
    .from('sms_messages')
    .select('id, trigger_event, status, phone, counts_toward_cap, created_at, error_message')
    .eq('laundry_id', laundryId)
    .order('created_at', { ascending: false })
    .limit(100)

  const quota = subscription?.smsQuota ?? 0
  const usagePct = quota > 0 ? Math.min(100, Math.round((smsUsed / quota) * 100)) : 0

  return {
    subscription,
    smsUsed,
    messages: messages ?? [],
    quota,
    usagePct,
  }
}
