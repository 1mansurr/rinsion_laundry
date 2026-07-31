'use server'

import { createClient } from '@/lib/supabase'
import { decryptField } from '@/lib/crypto'
import { getMyRiderProfile } from '@/services/riders/getMyRiderProfile'
import type { RiderRole } from '@/constants/statuses'

export interface RosterRider {
  id: string
  firstName: string
  lastName: string
  phone: string
  role: RiderRole
  isActive: boolean
}

// Mirrors employees/getEmployees.ts — tenant-scoped read, open to any role in
// the company (riders.tenant_isolation RLS policy is FOR ALL, not admin-only;
// write-gating for invites/removal lives in the service layer instead).
export async function getRoster(): Promise<RosterRider[]> {
  const profile = await getMyRiderProfile()
  if (!profile) return []

  const supabase = createClient()
  const { data } = await supabase
    .from('riders')
    .select('id, first_name, last_name, phone, role, is_active')
    .eq('rider_company_id', profile.riderCompanyId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  return (data ?? []).map(r => ({
    id: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
    phone: decryptField(r.phone) ?? '',
    role: r.role as RiderRole,
    isActive: r.is_active,
  }))
}
