import { createClient } from '@/lib/supabase'

export async function canAddEmployee(laundryId: string, employeeLimit: number): Promise<boolean> {
  const supabase = createClient()
  const { count } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true })
    .eq('laundry_id', laundryId)
    .eq('is_active', true)
  return (count ?? 0) < employeeLimit
}
