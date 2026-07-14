'use server'

import { createClient } from '@/lib/supabase'
import { getVerifiedUserId, requireActiveSubscription } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { ServiceResult } from '@/types/serviceResult'

export async function verifyAndCollect(
  orderId: string,
  enteredCode: string
): Promise<ServiceResult<null>> {
  const supabase = createClient()
  const userId = await getVerifiedUserId(supabase)
  if (!userId) return { success: false, error: 'Not authenticated.' }

  const { data: emp } = await supabase
    .from('employees')
    .select('id, laundry_id')
    .eq('auth_user_id', userId)
    .single()
  if (!emp) return { success: false, error: 'Employee not found.' }

  const subCheck = await requireActiveSubscription(emp.laundry_id)
  if (!subCheck.success) return subCheck

  const { data: order } = await supabase
    .from('orders')
    .select('status, pickup_code, total, payments(amount), order_refunds(amount)')
    .eq('id', orderId)
    .single()

  if (!order) return { success: false, error: 'Order not found.' }
  if (order.status !== 'ready') return { success: false, error: 'Order is not ready for pickup.' }

  if (order.pickup_code.trim().toLowerCase() !== enteredCode.trim().toLowerCase()) {
    return { success: false, error: 'Incorrect pickup code.' }
  }

  const payments = (order.payments as { amount: number }[]) ?? []
  const refunds = (order.order_refunds as { amount: number }[]) ?? []
  const paid = payments.reduce((s, p) => s + Number(p.amount), 0) - refunds.reduce((s, r) => s + Number(r.amount), 0)
  if (paid < Number(order.total)) {
    const balance = (Number(order.total) - paid).toFixed(2)
    return { success: false, error: `Balance of GHS ${balance} outstanding. Record payment first.` }
  }

  await supabase.from('orders').update({ status: 'collected' }).eq('id', orderId)
  await supabase.from('order_status_history').insert({
    order_id: orderId,
    employee_id: emp.id,
    previous_status: 'ready',
    new_status: 'collected',
  })
  await supabase.from('activity_logs').insert({
    laundry_id: emp.laundry_id,
    order_id: orderId,
    employee_id: emp.id,
    action_type: 'STATUS_UPDATED',
    description: 'Order collected — pickup code verified',
  })

  revalidatePath(`/orders/${orderId}`)
  revalidatePath('/orders')
  revalidatePath('/pickup')
  return { success: true, data: null }
}
