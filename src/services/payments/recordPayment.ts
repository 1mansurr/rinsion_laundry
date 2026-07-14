'use server'

import { createClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { requireActiveSubscription } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { PaymentMethod } from '@/constants/statuses'
import type { ServiceResult } from '@/types/serviceResult'

export async function recordPayment(input: {
  orderId: string
  amount: number
  paymentMethod: PaymentMethod
}): Promise<ServiceResult<null>> {
  const supabase = createClient()
  const profile = await getMyProfile()
  if (!profile) return { success: false, error: 'Not authenticated.' }
  const emp = { id: profile.id, laundry_id: profile.laundryId }

  const subCheck = await requireActiveSubscription(emp.laundry_id)
  if (!subCheck.success) return subCheck

  if (input.amount <= 0) return { success: false, error: 'Amount must be greater than 0.' }

  // Enforce allow_partial_payments setting
  const { data: settingsRow } = await supabase
    .from('settings')
    .select('allow_partial_payments')
    .eq('laundry_id', emp.laundry_id)
    .single()

  if (settingsRow && !settingsRow.allow_partial_payments) {
    const [{ data: orderRow }, { data: existingPayments }] = await Promise.all([
      supabase.from('orders').select('total').eq('id', input.orderId).single(),
      supabase.from('payments').select('amount').eq('order_id', input.orderId),
    ])

    const paid = (existingPayments ?? []).reduce((sum, p) => sum + p.amount, 0)
    const outstanding = (orderRow?.total ?? 0) - paid

    if (outstanding > 0 && input.amount < outstanding) {
      return {
        success: false,
        error: `This laundry requires full payment. Enter the full outstanding balance of GHS ${outstanding.toFixed(2)}.`,
      }
    }
  }

  // payments + activity_logs insert run atomically in record_payment_tx —
  // see supabase/migrations/20240007000000_order_write_transactions.sql.
  const { error } = await supabase.rpc('record_payment_tx', {
    p_order_id: input.orderId,
    p_laundry_id: emp.laundry_id,
    p_employee_id: emp.id,
    p_amount: input.amount,
    p_method: input.paymentMethod,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath(`/orders/${input.orderId}`)
  return { success: true, data: null }
}
