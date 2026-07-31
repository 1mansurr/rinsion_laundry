'use server'

import { createClient } from '@/lib/supabase'
import { decryptField } from '@/lib/crypto'
import { getMyRiderProfile } from '@/services/riders/getMyRiderProfile'
import type { RiderJobStatus } from '@/constants/statuses'

export interface RiderCompanyJob {
  id: string
  orderId: string
  orderNumber: string
  kind: 'pickup' | 'delivery'
  status: string
  location: string | null
  customerName: string
  customerPhone: string
  assignedRiderId: string | null
  assignedRiderName: string | null
  riderStatus: RiderJobStatus | null
  createdAt: string
}

interface JobRow {
  id: string
  order_id: string
  kind: 'pickup' | 'delivery'
  status: string
  assigned_rider_id: string | null
  rider_status: RiderJobStatus | null
  created_at: string
  orders: {
    order_number: string
    location: string | null
    customers: { first_name: string; last_name: string; phone: string } | null
  } | null
  riders: { first_name: string; last_name: string } | null
}

// Full-visibility view for the rider-company admin/queue — unlike the
// individual rider's own "My Jobs" view (getMyJobs.ts, staged PII), an admin
// assigning jobs to their own riders needs the complete picture up front.
// Mirrors pickupRequests/getPickupRequests.ts's join shape, scoped by
// rider_company_id instead of laundry_id.
export async function getRiderCompanyJobQueue(): Promise<RiderCompanyJob[]> {
  const profile = await getMyRiderProfile()
  if (!profile) return []

  const supabase = createClient()
  const { data } = await supabase
    .from('logistics_requests')
    .select(`
      id, order_id, kind, status, assigned_rider_id, rider_status, created_at,
      orders(order_number, location, customers(first_name, last_name, phone)),
      riders(first_name, last_name)
    `)
    .eq('rider_company_id', profile.riderCompanyId)
    .in('status', ['requested', 'assigned', 'in_transit'])
    .order('created_at', { ascending: true })

  return ((data ?? []) as unknown as JobRow[]).map(r => {
    const order = r.orders
    const customer = order?.customers ?? null
    return {
      id: r.id,
      orderId: r.order_id,
      orderNumber: order?.order_number ?? '',
      kind: r.kind,
      status: r.status,
      location: order?.location ? decryptField(order.location) : null,
      customerName: customer ? `${decryptField(customer.first_name) ?? ''} ${decryptField(customer.last_name) ?? ''}`.trim() : '',
      customerPhone: customer ? decryptField(customer.phone) ?? '' : '',
      assignedRiderId: r.assigned_rider_id,
      assignedRiderName: r.riders ? `${r.riders.first_name} ${r.riders.last_name}`.trim() : null,
      riderStatus: r.rider_status,
      createdAt: r.created_at,
    }
  })
}
