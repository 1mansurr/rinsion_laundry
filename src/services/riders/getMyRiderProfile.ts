import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase'
import { decryptField } from '@/lib/crypto'
import { getVerifiedUserId } from '@/lib/auth'
import type { RiderRole } from '@/constants/statuses'

export interface MyRiderProfile {
  id: string
  authUserId: string
  riderCompanyId: string
  role: RiderRole
  firstName: string
  lastName: string
  phone: string
  riderCompanyName: string
}

interface RiderRow {
  id: string
  auth_user_id: string
  rider_company_id: string
  role: string
  first_name: string
  last_name: string
  phone: string
  rider_companies: { name: string; is_active: boolean } | null
}

// Cached for 5 min, same shape/reasoning as employees/getMyProfile.ts's fetchEmployeeRow.
const fetchRiderRow = unstable_cache(
  async (userId: string): Promise<RiderRow | null> => {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('riders')
      .select('id, auth_user_id, rider_company_id, role, first_name, last_name, phone, rider_companies(name, is_active)')
      .eq('auth_user_id', userId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .single()
    const row = data as RiderRow | null
    if (row?.rider_companies?.is_active === false) return null
    return row ?? null
  },
  ['rider-profile'],
  { revalidate: 300, tags: ['rider-profile'] },
)

function buildProfile(data: RiderRow): MyRiderProfile {
  return {
    id: data.id,
    authUserId: data.auth_user_id,
    riderCompanyId: data.rider_company_id,
    role: data.role as RiderRole,
    firstName: data.first_name,
    lastName: data.last_name,
    phone: decryptField(data.phone) ?? '',
    riderCompanyName: data.rider_companies?.name ?? '',
  }
}

// cache() deduplicates calls within a single request, same as getMyProfile.
export const getMyRiderProfile = cache(async function (): Promise<MyRiderProfile | null> {
  const supabase = createClient()
  const userId = await getVerifiedUserId(supabase)
  if (!userId) return null
  const data = await fetchRiderRow(userId)
  return data ? buildProfile(data) : null
})
