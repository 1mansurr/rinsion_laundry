import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { getMobileEmployeeProfile } from '@/services/mobile/getMobileEmployeeProfile'
import { requireActiveSubscription } from '@/lib/auth'
import { paystackProvider } from '@/lib/payments'
import type { MobileMoneyProvider } from '@/lib/payments'

/** Mirrors services/payments/createPaymentLink.ts's staff path, via the admin client + bearer-token auth. */
export async function POST(request: NextRequest) {
  const profile = await getMobileEmployeeProfile(request)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null) as {
    orderId?: string
    channel?: 'mobile_money' | 'card' | 'bank_transfer'
    phone?: string
    provider?: MobileMoneyProvider
  } | null

  if (!body?.orderId || !body.channel) {
    return NextResponse.json({ error: 'orderId and channel are required.' }, { status: 400 })
  }
  if (body.channel === 'mobile_money' && (!body.phone || !body.provider)) {
    return NextResponse.json({ error: 'phone and provider are required for mobile money.' }, { status: 400 })
  }

  const subCheck = await requireActiveSubscription(profile.laundryId)
  if (!subCheck.success) return NextResponse.json({ error: subCheck.error }, { status: 403 })

  const admin = createAdminClient()

  const { data: order } = await admin
    .from('orders')
    .select('id, laundry_id, total, payments(amount)')
    .eq('id', body.orderId)
    .eq('laundry_id', profile.laundryId)
    .is('deleted_at', null)
    .maybeSingle()
  if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 })

  const paid = ((order.payments as { amount: number }[]) ?? []).reduce((s, p) => s + Number(p.amount), 0)
  const balance = Number(order.total) - paid
  if (balance <= 0) return NextResponse.json({ error: 'This order is already fully paid.' }, { status: 400 })

  const { data: payoutAccount } = await admin
    .from('laundry_payout_accounts')
    .select('paystack_subaccount_code, status')
    .eq('laundry_id', order.laundry_id)
    .maybeSingle()
  if (!payoutAccount || payoutAccount.status !== 'active') {
    return NextResponse.json({ error: 'Set up a payout account first (Settings → Payouts).' }, { status: 400 })
  }

  const reference = `RNSN-ORD-${body.orderId.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`
  const metadata = {
    purpose: 'order_payment',
    orderId: body.orderId,
    laundryId: order.laundry_id,
    subaccountCode: payoutAccount.paystack_subaccount_code,
  }

  let authorizationUrl: string | undefined
  let displayText: string | undefined
  try {
    if (body.channel === 'mobile_money') {
      const result = await paystackProvider.chargeMobileMoney(balance, reference, body.phone!, body.provider!, metadata)
      displayText = result.displayText
    } else {
      const link = await paystackProvider.createPaymentLink(balance, reference, metadata)
      authorizationUrl = link.url
    }
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to start payment.' }, { status: 502 })
  }

  const { error: insertErr } = await admin.from('order_payment_links').insert({
    order_id: body.orderId,
    laundry_id: order.laundry_id,
    reference_code: reference,
    amount: balance,
    channel: body.channel,
    authorization_url: authorizationUrl ?? null,
    display_text: displayText ?? null,
    created_by_employee_id: profile.employeeId,
  })
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  return NextResponse.json({ referenceCode: reference, displayText, authorizationUrl })
}

/** Status-polling counterpart, mirrors src/app/api/payments/order-status/route.ts for bearer-token mobile callers. */
export async function GET(request: NextRequest) {
  const profile = await getMobileEmployeeProfile(request)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const reference = request.nextUrl.searchParams.get('reference')
  if (!reference) return NextResponse.json({ error: 'reference is required' }, { status: 400 })

  const admin = createAdminClient()
  const { data } = await admin
    .from('order_payment_links')
    .select('status, laundry_id')
    .eq('reference_code', reference)
    .maybeSingle()

  if (!data || data.laundry_id !== profile.laundryId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ status: data.status })
}
