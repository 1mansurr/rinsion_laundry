import { NextRequest, NextResponse } from 'next/server'
import { paystackProvider } from '@/lib/payments'
import { handlePaystackSubscriptionEvent } from '@/services/webhooks/handlePaystackSubscriptionEvent'
import { handlePaystackOrderEvent } from '@/services/webhooks/handlePaystackOrderEvent'
import { logger } from '@/lib/logger'

// Needs Node's crypto for HMAC verification — not edge-compatible.
export const runtime = 'nodejs'

/**
 * Inbound webhook for Paystack's charge.success event — mirrors the raw-body
 * read pattern already used by src/app/api/logistics/webhook/route.ts.
 * Serves both the mobile-money direct-charge flow and the card/bank hosted
 * redirect flow, since both report completion through this same event.
 *
 * Dispatches on metadata.purpose: 'subscription_payment' -> M1's handler,
 * 'order_payment' -> M3's handler.
 *
 * Always returns 200, even on a bad/unrecognized signature — a no-op ack,
 * not a 401 — so a transient bug on our side can't get Paystack to stop
 * retrying a real payment event. Paystack itself already guarantees the
 * signature is authentic before we ever act on the event.
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get('x-paystack-signature') ?? ''
  const rawBody = await request.text()

  const event = await paystackProvider.verifyWebhook(rawBody, signature)
  if (!event) return NextResponse.json({ received: true })

  const purpose = event.metadata.purpose

  try {
    if (purpose === 'subscription_payment') {
      await handlePaystackSubscriptionEvent(event)
    } else if (purpose === 'order_payment') {
      await handlePaystackOrderEvent(event)
    } else {
      logger.warn('paystack webhook: unrecognized metadata.purpose', { purpose, reference: event.reference })
    }
  } catch (err) {
    // Log and still 200 — the event handlers are themselves idempotent, so
    // a retried delivery is safe and preferable to Paystack giving up.
    logger.error('paystack webhook: handler threw', err)
  }

  return NextResponse.json({ received: true })
}
