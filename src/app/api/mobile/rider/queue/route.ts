import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { decryptField } from '@/lib/crypto'
import { getMobileRiderProfile } from '@/services/mobile/getMobileRiderProfile'
import { sendExpoPush } from '@/lib/push/sendExpoPush'
import { RIDER_ROLE } from '@/constants/statuses'
import type { RiderJobStatus } from '@/constants/statuses'

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

/**
 * Admin-only. Mirrors services/logistics/getRiderCompanyJobQueue.ts (full
 * customer visibility, unlike the rider's own staged jobs/route.ts) plus
 * services/riders/getRoster.ts filtered to active riders, in one response —
 * the web's queue/page.tsx loads both for the same "assign a job" screen.
 */
export async function GET(request: NextRequest) {
  const profile = await getMobileRiderProfile(request)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (profile.role !== RIDER_ROLE.ADMIN) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()

  const { data: jobRows } = await admin
    .from('logistics_requests')
    .select(`
      id, order_id, kind, status, assigned_rider_id, rider_status, created_at,
      orders(order_number, location, customers(first_name, last_name, phone)),
      riders(first_name, last_name)
    `)
    .eq('rider_company_id', profile.riderCompanyId)
    .in('status', ['requested', 'assigned', 'in_transit'])
    .order('created_at', { ascending: true })

  const jobs = ((jobRows ?? []) as unknown as JobRow[]).map(r => {
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

  const { data: riderRows } = await admin
    .from('riders')
    .select('id, first_name, last_name')
    .eq('rider_company_id', profile.riderCompanyId)
    .eq('role', 'rider')
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  const riders = (riderRows ?? []).map(r => ({
    id: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
  }))

  return NextResponse.json({ jobs, riders })
}

/** Mirrors services/logistics/assignRiderToJob.ts, including the "New job assigned to you." rider_notifications insert. */
export async function POST(request: NextRequest) {
  const profile = await getMobileRiderProfile(request)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (profile.role !== RIDER_ROLE.ADMIN) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => null) as { jobId?: string; riderId?: string } | null
  const jobId = body?.jobId
  const riderId = body?.riderId
  if (!jobId || !riderId) return NextResponse.json({ error: 'jobId and riderId are required.' }, { status: 400 })

  const admin = createAdminClient()

  const { data: job } = await admin
    .from('logistics_requests')
    .select('id, rider_company_id, assigned_rider_id')
    .eq('id', jobId)
    .eq('rider_company_id', profile.riderCompanyId)
    .maybeSingle()
  if (!job) return NextResponse.json({ error: 'Job not found.' }, { status: 404 })
  if (job.assigned_rider_id) return NextResponse.json({ error: 'This job is already assigned.' }, { status: 409 })

  const { data: rider } = await admin
    .from('riders')
    .select('id, expo_push_token')
    .eq('id', riderId)
    .eq('rider_company_id', profile.riderCompanyId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle()
  if (!rider) return NextResponse.json({ error: 'Rider not found.' }, { status: 404 })

  const { error } = await admin
    .from('logistics_requests')
    .update({ assigned_rider_id: riderId, rider_status: 'assigned' })
    .eq('id', jobId)
  if (error) return NextResponse.json({ error: 'Failed to assign job.' }, { status: 500 })

  await admin.from('rider_notifications').insert({
    rider_id: riderId,
    logistics_request_id: jobId,
    message: 'New job assigned to you.',
  })

  if (rider.expo_push_token) {
    void sendExpoPush(rider.expo_push_token, 'New job assigned', 'Open the app to view and accept it.')
  }

  return NextResponse.json({ success: true })
}
