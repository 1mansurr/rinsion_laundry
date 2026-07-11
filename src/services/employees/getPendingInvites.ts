'use server'

import { createClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'
import type { EmployeeRole } from '@/constants/statuses'

export interface PendingInvite {
  id: string
  phone: string
  role: EmployeeRole
  createdAt: string
  expiresAt: string
}

export async function getPendingInvites(): Promise<PendingInvite[]> {
  const profile = await getMyProfile()
  if (!profile) return []

  const supabase = createClient()
  const { data } = await supabase
    .from('pending_invites')
    .select('id, phone, role, created_at, expires_at')
    .eq('laundry_id', profile.laundryId)
    .is('accepted_at', null)
    .order('created_at', { ascending: true })

  return (data ?? []).map(r => ({
    id: r.id,
    phone: r.phone,
    role: r.role as EmployeeRole,
    createdAt: r.created_at,
    expiresAt: r.expires_at,
  }))
}
