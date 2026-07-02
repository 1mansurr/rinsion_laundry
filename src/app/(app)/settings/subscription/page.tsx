'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { PageSkeleton } from '@/components/ui/PageSkeleton'
import { claimPaymentSent } from '@/services/subscriptions/claimPaymentSent'
import { computeProrateAmount } from '@/services/subscriptions/computeProrateAmount'
import { PLANS } from '@/constants/plans'
import { formatDate } from '@/utils/formatDate'

const PLAN_LABELS: Record<string, string> = { trial: 'Trial', starter: 'Starter', growth: 'Growth' }
const STATUS_LABELS: Record<string, string> = {
  trialing: 'Active (trial)',
  active: 'Active',
  soft_block: 'Overdue',
  hard_block: 'Read-only',
  locked: 'Locked',
  cancelled: 'Cancelled',
}
const STATUS_COLORS: Record<string, string> = {
  trialing: 'text-blue-700 bg-blue-50',
  active: 'text-green-700 bg-green-50',
  soft_block: 'text-amber-700 bg-amber-50',
  hard_block: 'text-orange-700 bg-orange-50',
  locked: 'text-red-700 bg-red-50',
  cancelled: 'text-gray-500 bg-gray-100',
}

function SubscriptionContent() {
  const searchParams = useSearchParams()
  const action = searchParams.get('action') ?? undefined
  const planParam = searchParams.get('plan') ?? undefined

  const [data, setData] = useState<any>(null)

  useEffect(() => {
    const params = new URLSearchParams()
    if (action) params.set('action', action)
    if (planParam) params.set('plan', planParam)
    fetch(`/api/settings/subscription?${params}`).then(r => r.json()).then(setData)
  }, [action, planParam])

  if (!data) return <PageSkeleton rows={3} />

  const { subscription, recentPayments, existingClaim, paymentType, targetPlan, paymentAmount, newCycleStart, newCycleEnd, referenceCode, momoNumber } = data
  const cycleDays = subscription?.plan === 'trial' ? 14 : 30

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <Link href="/settings" className="text-sm text-gray-400 hover:text-gray-700">Settings</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-sm font-semibold text-gray-900">Subscription</h1>
      </div>

      {/* ── Plan status card ── */}
      {subscription && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base font-bold text-gray-900">
                  {PLAN_LABELS[subscription.plan]}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[subscription.status] ?? 'text-gray-500 bg-gray-100'}`}>
                  {STATUS_LABELS[subscription.status] ?? subscription.status}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Cycle: {subscription.cycleStartDate} → {subscription.cycleEndDate}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {subscription.daysLeft > 0
                  ? `${subscription.daysLeft} day${subscription.daysLeft !== 1 ? 's' : ''} remaining`
                  : 'Cycle ended'}
              </p>
            </div>
            <div className="text-right text-xs text-gray-400">
              <p>{subscription.smsQuota} SMS / cycle</p>
            </div>
          </div>
          <div className="mt-3 bg-gray-100 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full ${subscription.daysLeft <= 3 ? 'bg-amber-400' : 'bg-gray-900'}`}
              style={{ width: `${Math.min(100, (subscription.daysLeft / cycleDays) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* ── No subscription ── */}
      {!subscription && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 mb-4 text-sm text-yellow-800">
          No active subscription. Contact Rinsion to activate your account.
        </div>
      )}

      {/* ── Claimed confirmation ── */}
      {action === 'claimed' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-4">
          <p className="text-sm font-semibold text-green-800 mb-1">Payment claim submitted</p>
          <p className="text-xs text-green-700">
            Rinsion will verify and activate your subscription within 24 hours.
            You will receive an SMS once your account is activated.
          </p>
          <Link href="/dashboard" className="inline-block mt-3 text-xs text-green-700 underline">
            Back to dashboard →
          </Link>
        </div>
      )}

      {/* ── Existing pending claim (unresolved) ── */}
      {existingClaim && action !== 'claimed' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-4">
          <p className="text-sm font-semibold text-amber-800 mb-1">Payment pending verification</p>
          <p className="text-xs text-amber-700">
            Your payment claim (ref: <span className="font-mono">{existingClaim.reference_code}</span>, GHS {Number(existingClaim.claimed_amount).toFixed(0)}) is being verified by Rinsion.
          </p>
          <p className="text-xs text-amber-600 mt-1">Submitted {formatDate(existingClaim.claimed_at)}</p>
        </div>
      )}

      {/* ── Payment instructions ── */}
      {subscription && paymentType && targetPlan && !existingClaim && action !== 'claimed' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Link href="/settings/subscription" className="text-xs text-gray-400 hover:text-gray-700">← Back</Link>
          </div>

          <p className="text-sm font-semibold text-gray-900 mb-3">
            {paymentType === 'upgrade_prorate'
              ? `Upgrade to Growth — GHS ${paymentAmount}`
              : paymentType === 'trial_conversion'
              ? `Start ${PLAN_LABELS[targetPlan]} — GHS ${paymentAmount}`
              : `Renew ${PLAN_LABELS[targetPlan]} — GHS ${paymentAmount}`}
          </p>

          <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Send to</span>
              <span className="font-mono font-semibold text-gray-900">{momoNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Amount</span>
              <span className="font-semibold text-gray-900">GHS {paymentAmount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Reference</span>
              <span className="font-mono text-gray-900">{referenceCode}</span>
            </div>
            {paymentType !== 'upgrade_prorate' && (
              <div className="flex justify-between">
                <span className="text-gray-500">New cycle</span>
                <span className="text-gray-900">{newCycleStart} → {newCycleEnd}</span>
              </div>
            )}
          </div>

          <p className="text-xs text-gray-500 mb-3">
            Include the reference in your MoMo payment note. After sending, tap the button below.
          </p>

          <form action={claimPaymentSent}>
            <input type="hidden" name="reference_code" value={referenceCode} />
            <input type="hidden" name="payment_type" value={paymentType} />
            <input type="hidden" name="target_plan" value={targetPlan} />
            <button
              type="submit"
              className="w-full bg-gray-900 text-white text-sm py-2.5 rounded-lg hover:bg-gray-800 transition-colors"
            >
              I have sent GHS {paymentAmount} →
            </button>
          </form>
        </div>
      )}

      {/* ── Action buttons (default state) ── */}
      {subscription && !paymentType && action !== 'claimed' && !existingClaim && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <p className="text-sm font-semibold text-gray-900 mb-3">Renew or upgrade</p>
          <div className="space-y-2">
            {/* Renew button — shown for active/soft_block/hard_block on paid plans */}
            {subscription.plan !== 'trial' && (
              <Link
                href="/settings/subscription?action=renew"
                className="block w-full text-center border border-gray-300 text-gray-700 text-sm py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Renew {PLAN_LABELS[subscription.plan]} — GHS {PLANS[subscription.plan as 'starter' | 'growth']?.price}
              </Link>
            )}
            {/* Upgrade button — only for active Starter */}
            {subscription.plan === 'starter' && subscription.status === 'active' && (
              <Link
                href="/settings/subscription?action=upgrade"
                className="block w-full text-center bg-gray-900 text-white text-sm py-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Upgrade to Growth — GHS {computeProrateAmount(subscription.daysLeft)} prorate
              </Link>
            )}
            {/* Trial conversion options */}
            {subscription.plan === 'trial' && (
              <>
                <Link
                  href="/settings/subscription?action=convert&plan=starter"
                  className="block w-full text-center border border-gray-300 text-gray-700 text-sm py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Start Starter — GHS 90 / month
                </Link>
                <Link
                  href="/settings/subscription?action=convert&plan=growth"
                  className="block w-full text-center bg-gray-900 text-white text-sm py-2 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Start Growth — GHS 180 / month
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Locked state ── */}
      {subscription?.status === 'locked' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-4 text-sm text-red-800">
          Your account is locked. Contact Rinsion directly to restore access.
        </div>
      )}

      {/* ── Plan comparison ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Plan comparison</h2>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-5 py-2.5 text-gray-500 font-medium"></th>
              <th className="px-4 py-2.5 text-center font-semibold text-gray-900">Starter</th>
              <th className="px-4 py-2.5 text-center font-semibold text-gray-900">Growth</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            <tr>
              <td className="px-5 py-2.5 text-gray-500">Price</td>
              <td className="px-4 py-2.5 text-center text-gray-900">GHS 90 / mo</td>
              <td className="px-4 py-2.5 text-center text-gray-900">GHS 180 / mo</td>
            </tr>
            <tr>
              <td className="px-5 py-2.5 text-gray-500">Employees</td>
              <td className="px-4 py-2.5 text-center text-gray-900">Up to 4</td>
              <td className="px-4 py-2.5 text-center text-gray-900">Up to 9</td>
            </tr>
            <tr>
              <td className="px-5 py-2.5 text-gray-500">Branches</td>
              <td className="px-4 py-2.5 text-center text-gray-900">1</td>
              <td className="px-4 py-2.5 text-center text-gray-900">Up to 3</td>
            </tr>
            <tr>
              <td className="px-5 py-2.5 text-gray-500">SMS / cycle</td>
              <td className="px-4 py-2.5 text-center text-gray-900">300</td>
              <td className="px-4 py-2.5 text-center text-gray-900">800</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Recent payments ── */}
      {(recentPayments ?? []).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Recent payments</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {recentPayments!.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm text-gray-900">GHS {Number(p.amount).toFixed(0)}</p>
                  <p className="text-xs text-gray-400 capitalize">{p.payment_type.replace('_', ' ')} · {p.plan_at_payment}</p>
                </div>
                <p className="text-xs text-gray-400">{p.paid_at.split('T')[0]}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function SubscriptionPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      <SubscriptionContent />
    </Suspense>
  )
}
