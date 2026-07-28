import { NextRequest, NextResponse } from 'next/server'
import { logisticsProvider } from '@/lib/logistics'

/**
 * Inbound webhook for logistics provider status updates (rider assigned,
 * in transit, completed, etc.) — docs/customer-portal+rider.md's "Receive
 * Webhook/Event Updates" operation.
 *
 * Deliberate no-op this phase: the only provider (ManualLogisticsProvider)
 * has no external system to call this, and no signature-verification scheme
 * exists yet to build against. Calls the optional verifyWebhook()
 * unconditionally so a future real provider only needs to implement that one
 * method — nothing here should need to change.
 */
export async function POST(request: NextRequest) {
  if (!logisticsProvider.verifyWebhook) {
    return NextResponse.json({ error: 'No logistics provider configured to receive webhooks.' }, { status: 501 })
  }

  const signature = request.headers.get('x-signature') ?? ''
  const payload = await request.text()

  if (!logisticsProvider.verifyWebhook(payload, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}
