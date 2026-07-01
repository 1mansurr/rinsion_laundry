import { createAdminClient } from '@/lib/supabase'
import ManualPaymentsClient from './ManualPaymentsClient'

export default async function ManualPaymentsPage() {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('pending_payments')
    .select('id, laundry_id, reference_code, claimed_amount, target_plan, payment_type, claimed_at, laundries(name)')
    .is('resolved_at', null)
    .order('claimed_at', { ascending: true })

  type Row = {
    id: string
    laundry_id: string
    reference_code: string
    claimed_amount: number
    target_plan: string
    payment_type: string
    claimed_at: string
    laundries: { name: string }[] | null
  }

  const payments = (data ?? []).map((row: Row) => ({
    id: row.id,
    laundry_id: row.laundry_id,
    laundry_name: (Array.isArray(row.laundries) ? row.laundries[0]?.name : (row.laundries as { name: string } | null)?.name) ?? row.laundry_id,
    reference_code: row.reference_code,
    claimed_amount: row.claimed_amount,
    target_plan: row.target_plan,
    payment_type: row.payment_type,
    claimed_at: row.claimed_at,
  }))

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Manual Payments Queue</h1>
        <span className="text-sm text-gray-500">{payments.length} pending</span>
      </div>
      <ManualPaymentsClient payments={payments} />
    </div>
  )
}
