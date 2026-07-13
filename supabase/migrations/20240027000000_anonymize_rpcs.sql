-- =============================================================================
-- anonymize_customer_tx / anonymize_employee_tx
-- Spec: docs/deletion_retention_plan.md §4, §5, §7
--
-- SECURITY DEFINER, GRANT EXECUTE TO service_role only — per
-- 20240021000000_tighten_table_grants.sql's own guidance ("when [purge/
-- anonymize RPCs are] added, they should run as SECURITY DEFINER under
-- service_role... not rely on these authenticated/anon grants"). Unlike
-- create_order_tx/record_payment_tx (SECURITY INVOKER, RLS-scoped), these
-- get NO RLS backstop — service_role bypasses tenant_isolation entirely.
-- Authorization (caller is a platform admin, or is the trusted scheduled-job
-- process; target row's laundry_id is consistent) is enforced entirely in
-- the TS service layer BEFORE either RPC is ever invoked — see
-- src/services/retention/anonymizeCustomerTx.ts,
-- src/services/retention/anonymizeEmployeeTx.ts, and
-- src/services/platform/fulfillErasureRequest.ts. Only those designated call
-- paths (plus the retention-sweep cron) may ever call these functions.
--
-- Ciphertext/blind-index parameters are pre-computed by the TS caller
-- (encryptField()/computeBlindIndex() require FIELD_ENCRYPTION_KEY/
-- BLIND_INDEX_KEY, which live in server env vars, not Postgres) — same
-- convention as create_order_tx already uses for pre-computed values.
--
-- p_old_first_name/p_old_last_name/p_old_phone_plain are used transiently,
-- for the free-text scrub below, and never stored. Matching is a literal,
-- case-sensitive substring replace() — not a regex, and not a cryptographic
-- guarantee. It will miss text formatted differently than the stored value
-- (different casing, spacing, or a nickname). This is a direct consequence
-- of ever having stored PII as interpolated free text in the first place —
-- see docs/deletion_retention_plan.md §2 for the source-level fix, which
-- makes this scrub a transitional safety net for legacy rows, not a
-- permanent fixture.
-- =============================================================================

CREATE OR REPLACE FUNCTION anonymize_customer_tx(
  p_customer_id         UUID,
  p_anon_phone_ct       TEXT,
  p_anon_phone_bidx     TEXT,
  p_old_first_name      TEXT,
  p_old_last_name       TEXT,
  p_old_phone_plain     TEXT,
  p_trigger_description TEXT,
  p_erasure_request_id  UUID DEFAULT NULL,
  p_platform_admin_id   UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_laundry_id UUID;
  v_deleted_at TIMESTAMPTZ;
BEGIN
  SELECT laundry_id, deleted_at INTO v_laundry_id, v_deleted_at
  FROM customers WHERE id = p_customer_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'anonymize_customer_tx: customer % not found', p_customer_id;
  END IF;
  IF v_deleted_at IS NULL THEN
    RAISE EXCEPTION 'anonymize_customer_tx: customer % must be soft-deleted before anonymization', p_customer_id;
  END IF;

  UPDATE customers
  SET first_name = 'Deleted',
      last_name  = 'Customer',
      phone      = p_anon_phone_ct,
      phone_bidx = p_anon_phone_bidx
  WHERE id = p_customer_id;

  -- sms_messages: exact scope via customer_id, full column overwrite (no
  -- text matching needed — the FK already isolates exactly the right rows,
  -- and this never touches the current billing cycle's quota accounting
  -- since it's a column UPDATE, not a row DELETE).
  UPDATE sms_messages
  SET phone = '[redacted]',
      message = '[redacted — customer erased]'
  WHERE customer_id = p_customer_id;

  -- order_notes: best-effort scrub, scoped to this customer's own orders
  -- (docs/deletion_retention_plan.md §3 — deliberately not automated for
  -- employees, whose name could appear on any order, not just their own).
  IF length(trim(coalesce(p_old_first_name, ''))) > 0 AND length(trim(coalesce(p_old_last_name, ''))) > 0 THEN
    UPDATE order_notes
    SET note = replace(note, p_old_first_name || ' ' || p_old_last_name, '[redacted]')
    WHERE order_id IN (SELECT id FROM orders WHERE customer_id = p_customer_id);
  END IF;

  IF length(trim(coalesce(p_old_phone_plain, ''))) > 0 THEN
    UPDATE order_notes
    SET note = replace(note, p_old_phone_plain, '[redacted]')
    WHERE order_id IN (SELECT id FROM orders WHERE customer_id = p_customer_id);
  END IF;

  -- No activity_logs scrub for customers: confirmed in the retention plan
  -- that no customer PII ever reaches activity_logs.description anywhere in
  -- this codebase (order-related descriptions only ever contain
  -- order_number/pickup_code/amounts, never a customer name or phone).

  INSERT INTO activity_logs (laundry_id, platform_admin_id, action_type, description)
  VALUES (
    v_laundry_id,
    p_platform_admin_id,
    'CUSTOMER_ANONYMIZED',
    'Customer permanently anonymized (' || p_trigger_description ||
      CASE WHEN p_erasure_request_id IS NOT NULL THEN ', request ' || p_erasure_request_id ELSE '' END || ')'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION anonymize_customer_tx(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION anonymize_customer_tx(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, UUID) TO service_role;

CREATE OR REPLACE FUNCTION anonymize_employee_tx(
  p_employee_id         UUID,
  p_anon_phone_ct       TEXT,
  p_old_first_name      TEXT,
  p_old_last_name       TEXT,
  p_old_phone_plain     TEXT,
  p_trigger_description TEXT,
  p_erasure_request_id  UUID DEFAULT NULL,
  p_platform_admin_id   UUID DEFAULT NULL
)
RETURNS UUID  -- the detached auth_user_id (NULL if the employee had none, or
              -- was already anonymized) — the caller hands this to
              -- admin.auth.admin.deleteUser() outside this transaction, per
              -- docs/deletion_retention_plan.md §7.
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_laundry_id   UUID;
  v_deleted_at   TIMESTAMPTZ;
  v_auth_user_id UUID;
  v_label        TEXT;
BEGIN
  SELECT laundry_id, deleted_at, auth_user_id INTO v_laundry_id, v_deleted_at, v_auth_user_id
  FROM employees WHERE id = p_employee_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'anonymize_employee_tx: employee % not found', p_employee_id;
  END IF;
  IF v_deleted_at IS NULL THEN
    RAISE EXCEPTION 'anonymize_employee_tx: employee % must be soft-deleted before anonymization', p_employee_id;
  END IF;

  -- Stable, per-row, distinguishing label — unlike customers, employees keep
  -- attribution (payments/refunds/status-history accountability needs to
  -- tell two different former employees apart, not just know "someone
  -- former did this"). Derived purely from the row's own immutable id, no
  -- app-layer crypto needed. Fits the existing `${firstName} ${lastName}`
  -- display convention with zero UI changes: renders as
  -- "Former Staff #A1B2C3D4".
  v_label := 'Staff #' || upper(substring(replace(p_employee_id::text, '-', ''), 1, 8));

  UPDATE employees
  SET first_name   = 'Former',
      last_name    = v_label,
      email        = NULL,
      phone        = p_anon_phone_ct,
      auth_user_id = NULL
  WHERE id = p_employee_id;

  -- activity_logs: best-effort scrub for legacy rows written before
  -- docs/deletion_retention_plan.md §2's call-site conversion ships (or for
  -- any laundry where it hasn't been deployed yet) — description strings
  -- that bake in this employee's old name/phone directly, independent of
  -- any structured employee_id/target_employee_id column. Scoped to this
  -- employee's laundry to avoid touching an unrelated tenant's logs.
  IF length(trim(coalesce(p_old_first_name, ''))) > 0 AND length(trim(coalesce(p_old_last_name, ''))) > 0 THEN
    UPDATE activity_logs
    SET description = replace(description, p_old_first_name || ' ' || p_old_last_name, '[redacted]')
    WHERE laundry_id = v_laundry_id;
  END IF;

  IF length(trim(coalesce(p_old_phone_plain, ''))) > 0 THEN
    UPDATE activity_logs
    SET description = replace(description, p_old_phone_plain, '[redacted]')
    WHERE laundry_id = v_laundry_id;
  END IF;

  -- No sms_messages scrub for employees: no structural or textual link
  -- between sms_messages and an employee anywhere in the schema.
  -- No order_notes scrub for employees: deliberately not automated, see
  -- docs/deletion_retention_plan.md §3.

  -- Durable record of the pending auth.users deletion, written in the same
  -- transaction as the auth_user_id detach above, so the intent to delete
  -- survives even if the process crashes before the out-of-transaction
  -- admin.auth.admin.deleteUser() call (made by the TS caller, after this
  -- function returns) ever fires. See docs/deletion_retention_plan.md §7.
  IF v_auth_user_id IS NOT NULL THEN
    INSERT INTO auth_identity_purge_queue (auth_user_id, employee_id)
    VALUES (v_auth_user_id, p_employee_id);
  END IF;

  INSERT INTO activity_logs (laundry_id, platform_admin_id, action_type, target_employee_id, description)
  VALUES (
    v_laundry_id,
    p_platform_admin_id,
    'EMPLOYEE_ANONYMIZED',
    p_employee_id,
    'Employee permanently anonymized (' || p_trigger_description ||
      CASE WHEN p_erasure_request_id IS NOT NULL THEN ', request ' || p_erasure_request_id ELSE '' END || ')'
  );

  RETURN v_auth_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION anonymize_employee_tx(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION anonymize_employee_tx(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, UUID) TO service_role;

-- =============================================================================
-- record_auth_purge_attempt — bookkeeping for the auth_identity_purge_queue
-- retry loop (docs/deletion_retention_plan.md §7). Avoids a read-then-write
-- race in the TS layer for the attempts counter.
-- =============================================================================

CREATE OR REPLACE FUNCTION record_auth_purge_attempt(
  p_auth_user_id UUID,
  p_success      BOOLEAN,
  p_error        TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_success THEN
    UPDATE auth_identity_purge_queue
    SET completed_at = NOW()
    WHERE auth_user_id = p_auth_user_id AND completed_at IS NULL;
  ELSE
    UPDATE auth_identity_purge_queue
    SET attempts = attempts + 1,
        attempted_at = NOW(),
        last_error = p_error
    WHERE auth_user_id = p_auth_user_id AND completed_at IS NULL;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION record_auth_purge_attempt(UUID, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION record_auth_purge_attempt(UUID, BOOLEAN, TEXT) TO service_role;
