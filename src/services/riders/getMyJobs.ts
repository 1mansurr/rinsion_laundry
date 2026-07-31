'use server'

import { createClient } from '@/lib/supabase'
import { decryptField } from '@/lib/crypto'
import { getMyRiderProfile } from '@/services/riders/getMyRiderProfile'
import type { RiderJobStatus } from '@/constants/statuses'

export interface MyJob {
  id: string
  orderId: string
  orderNumber: string
  kind: 'pickup' | 'delivery'
  location: string | null
  /** Both null until accepted — staged PII reveal, see acceptJob.ts. */
  customerName: string | null
  customerPhone: string | null
  accepted: boolean
  riderStatus: RiderJobStatus | null
  createdAt: string
}

interface JobRow {
  id: string
  order_id: string
  kind: 'pickup' | 'delivery'
  rider_status: RiderJobStatus | null
  accepted_at: string | null
  created_at: string
  orders: {
    order_number: string
    location: string | null
    customers: { first_name: string; last_name: string; phone: string } | null
  } | null
}

export async function getMyJobs(): Promise<MyJob[]> {
  const profile = await getMyRiderProfile()
  if (!profile) return []

  const supabase = createClient()
  const { data } = await supabase
    .from('logistics_requests')
    .select(`
      id, order_id, kind, rider_status, accepted_at, created_at,
      orders(order_number, location, customers(first_name, last_name, phone))
    `)
    .eq('assigned_rider_id', profile.id)
    .neq('rider_status', 'dropped_off')
    .order('created_at', { ascending: true })

  return ((data ?? []) as unknown as JobRow[]).map(r => {
    const order = r.orders
    const accepted = !!r.accepted_at
    const customer = order?.customers ?? null
    return {
      id: r.id,
      orderId: r.order_id,
      orderNumber: order?.order_number ?? '',
      kind: r.kind,
      location: order?.location ? decryptField(order.location) : null,
      customerName: accepted && customer ? `${decryptField(customer.first_name) ?? ''} ${decryptField(customer.last_name) ?? ''}`.trim() : null,
      customerPhone: accepted && customer ? decryptField(customer.phone) ?? '' : null,
      accepted,
      riderStatus: r.rider_status,
      createdAt: r.created_at,
    }
  })
}
