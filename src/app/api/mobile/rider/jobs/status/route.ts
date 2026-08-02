import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { getMobileRiderProfile } from '@/services/mobile/getMobileRiderProfile'
import { RIDER_JOB_STATUSES } from '@/constants/statuses'
import type { RiderJobStatus } from '@/constants/statuses'

/** Mirrors services/riders/bulkUpdateJobStatus.ts — single job or several at once, same admin-client + explicit ownership-check pattern (logistics_requests has no rider-tenant write RLS policy). */
export async function POST(request: NextRequest) {
  const profile = await getMobileRiderProfile(request)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null) as { jobIds?: string[]; status?: RiderJobStatus } | null
  const jobIds = body?.jobIds
  const status = body?.status
  if (!jobIds?.length || !status) {
    return NextResponse.json({ error: 'jobIds and status are required.' }, { status: 400 })
  }
  if (!RIDER_JOB_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status.' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: jobs } = await admin
    .from('logistics_requests')
    .select('id, accepted_at, rider_status')
    .in('id', jobIds)
    .eq('assigned_rider_id', profile.riderId)

  if (!jobs || jobs.length !== jobIds.length) {
    return NextResponse.json({ error: 'One or more jobs could not be found.' }, { status: 404 })
  }
  if (jobs.some(j => !j.accepted_at)) {
    return NextResponse.json({ error: 'Accept a job before updating its status.' }, { status: 400 })
  }

  const targetIndex = RIDER_JOB_STATUSES.indexOf(status)
  const goesBackward = jobs.some(j => RIDER_JOB_STATUSES.indexOf(j.rider_status as RiderJobStatus) > targetIndex)
  if (goesBackward) {
    return NextResponse.json({ error: 'Cannot move a job backward in status.' }, { status: 400 })
  }

  const { error } = await admin
    .from('logistics_requests')
    .update({ rider_status: status })
    .in('id', jobIds)
    .eq('assigned_rider_id', profile.riderId)
  if (error) return NextResponse.json({ error: 'Failed to update job status.' }, { status: 500 })

  return NextResponse.json({ success: true })
}
