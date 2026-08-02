import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { decryptField } from '@/lib/crypto'
import { getMobileEmployeeProfile } from '@/services/mobile/getMobileEmployeeProfile'
import { getActiveSubscription } from '@/services/subscriptions/getActive'
import { ROLES } from '@/constants/statuses'

/** Mirrors services/notifications/getSmsUsageData.ts (+ computeSmsUsage.ts) via the admin client. Read-only. */
export async function GET(request: NextRequest) {
  const profile = await getMobileEmployeeProfile(request)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (profile.role !== ROLES.ADMIN) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()
  const subscription = await getActiveSubscription(profile.laundryId)

  let smsUsed = 0
  if (subscription) {
    const { count } = await admin
      .from('sms_messages')
      .select('id', { count: 'exact', head: true })
      .eq('laundry_id', profile.laundryId)
      .eq('counts_toward_cap', true)
      .gte('created_at', `${subscription.cycleStartDate}T00:00:00`)
      .lte('created_at', `${subscription.cycleEndDate}T23:59:59`)
    smsUsed = count ?? 0
  }

  const { data: messages } = await admin
    .from('sms_messages')
    .select('id, trigger_event, status, phone, counts_toward_cap, created_at, error_message')
    .eq('laundry_id', profile.laundryId)
    .order('created_at', { ascending: false })
    .limit(100)

  const quota = subscription?.smsQuota ?? 0
  const usagePct = quota > 0 ? Math.min(100, Math.round((smsUsed / quota) * 100)) : 0

  return NextResponse.json({
    subscription: subscription ? { cycleStartDate: subscription.cycleStartDate, cycleEndDate: subscription.cycleEndDate, smsQuota: subscription.smsQuota } : null,
    smsUsed,
    quota,
    usagePct,
    messages: (messages ?? []).map(m => ({ ...m, phone: decryptField(m.phone) ?? m.phone })),
  })
}
