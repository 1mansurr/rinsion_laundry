import { createAdminClient } from '@/lib/supabase'
import { listLaundries } from '@/services/platform/listLaundries'
import { ErasureRequestsClient } from './ErasureRequestsClient'

export default async function ErasureRequestsPage() {
  const admin = createAdminClient()

  const [{ data }, laundries] = await Promise.all([
    admin
      .from('erasure_requests')
      .select('id, laundry_id, subject_type, subject_id, reason, requested_at, laundries(name)')
      .eq('status', 'pending')
      .order('requested_at', { ascending: true }),
    listLaundries(),
  ])

  type Row = {
    id: string
    laundry_id: string
    subject_type: 'customer' | 'employee'
    subject_id: string
    reason: string | null
    requested_at: string
    laundries: { name: string }[] | { name: string } | null
  }

  const requests = ((data ?? []) as Row[]).map(row => ({
    id: row.id,
    laundryId: row.laundry_id,
    laundryName: (Array.isArray(row.laundries) ? row.laundries[0]?.name : row.laundries?.name) ?? row.laundry_id,
    subjectType: row.subject_type,
    subjectId: row.subject_id,
    reason: row.reason,
    requestedAt: row.requested_at,
  }))

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-h2 font-semibold text-warm-950">Erasure Requests</h1>
        <span className="text-ui text-warm-600">{requests.length} pending</span>
      </div>
      <ErasureRequestsClient
        requests={requests}
        laundries={laundries.map(l => ({ id: l.id, name: l.name }))}
      />
    </div>
  )
}
