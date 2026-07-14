/**
 * constants/retention.ts
 *
 * Retention windows for the scheduled purge / anonymization sweep
 * (docs/deletion_retention_plan.md §5, §8). Every value is `null` — a real
 * legal answer hasn't been supplied yet. `null` is treated as "not yet
 * configured, do nothing" everywhere these are read (see
 * src/services/retention/runRetentionSweep.ts), not as "purge immediately" —
 * the unset default must be safe, never destructive.
 *
 * Fill in real numbers (days) once legal signs off. Two of these have real
 * *functional*, not just legal, lower bounds — don't set them below these
 * without understanding why:
 *   - RETENTION_DAYS.smsMessages must not be shorter than the current
 *     billing cycle length (CYCLE_DAYS in constants/plans.ts), or the
 *     scheduled purge could delete rows idx_sms_messages_cap_query still
 *     needs for the active cycle's quota math. (Only the full-row purge is
 *     affected — the immediate per-subject scrub in anonymize_customer_tx
 *     never deletes a row, so it never disturbs quota accounting.)
 *   - RETENTION_DAYS.pendingInvites must not be shorter than the invite/
 *     reset-token TTLs already specced in docs/auth_spec.md §1 (7 days for
 *     invites, 1 hour for phone-password-reset tokens), or valid in-flight
 *     tokens would be purged before anyone could use them.
 */

export const RETENTION_DAYS = {
  /** activity_logs — full-row purge. Independent of the per-subject scrub
   *  anonymize_customer_tx/anonymize_employee_tx already perform immediately. */
  activityLogs: null as number | null,
  /** sms_messages — full-row purge. See functional lower bound above. */
  smsMessages: null as number | null,
  /** pending_invites — past expires_at + this grace. See functional lower bound above. */
  pendingInvites: null as number | null,
  /** join_requests — resolved (approved/rejected) rows past this window. */
  joinRequestsResolved: null as number | null,
  /** join_requests — stale, never-resolved 'pending' rows past this window. */
  joinRequestsStalePending: null as number | null,
  /** pending_payments — resolved rows past this window. */
  pendingPayments: null as number | null,
  /** auth_identity_purge_queue — completed rows past this window (operational
   *  scaffolding, not the compliance evidence — see erasureRequests below). */
  authIdentityPurgeQueue: null as number | null,
  /** customers / employees — soft-deleted (deleted_at set) past this window
   *  become eligible for the *scheduled-purge* anonymization trigger.
   *  Never gates the on-request erasure trigger — see
   *  docs/deletion_retention_plan.md §4's two-trigger design. */
  anonymizationGracePeriod: null as number | null,
  /** erasure_requests — deliberately has NO entry here and is never wired
   *  into the purge sweep. Decided (docs/deletion_retention_plan.md §9 item
   *  0a): retained indefinitely. A row (pending, completed, or rejected) is
   *  the durable compliance record of an Act 843 request and its outcome —
   *  the opposite of disposable log noise, and there's no compensating
   *  benefit to deleting it later since the RPC has already scrubbed the
   *  subject's own PII by the time a row reaches 'completed'. */
} as const

/** Auth-identity-deletion retry backoff/attempt limits (docs/deletion_retention_plan.md §7).
 *  Not a legal retention number — these are operational and safe to default. */
export const AUTH_PURGE_RETRY = {
  maxAttempts: 5,
  backoffMinutes: 30,
}
