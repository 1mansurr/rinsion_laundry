import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { getMobileRiderProfile } from '@/services/mobile/getMobileRiderProfile'

/** Mirrors services/riders/acceptJob.ts — logistics_requests has no RLS write policy for the rider tenant, so the ownership check (assigned_rider_id = me) is done explicitly via the admin client. */
export async function POST(request: NextRequest) {
  const profile = await getMobileRiderProfile(request)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null) as { jobId?: string } | null
  const jobId = body?.jobId
  if (!jobId) return NextResponse.json({ error: 'jobId is required.' }, { status: 400 })

  const admin = createAdminClient()

  const { data: job } = await admin
    .from('logistics_requests')
    .select('id, accepted_at')
    .eq('id', jobId)
    .eq('assigned_rider_id', profile.riderId)
    .maybeSingle()
  if (!job) return NextResponse.json({ error: 'Job not found.' }, { status: 404 })
  if (job.accepted_at) return NextResponse.json({ error: 'This job has already been accepted.' }, { status: 409 })

  const { error } = await admin
    .from('logistics_requests')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', jobId)
  if (error) return NextResponse.json({ error: 'Failed to accept job.' }, { status: 500 })

  return NextResponse.json({ success: true })
}
