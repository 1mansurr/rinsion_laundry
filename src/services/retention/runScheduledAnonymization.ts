'use server'

import { createAdminClient } from '@/lib/supabase'
import { RETENTION_DAYS } from '@/constants/retention'
import { anonymizeCustomerTx } from './anonymizeCustomerTx'
import { anonymizeEmployeeTx } from './anonymizeEmployeeTx'

export interface AnonymizationSweepResult {
  skipped: boolean
  customersProcessed: number
  employeesProcessed: number
  errors: string[]
}

/**
 * Trigger 1 (scheduled purge) of the two anonymize_*_tx triggers for
 * customers/employees — gated on RETENTION_DAYS.anonymizationGracePeriod.
 * Trigger 2 (on-request erasure, src/services/platform/fulfillErasureRequest.ts)
 * is never gated on this window. See docs/deletion_retention_plan.md §4.
 */
export async function runScheduledAnonymization(): Promise<AnonymizationSweepResult> {
  if (RETENTION_DAYS.anonymizationGracePeriod === null) {
    return { skipped: true, customersProcessed: 0, employeesProcessed: 0, errors: [] }
  }

  const admin = createAdminClient()
  const cutoff = new Date(Date.now() - RETENTION_DAYS.anonymizationGracePeriod * 24 * 60 * 60 * 1000).toISOString()
  const errors: string[] = []

  // Already-anonymized rows carry the RPC's own placeholder first_name
  // ('Deleted' for customers, 'Former' for employees) — cheaper to filter on
  // than a dedicated flag column, and idempotent either way (re-running the
  // RPC on an already-anonymized row just re-overwrites the same values).
  const { data: customers } = await admin
    .from('customers')
    .select('id')
    .not('deleted_at', 'is', null)
    .lt('deleted_at', cutoff)
    .neq('first_name', 'Deleted')

  let customersProcessed = 0
  for (const c of customers ?? []) {
    const result = await anonymizeCustomerTx(c.id, { triggerDescription: 'scheduled retention purge' })
    if (result.success) customersProcessed++
    else errors.push(`customer ${c.id}: ${result.error}`)
  }

  const { data: employees } = await admin
    .from('employees')
    .select('id')
    .not('deleted_at', 'is', null)
    .lt('deleted_at', cutoff)
    .neq('first_name', 'Former')

  let employeesProcessed = 0
  for (const e of employees ?? []) {
    const result = await anonymizeEmployeeTx(e.id, { triggerDescription: 'scheduled retention purge' })
    if (result.success) employeesProcessed++
    else errors.push(`employee ${e.id}: ${result.error}`)
  }

  return { skipped: false, customersProcessed, employeesProcessed, errors }
}
