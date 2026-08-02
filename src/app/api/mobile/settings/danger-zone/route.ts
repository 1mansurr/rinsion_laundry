import { NextResponse, type NextRequest } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createAdminClient } from '@/lib/supabase'
import { getMobileEmployeeProfile } from '@/services/mobile/getMobileEmployeeProfile'
import { ROLES } from '@/constants/statuses'
import { ACTIVITY_ACTION_TYPES } from '@/constants/subscriptionStatuses'

/**
 * Mirrors services/laundries/deleteLaundryAccount.ts via the admin client.
 * Irreversible from any UI — no Recycle Bin entry, matching the website.
 * Doesn't call supabase.auth.signOut() itself (there's no server-side
 * cookie session to clear here) — the app signs itself out client-side
 * after this returns success, same effective outcome.
 */
export async function POST(request: NextRequest) {
  const profile = await getMobileEmployeeProfile(request)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (profile.role !== ROLES.ADMIN) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => null) as { confirmName?: string } | null

  const admin = createAdminClient()
  const { data: laundry } = await admin.from('laundries').select('name').eq('id', profile.laundryId).single()
  if (!laundry) return NextResponse.json({ error: 'Laundry not found.' }, { status: 404 })
  if (body?.confirmName !== laundry.name) {
    return NextResponse.json({ error: 'Typed name does not match the laundry name.' }, { status: 400 })
  }

  const { error: laundryErr } = await admin.from('laundries').update({ deleted_at: new Date().toISOString() }).eq('id', profile.laundryId)
  if (laundryErr) return NextResponse.json({ error: 'Failed to delete laundry account.' }, { status: 500 })

  const { data: sub } = await admin
    .from('subscriptions')
    .select('id')
    .eq('laundry_id', profile.laundryId)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (sub) {
    await admin.from('subscriptions').update({ status: 'cancelled' }).eq('id', sub.id)
  }

  await admin.from('activity_logs').insert({
    laundry_id: profile.laundryId,
    employee_id: profile.employeeId,
    action_type: ACTIVITY_ACTION_TYPES.LAUNDRY_ACCOUNT_DELETED,
    description: 'Laundry account closed',
  })

  // Blocks every employee immediately, not just after getMyProfile()'s
  // 5-minute cache TTL — same reasoning as deleteLaundryAccount.ts.
  revalidateTag('employee-profile')
  return NextResponse.json({ success: true })
}
