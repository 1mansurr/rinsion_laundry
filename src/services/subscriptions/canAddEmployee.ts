import { createClient, type DbClient } from '@/lib/supabase'

// Accepts an optional client because acceptInvite runs with no session at
// all (see getSoleBranchId) and must pass its admin client.
export async function canAddEmployee(laundryId: string, employeeLimit: number, client?: DbClient): Promise<boolean> {
  const supabase = client ?? createClient()
  const { count } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true })
    .eq('laundry_id', laundryId)
    .eq('is_active', true)
  return (count ?? 0) < employeeLimit
}
