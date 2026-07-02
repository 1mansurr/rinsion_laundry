import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase'
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

interface SubscriptionRow {
  id: string
  plan: string
  status: string
  cycle_start_date: string
  cycle_end_date: string
  sms_quota: number
}

// Cached for 60 s — subscription status rarely changes mid-session.
// Uses admin client because unstable_cache runs outside request context (no cookies).
const fetchSubscriptionRow = unstable_cache(
  async (laundryId: string): Promise<SubscriptionRow | null> => {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('subscriptions')
      .select('id, plan, status, cycle_start_date, cycle_end_date, sms_quota')
      .eq('laundry_id', laundryId)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    return data ?? null
  },
  ['subscription'],
  { revalidate: 60, tags: ['subscription'] },
)

export async function getActiveSubscription(laundryId: string): Promise<ActiveSubscription | null> {
  const data = await fetchSubscriptionRow(laundryId)
  if (!data) return null

  // Compute daysLeft outside the cache so it's always fresh.
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
