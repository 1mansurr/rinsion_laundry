import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { getSubscriptionPageData } from '@/services/subscriptions/getSubscriptionPageData'
import { claimPaymentSent } from '@/services/subscriptions/claimPaymentSent'
import { PLANS, TRIAL_DAYS, CYCLE_DAYS } from '@/constants/plans'
import { formatDate } from '@/utils/formatDate'
import { RestrictedCard } from '@/components/app/RestrictedCard'
import { StartTrialButton } from './StartTrialButton'

const STATUS_LABELS: Record<string, string> = {
  trialing: 'Active (trial)',
  active: 'Active',
  soft_block: 'Overdue',
  hard_block: 'Read-only',
  locked: 'Locked',
  cancelled: 'Cancelled',
}
const STATUS_COLORS: Record<string, string> = {
  trialing: 'text-info-fg bg-info-bg',
  active: 'text-success-fg bg-success-bg',
  soft_block: 'text-warning-fg bg-warning-bg',
  hard_block: 'text-warning-fg bg-warning-bg',
  locked: 'text-error-fg bg-error-bg',
  cancelled: 'text-warm-600 bg-warm-150',
}

interface Props {
  searchParams: { action?: string; plan?: string }
}

export default async function SubscriptionPage({ searchParams }: Props) {
  const profile = await getMyProfile()
  if (!profile) redirect('/login')

  if (profile.role !== 'admin') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-4 md:p-6">
        <div className="flex items-center gap-1.5 mb-6 text-caption">
          <Link href="/settings" className="text-warm-600 font-semibold hover:text-warm-900">Settings</Link>
          <span className="text-warm-400">/</span>
          <span className="text-warm-950 font-bold">Subscription</span>
        </div>
        <RestrictedCard />
      </div>
    )
  }

  const action = searchParams.action ?? null
  const selectedPlan = searchParams.plan ?? null

  const {
    subscription, recentPayments, existingClaim,
    paymentType, targetPlan, paymentAmount, newCycleStart, newCycleEnd, referenceCode, momoNumber,
  } = await getSubscriptionPageData(profile.laundryId, action, selectedPlan)

  const cycleDays = subscription?.plan === 'trial' ? TRIAL_DAYS : CYCLE_DAYS

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 md:p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 mb-5 md:mb-6 text-caption">
        <Link href="/settings" className="text-warm-600 font-semibold hover:text-warm-900">Settings</Link>
        <span className="text-warm-400">/</span>
        <span className="text-warm-950 font-bold">Subscription</span>
      </div>

      {/* ── Plan status card ── */}
      {subscription && (
        <div className="bg-white rounded-18 border border-warm-300 p-5 mb-3.5">
          <div className="flex items-center justify-between mb-3.5">
            <span className="text-[18px] font-bold text-warm-950">{subscription.plan === 'trial' ? 'Trial' : 'Your plan'}</span>
            <span className={`text-micro font-bold px-2.5 py-1 rounded-full tracking-[0.04em] uppercase ${STATUS_COLORS[subscription.status] ?? 'text-warm-600 bg-warm-150'}`}>
              {STATUS_LABELS[subscription.status] ?? subscription.status}
            </span>
          </div>
          <p className="tnum text-caption text-warm-600 mb-3">
            Cycle: {subscription.cycleStartDate} → {subscription.cycleEndDate}
          </p>
          <div className="h-1.5 bg-warm-200 rounded-full overflow-hidden mb-1.5">
            <div
              className={`h-full rounded-full ${subscription.daysLeft <= 3 ? 'bg-warning' : 'bg-brand'}`}
              style={{ width: `${Math.min(100, (subscription.daysLeft / cycleDays) * 100)}%` }}
            />
          </div>
          <p className="tnum text-caption text-warm-500">
            {subscription.daysLeft > 0
              ? `${subscription.daysLeft} day${subscription.daysLeft !== 1 ? 's' : ''} remaining`
              : 'Cycle ended'}
          </p>
          <div className="h-px bg-warm-100 my-4" />
          <div className="flex items-center justify-between text-ui-sm">
            <span className="text-warm-600">SMS quota</span>
            <span className="tnum font-semibold text-warm-950">{subscription.smsQuota} / cycle</span>
          </div>
        </div>
      )}

      {/* ── No subscription ── */}
      {!subscription && (
        <div className="bg-white border border-warm-300 rounded-18 p-6 mb-4 text-center">
          <p className="text-ui font-semibold text-warm-950 mb-1.5">No subscription yet</p>
          <p className="text-caption text-warm-600 mb-4">Start a free trial to unlock orders, customers, and SMS notifications.</p>
          <StartTrialButton />
        </div>
      )}

      {/* ── Claimed confirmation ── */}
      {action === 'claimed' && (
        <div className="bg-white border border-warm-300 rounded-18 p-6 mb-4 text-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#2E7D5B" className="mx-auto mb-3.5" aria-hidden>
            <path d="M9 16.17 5.53 12.7a1 1 0 0 0-1.42 1.42l4.18 4.17a1 1 0 0 0 1.42 0L20.3 7.88a1 1 0 1 0-1.42-1.42L9 16.17Z" />
          </svg>
          <p className="text-ui font-semibold text-warm-950 mb-1.5">Payment claim submitted</p>
          <p className="text-caption text-warm-600">
            Rinsion will verify and activate your subscription within 24 hours. You&apos;ll receive an SMS once your account is activated.
          </p>
          <Link href="/dashboard" className="inline-block mt-3 text-caption font-semibold text-brand hover:text-brand-hover">
            Back to dashboard →
          </Link>
        </div>
      )}

      {/* ── Existing pending claim (unresolved) ── */}
      {existingClaim && action !== 'claimed' && (
        <div className="bg-white border border-warm-300 rounded-18 p-5 mb-4">
          <p className="text-ui font-semibold text-warm-950 mb-1.5">Payment pending review</p>
          <p className="text-caption text-warm-600 leading-relaxed">
            We&apos;re confirming your Mobile Money transfer — this usually takes under an hour.
          </p>
          <div className="bg-[#FAF8F5] rounded-10 px-4 py-3 mt-3 space-y-2">
            <div className="flex justify-between text-ui-sm">
              <span className="text-warm-600">Reference</span>
              <span className="tnum font-semibold text-warm-950">{existingClaim.reference_code}</span>
            </div>
            <div className="flex justify-between text-ui-sm">
              <span className="text-warm-600">Amount</span>
              <span className="tnum font-semibold text-warm-950">GHS {Number(existingClaim.claimed_amount).toFixed(0)}</span>
            </div>
          </div>
          <p className="text-caption text-warm-400 mt-2">Submitted {formatDate(existingClaim.claimed_at)}</p>
        </div>
      )}

      {/* ── Payment instructions ── */}
      {subscription && paymentType && targetPlan && !existingClaim && action !== 'claimed' && (
        <div className="bg-white border border-warm-300 rounded-18 p-5 mb-4">
          <Link href="/settings/subscription" className="inline-block mb-3 text-caption font-semibold text-warm-600 hover:text-warm-900">
            ← Back
          </Link>

          <p className="text-ui font-semibold text-warm-950 mb-3">
            {paymentType === 'trial_conversion'
              ? `Start — GHS ${paymentAmount}`
              : `Renew — GHS ${paymentAmount}`}
          </p>

          <div className="bg-[#FAF8F5] rounded-10 px-4 py-3.5 mb-4 space-y-2">
            <div className="flex justify-between text-ui-sm">
              <span className="text-warm-600">MoMo number</span>
              <span className="tnum font-bold text-warm-950">{momoNumber}</span>
            </div>
            <div className="flex justify-between text-ui-sm">
              <span className="text-warm-600">Amount</span>
              <span className="tnum font-bold text-warm-950">GHS {paymentAmount}</span>
            </div>
            <div className="flex justify-between text-ui-sm">
              <span className="text-warm-600">Reference</span>
              <span className="tnum font-bold text-warm-950">{referenceCode}</span>
            </div>
            <div className="flex justify-between text-ui-sm">
              <span className="text-warm-600">New cycle</span>
              <span className="tnum text-warm-950">{newCycleStart} → {newCycleEnd}</span>
            </div>
          </div>

          <p className="text-caption text-warm-500 mb-3.5">
            Include the reference in your MoMo payment note. After sending, tap the button below.
          </p>

          <form action={claimPaymentSent}>
            <input type="hidden" name="reference_code" value={referenceCode ?? ''} />
            <input type="hidden" name="payment_type" value={paymentType} />
            <input type="hidden" name="target_plan" value={targetPlan} />
            <button
              type="submit"
              className="w-full min-h-[48px] bg-brand text-[#FAF8F5] text-ui font-semibold py-3.5 rounded-12 hover:bg-brand-hover transition-colors"
            >
              I have sent GHS {paymentAmount} →
            </button>
          </form>
        </div>
      )}

      {/* ── Action buttons (default state) ── */}
      {subscription && !paymentType && action !== 'claimed' && !existingClaim && (
        <div className="flex flex-col gap-2.5 mb-4">
          {/* Renew button — shown for active/soft_block/hard_block on paid plans */}
          {subscription.plan !== 'trial' && (
            <Link
              href="/settings/subscription?action=renew"
              className="w-full min-h-[48px] flex items-center justify-center text-center border border-warm-400 text-warm-950 bg-white text-ui font-semibold py-3.5 rounded-12 hover:bg-warm-100 transition-colors"
            >
              Renew — GHS {PLANS[subscription.plan as 'starter' | 'growth']?.price}
            </Link>
          )}
          {/* Trial conversion */}
          {subscription.plan === 'trial' && (
            <Link
              href="/settings/subscription?action=convert&plan=starter"
              className="w-full min-h-[48px] flex items-center justify-center text-center bg-brand text-[#FAF8F5] text-ui font-semibold py-3.5 rounded-12 hover:bg-brand-hover transition-colors"
            >
              Continue — GHS {PLANS.starter.price} / month
            </Link>
          )}
        </div>
      )}

      {/* ── Locked state ── */}
      {subscription?.status === 'locked' && (
        <div className="bg-error-bg border border-error-border rounded-10 p-5 mb-4 text-ui text-error-fg">
          Your subscription is locked. Contact Rinsion directly to restore access.
        </div>
      )}

      {/* ── What's included — Rinsion is a single plan, so this is a feature
          list rather than a comparison table ── */}
      <div className="bg-white border border-warm-300 rounded-18 p-5 mb-4">
        <p className="text-[18px] font-bold text-warm-950">
          GHS {PLANS.starter.price} <span className="text-ui-sm font-normal text-warm-600">/ month</span>
        </p>
        <p className="text-caption text-warm-500 mt-1 mb-3.5">{TRIAL_DAYS} days free first.</p>
        <ul className="space-y-2 text-ui-sm text-warm-800">
          <li>You, plus up to {PLANS.starter.employeeLimit - 1} staff</li>
          <li>{PLANS.starter.smsQuota} texts a month</li>
          <li>Unlimited orders, customers and payments</li>
          <li>Every action logged. Export any time.</li>
        </ul>
      </div>

      {/* ── Recent payments ── */}
      {recentPayments.length > 0 && (
        <div className="bg-white border border-warm-300 rounded-18 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-warm-200">
            <h2 className="text-ui font-semibold text-warm-950">Recent payments</h2>
          </div>
          <div className="divide-y divide-warm-100">
            {recentPayments.map(p => (
              <div key={p.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="tnum text-ui-sm font-semibold text-warm-950">GHS {Number(p.amount).toFixed(0)}</p>
                  <p className="text-caption text-warm-500 capitalize mt-0.5">{p.payment_type.replace('_', ' ')} · {p.plan_at_payment}</p>
                </div>
                <p className="tnum text-caption text-warm-400">{p.paid_at.split('T')[0]}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
