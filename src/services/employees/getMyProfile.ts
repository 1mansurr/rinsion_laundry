import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase'
import { decryptField } from '@/lib/crypto'
import { getVerifiedUserId } from '@/lib/auth'
import type { EmployeeRole } from '@/constants/statuses'

export interface MyProfile {
  id: string
  authUserId: string
  laundryId: string
  branchId: string
  role: EmployeeRole
  firstName: string
  lastName: string
  email: string | null
  phone: string
  laundryName: string
}

interface EmployeeRow {
  id: string
  auth_user_id: string
  laundry_id: string
  branch_id: string
  role: string
  first_name: string
  last_name: string
  email: string | null
  phone: string
  laundries: { name: string; deleted_at: string | null } | null
}

// Cached for 5 min — employee profile is stable between navigations.
// Uses admin client because unstable_cache runs outside request context (no cookies).
// auth is always verified first (either via x-user-id header or auth.getUser() fallback).
const fetchEmployeeRow = unstable_cache(
  async (userId: string): Promise<EmployeeRow | null> => {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('employees')
      .select('id, auth_user_id, laundry_id, branch_id, role, first_name, last_name, email, phone, laundries(name, deleted_at)')
      .eq('auth_user_id', userId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .single()
    const row = data as EmployeeRow | null
    // A closed laundry (deleteLaundryAccount) must bounce every one of its
    // employees the same way an individually-removed employee is bounced —
    // treat this exactly like "no employee row" rather than adding a second
    // check at every call site.
    if (row?.laundries?.deleted_at) return null
    return row ?? null
  },
  ['employee-profile'],
  { revalidate: 300, tags: ['employee-profile'] },
)

function buildProfile(data: EmployeeRow): MyProfile {
  return {
    id: data.id,
    authUserId: data.auth_user_id,
    laundryId: data.laundry_id,
    branchId: data.branch_id,
    role: data.role as EmployeeRole,
    firstName: data.first_name,
    lastName: data.last_name,
    email: decryptField(data.email),
    phone: decryptField(data.phone) ?? '',
    laundryName: data.laundries?.name ?? '',
  }
}

// cache() deduplicates calls within a single request — layout and page both call this,
// but only the first resolves; subsequent calls return the memoized result.
export const getMyProfile = cache(async function (): Promise<MyProfile | null> {
  const supabase = createClient()
  const userId = await getVerifiedUserId(supabase)
  if (!userId) return null
  const data = await fetchEmployeeRow(userId)
  return data ? buildProfile(data) : null
})
