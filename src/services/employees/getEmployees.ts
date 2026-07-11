'use server'

import { createClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'
import type { EmployeeRole } from '@/constants/statuses'

export interface Employee {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  role: EmployeeRole
  branchId: string
  branchName: string
  isActive: boolean
}

export async function getEmployees(): Promise<Employee[]> {
  const supabase = createClient()
  const profile = await getMyProfile()
  if (!profile) return []

  const { data } = await supabase
    .from('employees')
    .select('id, first_name, last_name, email, phone, role, branch_id, is_active, branches(name)')
    .eq('laundry_id', profile.laundryId)
    .order('created_at', { ascending: true })

  return (data ?? []).map(r => ({
    id: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
    email: r.email,
    phone: r.phone,
    role: r.role as EmployeeRole,
    branchId: r.branch_id,
    branchName: (r.branches as unknown as { name: string } | null)?.name ?? '',
    isActive: r.is_active,
  }))
}
