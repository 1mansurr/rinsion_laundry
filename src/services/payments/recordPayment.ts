'use server'

import { createClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import type { PaymentMethod } from '@/constants/statuses'
import type { ServiceResult } from '@/types/serviceResult'

export async function recordPayment(input: {
  orderId: string
  amount: number
  paymentMethod: PaymentMethod
}): Promise<ServiceResult<null>> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated.' }

  const { data: emp } = await supabase
    .from('employees')
    .select('id, laundry_id')
    .eq('auth_user_id', user.id)
    .single()

  if (!emp) return { success: false, error: 'Employee not found.' }

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

  const { error } = await supabase.from('payments').insert({
    order_id: input.orderId,
    recorded_by_employee_id: emp.id,
    amount: input.amount,
    payment_method: input.paymentMethod,
  })

  if (error) return { success: false, error: error.message }

  await supabase.from('activity_logs').insert({
    laundry_id: emp.laundry_id,
    order_id: input.orderId,
    employee_id: emp.id,
    action_type: 'PAYMENT_RECORDED',
    description: `Payment of GHS ${input.amount.toFixed(2)} recorded via ${input.paymentMethod}`,
  })

  revalidatePath(`/orders/${input.orderId}`)
  return { success: true, data: null }
}
