import { NextRequest, NextResponse } from 'next/server'
import { reconcileAuthPurgeQueue } from '@/services/retention/reconcileAuthPurgeQueue'
import { runScheduledPurge } from '@/services/retention/runScheduledPurge'
import { runScheduledAnonymization } from '@/services/retention/runScheduledAnonymization'

/**
 * Vercel Cron endpoint — daily retention sweep
 * (docs/deletion_retention_plan.md §5, §7, §8). Three independent steps,
 * each safe to run even if the others fail or if the TBD retention numbers
 * are still unset:
 *   1. Retry pending auth.users deletions — always safe, not a retention
 *      decision, just finishing an already-committed anonymization.
 *   2. Bulk purge of activity_logs/sms_messages/pending_invites/
 *      join_requests/pending_payments/auth_identity_purge_queue — each
 *      independently gated on its own TBD retention constant
 *      (constants/retention.ts); unset targets are skipped, never guessed.
 *   3. Scheduled-timer anonymization sweep for customers/employees past the
 *      grace period. Distinct from, and independent of, the on-request
 *      erasure path (src/services/platform/fulfillErasureRequest.ts), which
 *      never runs from this cron — see docs/deletion_retention_plan.md §4's
 *      two-trigger design.
 *
 * Auth: Bearer token matched against CRON_SECRET env var, same pattern as
 * /api/cron/advance-subscriptions.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.error('CRON_SECRET is not set')
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const reconcile = await reconcileAuthPurgeQueue()
  const purge = await runScheduledPurge()
  const anonymization = await runScheduledAnonymization()

  const errors = [
    ...reconcile.errors,
    ...purge.filter(r => r.error).map(r => `${r.target}: ${r.error}`),
    ...anonymization.errors,
  ]
  if (errors.length > 0) {
    console.error('[cron] retention-sweep errors:', errors)
  }

  console.log(
    `[cron] retention-sweep: authPurgeRetried=${reconcile.retried} ` +
    `purge=${JSON.stringify(purge)} ` +
    `anonymized(customers=${anonymization.customersProcessed},employees=${anonymization.employeesProcessed})`
  )

  return NextResponse.json({ ok: true, reconcile, purge, anonymization })
}
