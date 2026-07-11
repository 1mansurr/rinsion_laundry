'use server'

import { createClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { requireRole } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { ACTIVITY_ACTION_TYPES } from '@/constants/subscriptionStatuses'
import { ROLES } from '@/constants/statuses'
import type { PaymentMethod } from '@/constants/statuses'
import type { ServiceResult } from '@/types/serviceResult'

export async function recordRefund(input: {
  orderId: string
  amount: number
  refundMethod: PaymentMethod
  reason?: string
}): Promise<ServiceResult<null>> {
  const supabase = createClient()
  const profile = await getMyProfile()
  const check = requireRole(profile, ROLES.ADMIN)
  if (!check.success) return check
  const emp = { id: check.data.id, laundry_id: check.data.laundryId }

  if (input.amount <= 0) return { success: false, error: 'Amount must be greater than 0.' }

  const [{ data: payments }, { data: existingRefunds }] = await Promise.all([
    supabase.from('payments').select('amount').eq('order_id', input.orderId),
    supabase.from('order_refunds').select('amount').eq('order_id', input.orderId),
  ])

  const paid = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0)
  const alreadyRefunded = (existingRefunds ?? []).reduce((s, r) => s + Number(r.amount), 0)
  const refundable = paid - alreadyRefunded

  if (input.amount > refundable) {
    return {
      success: false,
      error: `Cannot refund more than the GHS ${refundable.toFixed(2)} already paid on this order.`,
    }
  }

  const { error } = await supabase.from('order_refunds').insert({
    order_id: input.orderId,
    recorded_by_employee_id: emp.id,
    amount: input.amount,
    refund_method: input.refundMethod,
    reason: input.reason?.trim() || null,
  })

  if (error) return { success: false, error: error.message }

  await supabase.from('activity_logs').insert({
    laundry_id: emp.laundry_id,
    order_id: input.orderId,
    employee_id: emp.id,
    action_type: ACTIVITY_ACTION_TYPES.REFUND_RECORDED,
    description: `Refund of GHS ${input.amount.toFixed(2)} recorded via ${input.refundMethod}`,
  })

  revalidatePath(`/orders/${input.orderId}`)
  return { success: true, data: null }
}
