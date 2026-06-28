import { cache } from 'react'
import { createClient } from '@/lib/supabase'
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

// cache() deduplicates calls within a single request — layout and page both call this,
// but only the first call hits Supabase auth; subsequent calls return the memoized result.
export const getMyProfile = cache(async function (): Promise<MyProfile | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('employees')
    .select('id, auth_user_id, laundry_id, branch_id, role, first_name, last_name, email, phone, laundries(name)')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!data) return null

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
    laundryName: (data.laundries as unknown as { name: string } | null)?.name ?? '',
  }
})
