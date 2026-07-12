'use server'

import { createClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'
import type { EmployeeRole } from '@/constants/statuses'

export interface Employee {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string
  role: EmployeeRole
  isActive: boolean
}

export async function getEmployees(): Promise<Employee[]> {
  const supabase = createClient()
  const profile = await getMyProfile()
  if (!profile) return []

  const { data } = await supabase
    .from('employees')
    .select('id, first_name, last_name, email, phone, role, is_active')
    .eq('laundry_id', profile.laundryId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  return (data ?? []).map(r => ({
    id: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
    email: r.email,
    phone: r.phone,
    role: r.role as EmployeeRole,
    isActive: r.is_active,
  }))
}
