import { createAdminClient } from '@/lib/supabase'
import { recordCycleRenewalPayment } from '@/services/subscriptions/recordCycleRenewalPayment'
import { recordUpgradePayment } from '@/services/subscriptions/recordUpgradePayment'
import type { PaymentEvent } from '@/lib/payments'
import type { PlanKey } from '@/constants/plans'

/**
 * Driven by the charge.success webhook (src/app/api/webhooks/paystack/route.ts)
 * for metadata.purpose === 'subscription_payment'. Looks up the pending
 * subscription_payment_links row by reference and resolves it through the
 * same reusable mutation primitives the manual claim flow already calls
 * (resolvePayment.ts) — just with paymentMethod: 'paystack' instead of
 * 'manual_momo'.
 *
 * Idempotent: a link that's missing or already resolved is a safe no-op —
 * Paystack retries a failed/non-200 webhook delivery every 3 min for 4
 * tries then hourly for 72h, so this must tolerate being called more than
 * once for the same event.
 */
export async function handlePaystackSubscriptionEvent(event: PaymentEvent): Promise<void> {
  const admin = createAdminClient()

  const { data: link } = await admin
    .from('subscription_payment_links')
    .select('*')
    .eq('reference_code', event.reference)
    .eq('status', 'pending')
    .maybeSingle()

  if (!link) return

  let result: { success: boolean; error?: string }

  if (link.payment_type === 'cycle_renewal' || link.payment_type === 'trial_conversion') {
    result = await recordCycleRenewalPayment({
      laundryId: link.laundry_id,
      subscriptionId: link.subscription_id,
      plan: link.target_plan as PlanKey,
      recordedByEmail: 'paystack-webhook',
      externalReference: event.reference,
      paymentMethod: 'paystack',
    })
  } else if (link.payment_type === 'upgrade_prorate') {
    const cycleEnd = new Date(link.target_cycle_end_date + 'T00:00:00.000Z')
    const daysRemaining = Math.max(0, Math.ceil((cycleEnd.getTime() - Date.now()) / 86400000))
    result = await recordUpgradePayment({
      laundryId: link.laundry_id,
      subscriptionId: link.subscription_id,
      cycleStartDate: link.target_cycle_start_date,
      cycleEndDate: link.target_cycle_end_date,
      daysRemaining,
      recordedByEmail: 'paystack-webhook',
      externalReference: event.reference,
      paymentMethod: 'paystack',
    })
  } else {
    return
  }

  await admin
    .from('subscription_payment_links')
    .update({
      status: result.success ? 'paid' : 'failed',
      resolved_at: new Date().toISOString(),
    })
    .eq('id', link.id)
}
