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
