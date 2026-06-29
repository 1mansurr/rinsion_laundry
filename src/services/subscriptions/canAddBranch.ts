import { createClient } from '@/lib/supabase'
import { PLANS } from '@/constants/plans'
import type { PlanKey } from '@/constants/plans'

export async function canAddBranch(laundryId: string, plan: PlanKey): Promise<boolean> {
  const supabase = createClient()
  const { count } = await supabase
    .from('branches')
    .select('*', { count: 'exact', head: true })
    .eq('laundry_id', laundryId)
  return (count ?? 0) < PLANS[plan].branchLimit
}
