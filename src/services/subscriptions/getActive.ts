import { createClient } from '@/lib/supabase'
import type { SubscriptionStatus, SubscriptionPlan } from '@/constants/subscriptionStatuses'

export interface ActiveSubscription {
  id: string
  plan: SubscriptionPlan
  status: SubscriptionStatus
  cycleStartDate: string
  cycleEndDate: string
  smsQuota: number
  daysLeft: number
}

export async function getActiveSubscription(laundryId: string): Promise<ActiveSubscription | null> {
  const supabase = createClient()

  const { data } = await supabase
    .from('subscriptions')
    .select('id, plan, status, cycle_start_date, cycle_end_date, sms_quota')
    .eq('laundry_id', laundryId)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return null

  const daysLeft = Math.max(0, Math.ceil(
    (new Date(data.cycle_end_date).getTime() - Date.now()) / 86400000
  ))

  return {
    id: data.id,
    plan: data.plan as SubscriptionPlan,
    status: data.status as SubscriptionStatus,
    cycleStartDate: data.cycle_start_date,
    cycleEndDate: data.cycle_end_date,
    smsQuota: data.sms_quota,
    daysLeft,
  }
}
