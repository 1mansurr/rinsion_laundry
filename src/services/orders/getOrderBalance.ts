'use server'

import { createClient } from '@/lib/supabase'

export async function getOrderBalance(
  orderId: string
): Promise<{ total: number; amountPaid: number } | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('orders')
    .select('total, payments(amount), order_refunds(amount)')
    .eq('id', orderId)
    .single()

  if (!data) return null
  const payments = (data.payments as { amount: number }[]) ?? []
  const refunds = (data.order_refunds as { amount: number }[]) ?? []
  const paid = payments.reduce((s, p) => s + Number(p.amount), 0)
  const refunded = refunds.reduce((s, r) => s + Number(r.amount), 0)
  return { total: Number(data.total), amountPaid: paid - refunded }
}
