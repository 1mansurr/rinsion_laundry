'use server'

import { createAdminClient } from '@/lib/supabase'
import { requirePlatformAdmin } from '@/services/platform/requirePlatformAdmin'

export interface LaundryListItem {
  id: string
  name: string
  laundryCode: string
  createdAt: string
  subscriptionStatus: string | null
  subscriptionPlan: string | null
  ownerStatus: 'accepted' | 'pending' | 'none'
}

export async function listLaundries(): Promise<LaundryListItem[]> {
  const platformAdminId = await requirePlatformAdmin()
  if (!platformAdminId) return []

  const admin = createAdminClient()

  const { data: laundries } = await admin
    .from('laundries')
    .select('id, name, laundry_code, created_at')
    .order('created_at', { ascending: false })

  if (!laundries || laundries.length === 0) return []

  const laundryIds = laundries.map(l => l.id)

  const [{ data: subs }, { data: admins }, { data: invites }] = await Promise.all([
    admin.from('subscriptions').select('laundry_id, plan, status, created_at')
      .in('laundry_id', laundryIds).order('created_at', { ascending: false }),
    admin.from('employees').select('laundry_id').eq('role', 'admin').in('laundry_id', laundryIds),
    admin.from('pending_invites').select('laundry_id').in('laundry_id', laundryIds).is('accepted_at', null),
  ])

  const subByLaundry = new Map<string, { plan: string; status: string }>()
  for (const s of subs ?? []) {
    if (!subByLaundry.has(s.laundry_id)) subByLaundry.set(s.laundry_id, { plan: s.plan, status: s.status })
  }
  const acceptedLaundryIds = new Set((admins ?? []).map(a => a.laundry_id))
  const pendingLaundryIds = new Set((invites ?? []).map(i => i.laundry_id))

  return laundries.map(l => ({
    id: l.id,
    name: l.name,
    laundryCode: l.laundry_code,
    createdAt: l.created_at,
    subscriptionStatus: subByLaundry.get(l.id)?.status ?? null,
    subscriptionPlan: subByLaundry.get(l.id)?.plan ?? null,
    ownerStatus: acceptedLaundryIds.has(l.id) ? 'accepted' : pendingLaundryIds.has(l.id) ? 'pending' : 'none',
  }))
}
