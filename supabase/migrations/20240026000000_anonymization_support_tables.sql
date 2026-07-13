-- =============================================================================
-- Anonymization support tables (docs/deletion_retention_plan.md §7, §4)
--
-- auth_identity_purge_queue — durable record of "this auth.users row still
-- needs deleting," written transactionally by anonymize_employee_tx (see
-- 20240024000000) in the same commit that detaches employees.auth_user_id.
-- Because auth.users deletion happens via the GoTrue admin API, not plain
-- SQL, it can't be part of that same transaction — this table is what makes
-- the two-step neutralization recoverable instead of best-effort-and-forget
-- if the admin.auth.admin.deleteUser() call fails after the DB commit lands.
--
-- erasure_requests — intake + fulfillment record for on-request erasure
-- (Act 843), independent of the scheduled retention-timer purge. Two
-- triggers share the same anonymize_*_tx RPCs: the scheduled purge (gated on
-- a TBD retention window) and this one (platform-admin/service-role only,
-- never gated on retention, never reachable from the tenant-facing app).
--
-- Both tables are service_role-only end to end — per 20240021000000's
-- established posture, new tables ship with anon/authenticated grants
-- revoked at creation rather than as a follow-up migration.
-- =============================================================================

CREATE TABLE auth_identity_purge_queue (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID        NOT NULL,
  employee_id  UUID        NOT NULL REFERENCES employees(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attempted_at TIMESTAMPTZ,
  attempts     INT         NOT NULL DEFAULT 0,
  last_error   TEXT,
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_auth_identity_purge_queue_pending
  ON auth_identity_purge_queue(requested_at) WHERE completed_at IS NULL;

REVOKE ALL ON TABLE auth_identity_purge_queue FROM anon, authenticated;

CREATE TABLE erasure_requests (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  laundry_id   UUID        NOT NULL REFERENCES laundries(id),
  subject_type TEXT        NOT NULL CHECK (subject_type IN ('customer', 'employee')),
  -- Polymorphic (customers.id or employees.id depending on subject_type) —
  -- no single FK is possible across two target tables, same precedent as
  -- pending_invites.created_by.
  subject_id   UUID        NOT NULL,
  -- Internal note only (e.g. "Act 843 request via support ticket #1234") —
  -- never shown to the tenant. Free text, so treat as a potential incidental
  -- PII container the same way order_notes is (docs/deletion_retention_plan.md §3).
  reason       TEXT,
  requested_by UUID        REFERENCES platform_admins(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status       TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
  resolved_by  UUID        REFERENCES platform_admins(id),
  resolved_at  TIMESTAMPTZ
);

CREATE INDEX idx_erasure_requests_laundry_id ON erasure_requests(laundry_id);
CREATE INDEX idx_erasure_requests_pending ON erasure_requests(status) WHERE status = 'pending';

REVOKE ALL ON TABLE erasure_requests FROM anon, authenticated;
