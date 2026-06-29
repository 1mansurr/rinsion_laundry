import { getMyProfile } from '@/services/employees/getMyProfile'
import { getActiveSubscription } from '@/services/subscriptions/getActive'
import { computeSmsUsage } from '@/services/notifications/computeSmsUsage'
import { createClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const TRIGGER_LABELS: Record<string, string> = {
  ORDER_CREATED:            'Order created',
  ORDER_READY:              'Order ready',
  PICKUP_CODE_RESEND:       'Pickup code resend',
  QUOTA_WARNING_70:         'Quota warning (70%)',
  RENEWAL_REMINDER_3_DAYS:  'Renewal reminder (3 days)',
  RENEWAL_REMINDER_1_DAY:   'Renewal reminder (1 day)',
  RENEWAL_REMINDER_DAY_OF:  'Renewal reminder (today)',
}

export default async function SmsUsagePage() {
  const profile = await getMyProfile()
  if (!profile) return null
  if (profile.role !== 'admin') redirect('/dashboard')

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

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/settings" className="text-sm text-gray-400 hover:text-gray-700">Settings</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-sm font-semibold text-gray-900">SMS Usage</h1>
      </div>

      {subscription && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">{smsUsed} of {quota} SMS used</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Cycle: {subscription.cycleStartDate} → {subscription.cycleEndDate}
              </p>
            </div>
            <span className={`text-lg font-bold ${usagePct >= 70 ? 'text-amber-500' : 'text-gray-900'}`}>
              {usagePct}%
            </span>
          </div>
          <div className="bg-gray-100 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${usagePct >= 70 ? 'bg-amber-400' : 'bg-gray-900'}`}
              style={{ width: `${usagePct}%` }}
            />
          </div>
          {smsUsed > quota && (
            <p className="text-xs text-amber-600 mt-2">
              {smsUsed - quota} overage messages at GHS 0.05 each = GHS {((smsUsed - quota) * 0.05).toFixed(2)} added to next invoice.
            </p>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Message Log</h2>
        </div>
        {(messages ?? []).length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No SMS messages sent yet.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {(messages ?? []).map(sms => (
              <div key={sms.id} className="flex items-start justify-between px-5 py-3">
                <div className="flex items-center gap-2.5">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1 ${sms.status === 'sent' ? 'bg-green-400' : 'bg-red-400'}`} />
                  <div>
                    <p className="text-sm text-gray-900">{TRIGGER_LABELS[sms.trigger_event] ?? sms.trigger_event}</p>
                    <p className="text-xs text-gray-400">{sms.phone}</p>
                    {sms.status === 'failed' && sms.error_message && (
                      <p className="text-xs text-red-500 mt-0.5">{sms.error_message}</p>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className="text-xs text-gray-400">{sms.created_at.replace('T', ' ').substring(0, 16)}</p>
                  {!sms.counts_toward_cap && (
                    <p className="text-xs text-gray-300 mt-0.5">free</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
