import { createAdminClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import type { PaymentEvent } from '@/lib/payments'
import type { PaymentMethod } from '@/constants/statuses'

const CHANNEL_TO_PAYMENT_METHOD: Record<string, PaymentMethod> = {
  mobile_money: 'mobile_money',
  card: 'card',
  bank: 'bank_transfer',
  bank_transfer: 'bank_transfer',
}

/**
 * Driven by the charge.success webhook for metadata.purpose === 'order_payment'.
 * Same idempotent lookup-then-resolve shape as handlePaystackSubscriptionEvent.ts
 * — a missing or already-resolved link is a safe no-op, since Paystack retries
 * failed/non-200 deliveries.
 */
export async function handlePaystackOrderEvent(event: PaymentEvent): Promise<void> {
  const admin = createAdminClient()

  const { data: link } = await admin
    .from('order_payment_links')
    .select('*')
    .eq('reference_code', event.reference)
    .eq('status', 'pending')
    .maybeSingle()

  if (!link) return

  const method = CHANNEL_TO_PAYMENT_METHOD[event.channel ?? ''] ?? 'mobile_money'

  const { error } = await admin.rpc('record_online_payment_tx', {
    p_order_id: link.order_id,
    p_laundry_id: link.laundry_id,
    p_amount: link.amount,
    p_method: method,
    p_provider: 'paystack',
    p_external_reference: event.reference,
  })

  await admin
    .from('order_payment_links')
    .update({
      status: error ? 'failed' : 'paid',
      paid_at: new Date().toISOString(),
    })
    .eq('id', link.id)

  if (!error) {
    revalidatePath(`/orders/${link.order_id}`)
    revalidatePath('/dashboard')
    revalidatePath(`/portal/orders/${link.order_id}/invoice`)
  }
}
