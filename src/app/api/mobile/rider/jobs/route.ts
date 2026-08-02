import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { decryptField } from '@/lib/crypto'
import { getMobileRiderProfile } from '@/services/mobile/getMobileRiderProfile'
import type { RiderJobStatus } from '@/constants/statuses'

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

/** Mirrors services/riders/getMyJobs.ts exactly, including the staged PII reveal (location only pre-accept, full customer name/phone after), via the admin client. */
export async function GET(request: NextRequest) {
  const profile = await getMobileRiderProfile(request)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data } = await admin
    .from('logistics_requests')
    .select(`
      id, order_id, kind, rider_status, accepted_at, created_at,
      orders(order_number, location, customers(first_name, last_name, phone))
    `)
    .eq('assigned_rider_id', profile.riderId)
    .neq('rider_status', 'dropped_off')
    .order('created_at', { ascending: true })

  const jobs = ((data ?? []) as unknown as JobRow[]).map(r => {
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

  return NextResponse.json({ jobs })
}
