import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { getSmsUsageData, type SmsMessageLogRow } from '@/services/notifications/getSmsUsageData'
import { RestrictedCard } from '@/components/app/RestrictedCard'

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
  if (!profile) redirect('/login')

  if (profile.role !== 'admin') {
    return (
      <div className="max-w-3xl mx-auto px-4 py-4 md:p-6">
        <div className="flex items-center gap-1.5 mb-6 text-caption">
          <Link href="/settings" className="text-warm-600 font-semibold hover:text-warm-900">Settings</Link>
          <span className="text-warm-400">/</span>
          <span className="text-warm-950 font-bold">SMS Usage</span>
        </div>
        <RestrictedCard />
      </div>
    )
  }

  const { subscription, smsUsed, messages, quota, usagePct } = await getSmsUsageData(profile.laundryId)

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 md:p-6">
      <div className="flex items-center gap-1.5 mb-5 md:mb-6 text-caption">
        <Link href="/settings" className="text-warm-600 font-semibold hover:text-warm-900">Settings</Link>
        <span className="text-warm-400">/</span>
        <span className="text-warm-950 font-bold">SMS Usage</span>
      </div>

      {subscription && (
        <div className="bg-white border border-warm-300 rounded-10 p-5 mb-4">
          <p className="tnum text-ui font-bold text-warm-950 mb-1">{smsUsed} of {quota} SMS used</p>
          <p className="text-caption text-warm-600 mb-3.5">
            Cycle: {subscription.cycleStartDate} → {subscription.cycleEndDate}
          </p>
          <div className="h-1.5 bg-warm-200 rounded-full overflow-hidden mb-1.5">
            <div
              className={`h-full rounded-full ${usagePct >= 70 ? 'bg-warning' : 'bg-brand'}`}
              style={{ width: `${Math.min(100, usagePct)}%` }}
            />
          </div>
          <p className="tnum text-caption text-warm-500">{usagePct}% used</p>
          {smsUsed > quota && (
            <p className="tnum text-caption font-semibold text-error-fg mt-2.5">
              Projected overage: GHS {((smsUsed - quota) * 0.05).toFixed(2)} ({smsUsed - quota} messages at GHS 0.05 each)
            </p>
          )}
        </div>
      )}

      <div className="bg-white border border-warm-300 rounded-10 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-warm-200">
          <h2 className="text-ui font-semibold text-warm-950">Message Log</h2>
        </div>
        {messages.length === 0 ? (
          <p className="text-body text-warm-500 text-center py-8">No SMS messages sent yet.</p>
        ) : (
          <div className="divide-y divide-warm-100">
            {messages.map((sms: SmsMessageLogRow) => (
              <div key={sms.id} className="flex items-start gap-2.5 px-5 py-3">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-[5px] ${sms.status === 'sent' ? 'bg-success' : 'bg-error'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-ui-sm font-semibold text-warm-950">{TRIGGER_LABELS[sms.trigger_event] ?? sms.trigger_event}</p>
                  <p className="tnum text-caption text-warm-500 mt-0.5">{sms.phone} · {sms.created_at.replace('T', ' ').substring(0, 16)}</p>
                  {sms.status === 'failed' && sms.error_message && (
                    <p className="text-caption text-error-fg mt-0.5">{sms.error_message}</p>
                  )}
                </div>
                {!sms.counts_toward_cap && (
                  <span className="shrink-0 text-[10.5px] font-bold text-warm-600 bg-warm-150 px-2 py-1 rounded-full">FREE</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
