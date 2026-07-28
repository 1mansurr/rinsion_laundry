'use server'

import { createClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { decryptField } from '@/lib/crypto'

export interface PickupRequestListItem {
  id: string
  orderId: string
  orderNumber: string
  approvalStatus: string
  customerName: string
  customerPhone: string
  /** orders.location — the pickup address is that field, not a column of its own (see migration 20240037000000's table comment). */
  location: string | null
  notes: string | null
  total: number
  requestedAt: string
  logisticsStatus: string | null
}

export async function getPickupRequests(): Promise<PickupRequestListItem[]> {
  const profile = await getMyProfile()
  if (!profile) return []

  const supabase = createClient()
  const { data } = await supabase
    .from('pickup_requests')
    .select(`
      id, approval_status, pickup_notes, requested_at,
      orders(id, order_number, total, location, customers(first_name, last_name, phone)),
      logistics_requests(status)
    `)
    .eq('laundry_id', profile.laundryId)
    .order('requested_at', { ascending: false })

  return (data ?? []).map(r => {
    const order = r.orders as unknown as {
      id: string; order_number: string; total: number; location: string | null
      customers: { first_name: string; last_name: string; phone: string } | null
    } | null
    const customer = order?.customers ?? null
    const logistics = (r.logistics_requests as unknown as { status: string }[]) ?? []
    return {
      id: r.id,
      orderId: order?.id ?? '',
      orderNumber: order?.order_number ?? '',
      approvalStatus: r.approval_status,
      customerName: customer ? `${decryptField(customer.first_name) ?? ''} ${decryptField(customer.last_name) ?? ''}`.trim() : '',
      customerPhone: customer ? decryptField(customer.phone) ?? '' : '',
      location: order?.location ? decryptField(order.location) : null,
      notes: r.pickup_notes,
      total: Number(order?.total ?? 0),
      requestedAt: r.requested_at,
      logisticsStatus: logistics[0]?.status ?? null,
    }
  })
}
