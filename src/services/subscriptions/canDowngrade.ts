import { createClient } from '@/lib/supabase'
import { PLANS } from '@/constants/plans'

/** Returns true if the laundry fits within Starter plan limits and can downgrade at cycle end. */
export async function canDowngrade(laundryId: string): Promise<boolean> {
  const supabase = createClient()
  const [{ count: employees }, { count: branches }] = await Promise.all([
    supabase.from('employees').select('*', { count: 'exact', head: true })
      .eq('laundry_id', laundryId).eq('is_active', true),
    supabase.from('branches').select('*', { count: 'exact', head: true })
      .eq('laundry_id', laundryId),
  ])
  return (employees ?? 0) <= PLANS.starter.employeeLimit
    && (branches ?? 0) <= PLANS.starter.branchLimit
}
