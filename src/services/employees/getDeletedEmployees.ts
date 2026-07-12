'use server'

import { createClient } from '@/lib/supabase'
import type { EmployeeRole } from '@/constants/statuses'

export interface DeletedEmployee {
  id: string
  firstName: string
  lastName: string
  role: EmployeeRole
  deletedAt: string
}

export async function getDeletedEmployees(laundryId: string): Promise<DeletedEmployee[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('employees')
    .select('id, first_name, last_name, role, deleted_at')
    .eq('laundry_id', laundryId)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })

  return (data ?? []).map(r => ({
    id: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
    role: r.role as EmployeeRole,
    deletedAt: r.deleted_at as string,
  }))
}
