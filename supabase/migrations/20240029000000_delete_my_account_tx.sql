-- =============================================================================
-- delete_my_account_tx — atomic self-deletion with a race-free "last admin"
-- guard.
--
-- Bug: src/services/employees/deleteMyAccount.ts previously did a plain
-- SELECT count(*) of other active admins, then a separate UPDATE, with
-- nothing tying the two together. Two admins in a laundry with exactly two
-- active admins calling deleteMyAccount() concurrently could both read
-- "another admin still exists" before either UPDATE committed, leaving the
-- laundry with zero admins and no one able to invite a replacement.
--
-- Fix: pg_advisory_xact_lock serializes concurrent callers for the same
-- laundry_id, so the count-then-update happens as one effective critical
-- section without taking a full table/row lock. The lock is released
-- automatically at transaction end (xact-scoped).
--
-- SECURITY INVOKER (default) — runs under the caller's own session/role, so
-- the existing tenant_isolation RLS policy on employees still applies; same
-- trust model as create_order_tx (20240007000000).
-- =============================================================================

CREATE OR REPLACE FUNCTION delete_my_account_tx(
  p_employee_id UUID,
  p_laundry_id  UUID,
  p_is_admin    BOOLEAN
)
RETURNS TABLE(blocked BOOLEAN)
LANGUAGE plpgsql
AS $$
DECLARE
  v_other_active_admins INT;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_laundry_id::text));

  IF p_is_admin THEN
    SELECT count(*) INTO v_other_active_admins
    FROM employees
    WHERE laundry_id = p_laundry_id
      AND role = 'admin'
      AND is_active = true
      AND deleted_at IS NULL
      AND id != p_employee_id;

    IF v_other_active_admins = 0 THEN
      RETURN QUERY SELECT true;
      RETURN;
    END IF;
  END IF;

  UPDATE employees
  SET deleted_at = NOW(), is_active = false
  WHERE id = p_employee_id AND laundry_id = p_laundry_id;

  RETURN QUERY SELECT false;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_my_account_tx TO authenticated;
