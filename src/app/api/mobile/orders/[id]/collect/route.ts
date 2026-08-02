import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { getMobileEmployeeProfile } from '@/services/mobile/getMobileEmployeeProfile'

interface Params {
  params: { id: string }
}

/**
 * Mirrors services/orders/verifyAndCollect.ts via the admin client — the
 * pickup-code-verified "walk-in collection" flow used by the dashboard's
 * quick "Collect" action, distinct from the plain status-advance button on
 * the order detail screen (M2's /api/mobile/orders/[id]/status), which
 * doesn't ask for a code.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const profile = await getMobileEmployeeProfile(request)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null) as { pickupCode?: string } | null
  const enteredCode = body?.pickupCode?.trim()
  if (!enteredCode) return NextResponse.json({ error: 'Pickup code is required.' }, { status: 400 })

  const admin = createAdminClient()
  const { data: order } = await admin
    .from('orders')
    .select('status, pickup_code, total, payments(amount), order_refunds(amount)')
    .eq('id', params.id)
    .eq('laundry_id', profile.laundryId)
    .single()
  if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
  if (order.status !== 'ready') return NextResponse.json({ error: 'Order is not ready for pickup.' }, { status: 400 })

  if (order.pickup_code.trim().toLowerCase() !== enteredCode.toLowerCase()) {
    return NextResponse.json({ error: 'Incorrect pickup code.' }, { status: 400 })
  }

  const payments = (order.payments as unknown as { amount: number }[]) ?? []
  const refunds = (order.order_refunds as unknown as { amount: number }[]) ?? []
  const paid = payments.reduce((s, p) => s + Number(p.amount), 0) - refunds.reduce((s, r) => s + Number(r.amount), 0)
  if (paid < Number(order.total)) {
    const balance = (Number(order.total) - paid).toFixed(2)
    return NextResponse.json({ error: `Balance of GHS ${balance} outstanding. Record payment first.` }, { status: 400 })
  }

  await admin.from('orders').update({ status: 'collected' }).eq('id', params.id).eq('laundry_id', profile.laundryId)
  await admin.from('order_status_history').insert({
    order_id: params.id,
    employee_id: profile.employeeId,
    previous_status: 'ready',
    new_status: 'collected',
  })
  await admin.from('activity_logs').insert({
    laundry_id: profile.laundryId,
    order_id: params.id,
    employee_id: profile.employeeId,
    action_type: 'STATUS_UPDATED',
    description: 'Order collected — pickup code verified',
  })

  return NextResponse.json({ success: true })
}
