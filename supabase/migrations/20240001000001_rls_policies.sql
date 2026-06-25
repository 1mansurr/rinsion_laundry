-- =============================================================================
-- Rinsion Product A — Row Level Security Policies
-- Spec references:
-- - Rinsion_Technical_Overview.md §2 (Principle 3, multi-tenancy)
-- - Rinsion_Project_Folder_Structure.md → Row Level Security
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helper function
-- Derives the current employee's laundry_id from their Supabase auth UID.
-- SECURITY DEFINER runs with elevated privileges so it can always read employees.
-- STABLE tells the planner it returns the same result within a transaction.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_my_laundry_id()
RETURNS UUID AS $$
  SELECT laundry_id
  FROM employees
  WHERE auth_user_id = auth.uid()
    AND is_active = TRUE
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ---------------------------------------------------------------------------
-- Enable RLS on every laundry-scoped table
-- ---------------------------------------------------------------------------
ALTER TABLE laundries            ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches             ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees            ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_types           ENABLE ROW LEVEL SECURITY;
ALTER TABLE services             ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_service_prices  ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders               ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_notes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_messages         ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings             ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Tables with direct laundry_id column
-- Policy: all operations scoped to the caller's laundry
-- ---------------------------------------------------------------------------

CREATE POLICY "tenant_isolation" ON laundries
  FOR ALL USING (id = get_my_laundry_id());

CREATE POLICY "tenant_isolation" ON branches
  FOR ALL USING (laundry_id = get_my_laundry_id());

CREATE POLICY "tenant_isolation" ON employees
  FOR ALL USING (laundry_id = get_my_laundry_id());

CREATE POLICY "tenant_isolation" ON customers
  FOR ALL USING (laundry_id = get_my_laundry_id());

CREATE POLICY "tenant_isolation" ON item_types
  FOR ALL USING (laundry_id = get_my_laundry_id());

CREATE POLICY "tenant_isolation" ON services
  FOR ALL USING (laundry_id = get_my_laundry_id());

CREATE POLICY "tenant_isolation" ON item_service_prices
  FOR ALL USING (laundry_id = get_my_laundry_id());

CREATE POLICY "tenant_isolation" ON orders
  FOR ALL USING (laundry_id = get_my_laundry_id());

CREATE POLICY "tenant_isolation" ON sms_messages
  FOR ALL USING (laundry_id = get_my_laundry_id());

CREATE POLICY "tenant_isolation" ON activity_logs
  FOR ALL USING (laundry_id = get_my_laundry_id());

CREATE POLICY "tenant_isolation" ON settings
  FOR ALL USING (laundry_id = get_my_laundry_id());

CREATE POLICY "tenant_isolation" ON subscriptions
  FOR ALL USING (laundry_id = get_my_laundry_id());

CREATE POLICY "tenant_isolation" ON subscription_payments
  FOR ALL USING (laundry_id = get_my_laundry_id());

-- ---------------------------------------------------------------------------
-- Child tables without a direct laundry_id column
-- Policy: access granted if the parent order belongs to the caller's laundry
-- ---------------------------------------------------------------------------

CREATE POLICY "tenant_isolation" ON order_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
        AND orders.laundry_id = get_my_laundry_id()
    )
  );

CREATE POLICY "tenant_isolation" ON order_notes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_notes.order_id
        AND orders.laundry_id = get_my_laundry_id()
    )
  );

CREATE POLICY "tenant_isolation" ON payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = payments.order_id
        AND orders.laundry_id = get_my_laundry_id()
    )
  );

CREATE POLICY "tenant_isolation" ON order_status_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_status_history.order_id
        AND orders.laundry_id = get_my_laundry_id()
    )
  );

-- ---------------------------------------------------------------------------
-- Note on internal admin access
-- The Rinsion Developer Dashboard uses the Supabase service-role key via
-- createAdminClient() in lib/supabase.ts. The service-role key bypasses RLS
-- entirely, which is correct — internal admins must read across all tenants.
-- This is the ONLY place the service-role key is used. See:
--   services/admin/isInternalAdmin.ts — email allowlist check before any query
-- ---------------------------------------------------------------------------
