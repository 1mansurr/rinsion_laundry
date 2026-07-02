import { NextResponse } from 'next/server'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { getActiveSubscription } from '@/services/subscriptions/getActive'
import { computeSmsUsage } from '@/services/notifications/computeSmsUsage'
import { createClient } from '@/lib/supabase'

export async function GET() {
  const profile = await getMyProfile()
  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createClient()

  const subscription = await getActiveSubscription(profile.laundryId)

  const smsUsed = subscription
    ? await computeSmsUsage(profile.laundryId, subscription.cycleStartDate, subscription.cycleEndDate)
    : 0

  const { data: messages } = await supabase
    .from('sms_messages')
    .select('id, trigger_event, status, phone, counts_toward_cap, created_at, error_message')
    .eq('laundry_id', profile.laundryId)
    .order('created_at', { ascending: false })
    .limit(100)

  const quota = subscription?.smsQuota ?? 0
  const usagePct = quota > 0 ? Math.min(100, Math.round((smsUsed / quota) * 100)) : 0

  return NextResponse.json({
    subscription,
    smsUsed,
    messages: messages ?? [],
    quota,
    usagePct,
  })
}
