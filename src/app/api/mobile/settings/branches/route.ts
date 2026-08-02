import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { getMobileEmployeeProfile } from '@/services/mobile/getMobileEmployeeProfile'
import { getActiveSubscription } from '@/services/subscriptions/getActive'
import { PLANS } from '@/constants/plans'
import { ROLES } from '@/constants/statuses'
import type { SubscriptionPlan } from '@/constants/subscriptionStatuses'

function generateBranchCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'BR-'
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

/** Mirrors services/employees/getBranches.ts + the branch limit shown alongside it on the website. */
export async function GET(request: NextRequest) {
  const profile = await getMobileEmployeeProfile(request)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const [{ data: branches }, subscription] = await Promise.all([
    admin.from('branches').select('id, name').eq('laundry_id', profile.laundryId).order('created_at', { ascending: true }),
    getActiveSubscription(profile.laundryId),
  ])

  const plan = (subscription?.plan ?? 'starter') as SubscriptionPlan
  const branchLimit = PLANS[plan as keyof typeof PLANS]?.branchLimit ?? PLANS.starter.branchLimit

  return NextResponse.json({ branches: branches ?? [], branchLimit })
}

/** Mirrors services/branches/index.ts's createBranch via the admin client. */
export async function POST(request: NextRequest) {
  const profile = await getMobileEmployeeProfile(request)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (profile.role !== ROLES.ADMIN) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => null) as { name?: string } | null
  const name = body?.name?.trim()
  if (!name) return NextResponse.json({ error: 'Branch name cannot be empty.' }, { status: 400 })

  const admin = createAdminClient()
  const subscription = await getActiveSubscription(profile.laundryId)
  const plan = (subscription?.plan ?? 'starter') as SubscriptionPlan
  const limit = PLANS[plan as keyof typeof PLANS]?.branchLimit ?? PLANS.starter.branchLimit

  const { count } = await admin.from('branches').select('id', { count: 'exact', head: true }).eq('laundry_id', profile.laundryId)
  if ((count ?? 0) >= limit) {
    return NextResponse.json({ error: `Your plan allows up to ${limit} branch${limit > 1 ? 'es' : ''}.` }, { status: 400 })
  }

  const branchCode = generateBranchCode()
  const { data: branch, error } = await admin
    .from('branches')
    .insert({ laundry_id: profile.laundryId, branch_code: branchCode, name })
    .select('id, name, branch_code')
    .single()
  if (error) return NextResponse.json({ error: 'Failed to create branch.' }, { status: 500 })

  await admin.from('activity_logs').insert({
    laundry_id: profile.laundryId,
    employee_id: profile.employeeId,
    action_type: 'SETTINGS_UPDATED',
    description: `Branch "${name}" (${branchCode}) added`,
  })

  return NextResponse.json({ branch: { id: branch.id, name: branch.name, branchCode: branch.branch_code } })
}
