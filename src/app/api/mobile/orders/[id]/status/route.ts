import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { getMobileEmployeeProfile } from '@/services/mobile/getMobileEmployeeProfile'
import { ORDER_STATUS_TRANSITIONS } from '@/constants/statuses'
import type { OrderStatus } from '@/constants/statuses'

interface Params {
  params: { id: string }
}

/**
 * Mirrors services/orders/updateOrderStatus.ts (same transition table, same
 * balance-must-be-settled rule before 'collected') via the admin client —
 * see payments/route.ts's comment on why.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const profile = await getMobileEmployeeProfile(request)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null) as { status?: OrderStatus } | null
  const newStatus = body?.status
  if (!newStatus) return NextResponse.json({ error: 'Status is required.' }, { status: 400 })

  const admin = createAdminClient()

  const { data: order } = await admin
    .from('orders')
    .select('status, total')
    .eq('id', params.id)
    .eq('laundry_id', profile.laundryId)
    .single()
  if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 })

  const currentStatus = order.status as OrderStatus
  const allowed = ORDER_STATUS_TRANSITIONS[currentStatus]
  if (!allowed.includes(newStatus)) {
    return NextResponse.json({ error: `Cannot move from ${currentStatus} to ${newStatus}.` }, { status: 400 })
  }

  if (newStatus === 'collected') {
    const [{ data: pmts }, { data: refs }] = await Promise.all([
      admin.from('payments').select('amount').eq('order_id', params.id),
      admin.from('order_refunds').select('amount').eq('order_id', params.id),
    ])
    const paid = (pmts ?? []).reduce((s, p) => s + Number(p.amount), 0)
      - (refs ?? []).reduce((s, r) => s + Number(r.amount), 0)
    if (paid < Number(order.total)) {
      const bal = (Number(order.total) - paid).toFixed(2)
      return NextResponse.json({ error: `Balance of GHS ${bal} outstanding. Record payment first.` }, { status: 400 })
    }
  }

  await admin
    .from('orders')
    .update({ status: newStatus })
    .eq('id', params.id)
    .eq('laundry_id', profile.laundryId)

  await admin.from('order_status_history').insert({
    order_id: params.id,
    employee_id: profile.employeeId,
    previous_status: currentStatus,
    new_status: newStatus,
  })

  await admin.from('activity_logs').insert({
    laundry_id: profile.laundryId,
    order_id: params.id,
    employee_id: profile.employeeId,
    action_type: 'STATUS_UPDATED',
    description: `Status changed from ${currentStatus} to ${newStatus}`,
  })

  if (newStatus === 'ready') {
    import('@/services/notifications/sendOrderReadySms')
      .then(m => m.sendOrderReadySms(params.id))
      .catch(() => null)
  }

  return NextResponse.json({ success: true })
}
