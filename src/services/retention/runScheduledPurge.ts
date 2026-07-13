'use server'

import { createAdminClient } from '@/lib/supabase'
import { RETENTION_DAYS } from '@/constants/retention'

export interface PurgeResult {
  target: string
  skipped: boolean
  deleted: number
  error?: string
}

function cutoffIso(days: number | null): string | null {
  if (days === null) return null
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

/**
 * Bulk, timer-based retention purge — trigger 1 of the two anonymize_*_tx
 * triggers (docs/deletion_retention_plan.md §4/§8). Every target is
 * independently gated on its own TBD retention constant
 * (constants/retention.ts) — `null` means "not yet configured, skip," never
 * "purge immediately." Must run under service_role: DELETE is revoked from
 * anon/authenticated on every one of these tables
 * (20240021000000_tighten_table_grants.sql).
 *
 * erasure_requests is deliberately excluded — it's compliance evidence, not
 * disposable log noise. See constants/retention.ts and
 * docs/deletion_retention_plan.md §9 item 0a.
 */
export async function runScheduledPurge(): Promise<PurgeResult[]> {
  const admin = createAdminClient()
  const results: PurgeResult[] = []

  async function purgeByColumn(target: string, column: string, days: number | null): Promise<void> {
    const cutoff = cutoffIso(days)
    if (!cutoff) {
      results.push({ target, skipped: true, deleted: 0 })
      return
    }
    const { error, count } = await admin.from(target).delete({ count: 'exact' }).lt(column, cutoff)
    results.push({ target, skipped: false, deleted: count ?? 0, error: error?.message })
  }

  await purgeByColumn('activity_logs', 'created_at', RETENTION_DAYS.activityLogs)

  // Functional lower bound: must not eat into the current billing cycle's
  // idx_sms_messages_cap_query quota math. See constants/retention.ts.
  await purgeByColumn('sms_messages', 'created_at', RETENTION_DAYS.smsMessages)

  {
    const cutoff = cutoffIso(RETENTION_DAYS.pendingInvites)
    if (!cutoff) {
      results.push({ target: 'pending_invites', skipped: true, deleted: 0 })
    } else {
      const { error, count } = await admin.from('pending_invites').delete({ count: 'exact' }).lt('expires_at', cutoff)
      results.push({ target: 'pending_invites', skipped: false, deleted: count ?? 0, error: error?.message })
    }
  }

  {
    const resolvedCutoff = cutoffIso(RETENTION_DAYS.joinRequestsResolved)
    const stalePendingCutoff = cutoffIso(RETENTION_DAYS.joinRequestsStalePending)
    if (!resolvedCutoff && !stalePendingCutoff) {
      results.push({ target: 'join_requests', skipped: true, deleted: 0 })
    } else {
      let deleted = 0
      const errors: string[] = []
      if (resolvedCutoff) {
        const { error, count } = await admin
          .from('join_requests')
          .delete({ count: 'exact' })
          .in('status', ['approved', 'rejected'])
          .lt('resolved_at', resolvedCutoff)
        deleted += count ?? 0
        if (error) errors.push(error.message)
      }
      if (stalePendingCutoff) {
        const { error, count } = await admin
          .from('join_requests')
          .delete({ count: 'exact' })
          .eq('status', 'pending')
          .lt('created_at', stalePendingCutoff)
        deleted += count ?? 0
        if (error) errors.push(error.message)
      }
      results.push({ target: 'join_requests', skipped: false, deleted, error: errors.length ? errors.join('; ') : undefined })
    }
  }

  {
    const cutoff = cutoffIso(RETENTION_DAYS.pendingPayments)
    if (!cutoff) {
      results.push({ target: 'pending_payments', skipped: true, deleted: 0 })
    } else {
      const { error, count } = await admin
        .from('pending_payments')
        .delete({ count: 'exact' })
        .not('resolved_at', 'is', null)
        .lt('resolved_at', cutoff)
      results.push({ target: 'pending_payments', skipped: false, deleted: count ?? 0, error: error?.message })
    }
  }

  {
    const cutoff = cutoffIso(RETENTION_DAYS.authIdentityPurgeQueue)
    if (!cutoff) {
      results.push({ target: 'auth_identity_purge_queue', skipped: true, deleted: 0 })
    } else {
      const { error, count } = await admin
        .from('auth_identity_purge_queue')
        .delete({ count: 'exact' })
        .not('completed_at', 'is', null)
        .lt('completed_at', cutoff)
      results.push({ target: 'auth_identity_purge_queue', skipped: false, deleted: count ?? 0, error: error?.message })
    }
  }

  return results
}
