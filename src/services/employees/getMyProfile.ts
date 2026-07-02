import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { headers } from 'next/headers'
import { createClient, createAdminClient } from '@/lib/supabase'
import type { EmployeeRole } from '@/constants/statuses'

export interface MyProfile {
  id: string
  authUserId: string
  laundryId: string
  branchId: string
  role: EmployeeRole
  firstName: string
  lastName: string
  email: string
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
  email: string
  phone: string
  laundries: { name: string } | null
}

// Cached for 5 min — employee profile is stable between navigations.
// Uses admin client because unstable_cache runs outside request context (no cookies).
// auth is always verified first (either via x-user-id header or auth.getUser() fallback).
const fetchEmployeeRow = unstable_cache(
  async (userId: string): Promise<EmployeeRow | null> => {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('employees')
      .select('id, auth_user_id, laundry_id, branch_id, role, first_name, last_name, email, phone, laundries(name)')
      .eq('auth_user_id', userId)
      .eq('is_active', true)
      .single()
    return (data as EmployeeRow | null) ?? null
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
    email: data.email,
    phone: data.phone,
    laundryName: (data.laundries as { name: string } | null)?.name ?? '',
  }
}

// cache() deduplicates calls within a single request — layout and page both call this,
// but only the first resolves; subsequent calls return the memoized result.
export const getMyProfile = cache(async function (): Promise<MyProfile | null> {
  // x-user-id is set by middleware after verifying the JWT — reading it here avoids
  // a second auth.getUser() network call on every navigation.
  const userId = headers().get('x-user-id')

  if (userId) {
    const data = await fetchEmployeeRow(userId)
    return data ? buildProfile(data) : null
  }

  // Fallback for any path middleware doesn't cover (e.g. direct server invocations).
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const data = await fetchEmployeeRow(user.id)
  return data ? buildProfile(data) : null
})
