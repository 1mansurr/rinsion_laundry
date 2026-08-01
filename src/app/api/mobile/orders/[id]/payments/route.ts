import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { getMobileEmployeeProfile } from '@/services/mobile/getMobileEmployeeProfile'
import type { PaymentMethod } from '@/constants/statuses'

interface Params {
  params: { id: string }
}

/**
 * Mirrors services/payments/recordPayment.ts — same allow_partial_payments
 * rule and record_payment_tx RPC, run via the admin client with the caller's
 * laundryId/employeeId already verified in getMobileEmployeeProfile (there's
 * no cookie session/RLS context here to piggyback on, same reasoning as the
 * GET routes in ../route.ts).
 */
export async function POST(request: NextRequest, { params }: Params) {
  const profile = await getMobileEmployeeProfile(request)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null) as { amount?: number; paymentMethod?: PaymentMethod } | null
  const amount = body?.amount
  const paymentMethod = body?.paymentMethod
  if (!amount || amount <= 0) return NextResponse.json({ error: 'Amount must be greater than 0.' }, { status: 400 })
  if (!paymentMethod) return NextResponse.json({ error: 'Payment method is required.' }, { status: 400 })

  const admin = createAdminClient()

  const { data: order } = await admin
    .from('orders')
    .select('id, total')
    .eq('id', params.id)
    .eq('laundry_id', profile.laundryId)
    .maybeSingle()
  if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 })

  const { data: settingsRow } = await admin
    .from('settings')
    .select('allow_partial_payments')
    .eq('laundry_id', profile.laundryId)
    .single()

  if (settingsRow && !settingsRow.allow_partial_payments) {
    const { data: existingPayments } = await admin.from('payments').select('amount').eq('order_id', params.id)
    const paid = (existingPayments ?? []).reduce((sum, p) => sum + Number(p.amount), 0)
    const outstanding = Number(order.total) - paid

    if (outstanding > 0 && amount < outstanding) {
      return NextResponse.json(
        { error: `This laundry requires full payment. Enter the full outstanding balance of GHS ${outstanding.toFixed(2)}.` },
        { status: 400 }
      )
    }
  }

  const { error } = await admin.rpc('record_payment_tx', {
    p_order_id: params.id,
    p_laundry_id: profile.laundryId,
    p_employee_id: profile.employeeId,
    p_amount: amount,
    p_method: paymentMethod,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
