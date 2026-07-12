-- =============================================================================
-- Employees Soft Delete (Stage 2 of the deletion plan, docs/auth_spec.md §2)
-- Adds the same deleted_at column that customers/orders/item_types/services
-- already have. is_active remains the separate "temporarily deactivated"
-- toggle (unchanged, still surfaced via Deactivate/Reactivate) — deleted_at
-- is the new, harder "removed / recycle-bin" state. removeEmployee always
-- sets both columns together; restoreEmployee clears deleted_at and sets
-- is_active back to true.
-- =============================================================================

ALTER TABLE employees ADD COLUMN deleted_at TIMESTAMPTZ;

-- Defense-in-depth: get_my_laundry_id() already excludes is_active = FALSE
-- employees (which removeEmployee always pairs with deleted_at), but check
-- deleted_at directly too so RLS tenant-scoping never silently depends on
-- every future call site remembering to keep the two columns in sync.
CREATE OR REPLACE FUNCTION get_my_laundry_id()
RETURNS UUID AS $$
  SELECT laundry_id
  FROM employees
  WHERE auth_user_id = auth.uid()
    AND is_active = TRUE
    AND deleted_at IS NULL
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;
