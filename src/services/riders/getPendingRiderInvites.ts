'use server'

import { createAdminClient } from '@/lib/supabase'
import { getMyRiderProfile } from '@/services/riders/getMyRiderProfile'
import type { RiderRole } from '@/constants/statuses'

export interface PendingRiderInvite {
  id: string
  phone: string
  role: RiderRole
  createdAt: string
  expiresAt: string
}

// Mirrors employees/getPendingInvites.ts, against rider_invites instead.
// rider_invites has zero RLS policies (same as pending_invites) — must use
// the admin client, scoping to the caller's own company manually below.
export async function getPendingRiderInvites(): Promise<PendingRiderInvite[]> {
  const profile = await getMyRiderProfile()
  if (!profile) return []

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('rider_invites')
    .select('id, phone, role, created_at, expires_at')
    .eq('rider_company_id', profile.riderCompanyId)
    .is('accepted_at', null)
    .order('created_at', { ascending: true })

  return (data ?? []).map(r => ({
    id: r.id,
    phone: r.phone,
    role: r.role as RiderRole,
    createdAt: r.created_at,
    expiresAt: r.expires_at,
  }))
}
