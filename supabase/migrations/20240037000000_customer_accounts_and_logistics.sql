-- =============================================================================
-- Product B — Customer Accounts + Pickup/Delivery Logistics (Phase 0: schema)
-- Spec reference: docs/customer-portal+rider.md
--
-- Adds the tables needed for customers to submit orders remotely and request
-- pickup/delivery, gated through laundry approval before any logistics
-- partner is involved. No plan/feature gating this phase — every laundry
-- gets this once shipped (settings.allow_customer_submissions stays unused,
-- see comment near the bottom).
--
-- Naming note: this is deliberately NOT called "pickup" anywhere near the
-- existing /pickup staff flow (searchForPickup.ts, verifyAndCollect.ts,
-- orders.pickup_code) — that flow verifies a code when a customer walks in
-- to collect a *finished* order. pickup_requests here means a customer
-- asking a rider to collect *dirty* laundry from their location.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

CREATE TYPE pickup_approval_status AS ENUM ('pending', 'approved', 'delayed', 'rejected', 'cancelled');

-- Shared by both pickup and delivery — this is the schema expression of the
-- doc's own principle: "Rinsion owns the order lifecycle, logistics
-- providers own the transportation lifecycle."
CREATE TYPE logistics_request_kind AS ENUM ('pickup', 'delivery');

CREATE TYPE logistics_request_status AS ENUM ('requested', 'assigned', 'in_transit', 'completed', 'cancelled', 'failed');

-- ---------------------------------------------------------------------------
-- Customer identity
-- One customer_accounts row is one login identity, which can link to many
-- per-laundry `customers` rows below (a person using two laundries has one
-- account, two linked customer records) — unlike employees, who belong to
-- exactly one laundry.
-- ---------------------------------------------------------------------------

CREATE TABLE customer_accounts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID        NOT NULL UNIQUE REFERENCES auth.users(id),
  -- encrypted (src/lib/crypto/fieldEncryption.ts), same convention as customers.phone
  phone        TEXT        NOT NULL,
  phone_bidx   TEXT        NOT NULL UNIQUE,
  -- encrypted, same convention as customers.first_name/last_name; nullable
  -- because OTP signup collects a name optionally (see verifyOtp.ts)
  first_name   TEXT,
  last_name    TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ
);

-- Phone-OTP verification codes for customer login/signup. No auth_user_id
-- exists yet at request time (first-time customers have no account), so this
-- cannot reuse password_reset_tokens (which is scoped to existing employee
-- auth users) — mirrors its hashed, short-lived, attempt-capped shape instead.
CREATE TABLE customer_otp_codes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  phone      TEXT        NOT NULL,
  phone_bidx TEXT        NOT NULL,
  code_hash  TEXT        NOT NULL,
  attempts   INT         NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- customers.customer_account_id: the join from a laundry-scoped customer
-- record to the shared login identity above. Nullable — walk-in Product A
-- customers who never use the portal have no linked account.
ALTER TABLE customers ADD COLUMN customer_account_id UUID REFERENCES customer_accounts(id);

CREATE UNIQUE INDEX customers_laundry_customer_account_key
  ON customers(laundry_id, customer_account_id)
  WHERE deleted_at IS NULL AND customer_account_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Orders: allow customer-submitted orders
-- created_by_employee_id has been NOT NULL since the initial schema; every
-- existing row already has it set, so relaxing it is safe. The XOR check
-- ensures an order is always attributable to exactly one kind of creator.
-- ---------------------------------------------------------------------------

ALTER TABLE orders ALTER COLUMN created_by_employee_id DROP NOT NULL;
ALTER TABLE orders ADD COLUMN created_by_customer_account_id UUID REFERENCES customer_accounts(id);
ALTER TABLE orders ADD CONSTRAINT orders_created_by_xor CHECK (
  (created_by_employee_id IS NOT NULL) <> (created_by_customer_account_id IS NOT NULL)
);

CREATE INDEX idx_orders_created_by_customer_account_id ON orders(created_by_customer_account_id);

-- ---------------------------------------------------------------------------
-- Pickup requests — the laundry's approval gate
-- One row per draft order. Rinsion/the laundry owns this decision; no rider
-- company is contacted until approval_status = 'approved'.
-- ---------------------------------------------------------------------------

-- No address columns here — the pickup address IS orders.location (added by
-- 20240036000000_customer_and_order_location.sql), not a separate concept.
-- See 20240039000000's create_pickup_request_tx for how an edit at request
-- time updates orders.location (and optionally customers.location).
CREATE TABLE pickup_requests (
  id                     UUID                   PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id               UUID                   NOT NULL UNIQUE REFERENCES orders(id),
  -- denormalized from orders for RLS scoping and the Realtime subscription filter
  laundry_id             UUID                   NOT NULL REFERENCES laundries(id),
  customer_account_id    UUID                   NOT NULL REFERENCES customer_accounts(id),
  pickup_notes           TEXT,
  approval_status        pickup_approval_status NOT NULL DEFAULT 'pending',
  delayed_until          TIMESTAMPTZ,
  decided_by_employee_id UUID                   REFERENCES employees(id),
  decided_at             TIMESTAMPTZ,
  requested_at           TIMESTAMPTZ            NOT NULL DEFAULT NOW(),
  created_at             TIMESTAMPTZ            NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ            NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pickup_requests_laundry_status ON pickup_requests(laundry_id, approval_status);
CREATE INDEX idx_pickup_requests_customer_account_id ON pickup_requests(customer_account_id);

-- ---------------------------------------------------------------------------
-- Logistics requests — the provider-owned transportation lifecycle
-- Shared table for both pickup and delivery legs. provider = 'manual' this
-- phase (staff update rider/status by hand via src/lib/logistics/); a real
-- courier plugs in later by writing a new LogisticsProvider implementation,
-- not by changing this schema.
-- ---------------------------------------------------------------------------

CREATE TABLE logistics_requests (
  id                       UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
  laundry_id               UUID                     NOT NULL REFERENCES laundries(id),
  order_id                 UUID                     NOT NULL REFERENCES orders(id),
  kind                     logistics_request_kind  NOT NULL,
  provider                 TEXT                     NOT NULL DEFAULT 'manual',
  -- external tracking ID once a real provider exists; NULL for the manual provider
  provider_ref_id          TEXT,
  status                   logistics_request_status NOT NULL DEFAULT 'requested',
  rider_name               TEXT,
  -- encrypted, same convention as customers.phone
  rider_phone              TEXT,
  requested_by_employee_id UUID                     REFERENCES employees(id),
  assigned_at              TIMESTAMPTZ,
  in_transit_at            TIMESTAMPTZ,
  completed_at             TIMESTAMPTZ,
  cancelled_at             TIMESTAMPTZ,
  metadata                 JSONB                    NOT NULL DEFAULT '{}',
  created_at               TIMESTAMPTZ              NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ              NOT NULL DEFAULT NOW()
);

-- Not UNIQUE(order_id, kind): a cancelled/failed attempt may need a retry row.
-- Service-layer logic checks for an existing active row before inserting.
CREATE INDEX idx_logistics_requests_order_kind ON logistics_requests(order_id, kind);
CREATE INDEX idx_logistics_requests_laundry_status ON logistics_requests(laundry_id, status);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE customer_accounts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_requests    ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistics_requests ENABLE ROW LEVEL SECURITY;

-- Mirrors get_my_laundry_id() (20240001000001_rls_policies.sql) for the
-- customer side: derives the caller's customer_accounts.id from auth.uid().
CREATE OR REPLACE FUNCTION get_my_customer_account_id()
RETURNS UUID AS $$
  SELECT id
  FROM customer_accounts
  WHERE auth_user_id = auth.uid()
    AND deleted_at IS NULL
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- customer_accounts: a customer may read/update only their own row.
-- No INSERT/DELETE policy — account creation/removal only ever happens via
-- the service-role admin client (customer signup, account deletion), which
-- bypasses RLS entirely, same reasoning as employees' admin-only lifecycle.
CREATE POLICY "self_read" ON customer_accounts
  FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY "self_update" ON customer_accounts
  FOR UPDATE USING (auth_user_id = auth.uid());

-- customer_otp_codes: no policy at all. requestOtp/verifyOtp are both
-- unauthenticated and run entirely on the service-role client, which
-- bypasses RLS — same reasoning and same shape as password_reset_tokens
-- (20240028000000_password_reset_tokens.sql). RLS-enabled-with-no-policy is
-- default deny, which is correct: no session client has a legitimate reason
-- to read this table.

-- laundries / customers / orders / order_items / order_notes: existing staff
-- "tenant_isolation" policies are untouched. Add read-only customer-side
-- policies scoped through customer_account_id.
--
-- Note: this laundries policy only covers a laundry the customer already has
-- a linked customers row for (i.e. they've submitted at least one order
-- there before). First-time resolution of a laundry by its public_slug
-- (portal/o/[slug], before any customers row exists) deliberately does NOT
-- go through this RLS path — it uses the admin/service-role client, same
-- established precedent as the existing join-by-PIN laundry lookup
-- (joinLaundry.ts, noted in 20240021000000_tighten_table_grants.sql).
CREATE POLICY "customer_self_read" ON laundries
  FOR SELECT USING (
    id IN (SELECT laundry_id FROM customers WHERE customer_account_id = get_my_customer_account_id())
  );

CREATE POLICY "customer_self_read" ON customers
  FOR SELECT USING (customer_account_id = get_my_customer_account_id());

CREATE POLICY "customer_self_read" ON orders
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE customer_account_id = get_my_customer_account_id())
  );

CREATE POLICY "customer_self_read" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
        AND orders.customer_id IN (SELECT id FROM customers WHERE customer_account_id = get_my_customer_account_id())
    )
  );

CREATE POLICY "customer_self_read" ON order_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_notes.order_id
        AND orders.customer_id IN (SELECT id FROM customers WHERE customer_account_id = get_my_customer_account_id())
    )
  );

-- payments: needed so the customer invoice view (portal/orders/[orderId]/invoice)
-- can show payment status, per docs/customer-portal+rider.md's invoice spec.
CREATE POLICY "customer_self_read" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = payments.order_id
        AND orders.customer_id IN (SELECT id FROM customers WHERE customer_account_id = get_my_customer_account_id())
    )
  );

-- pickup_requests / logistics_requests: staff get the standard tenant_isolation
-- shape; customers get read-only access to their own requests.

CREATE POLICY "tenant_isolation" ON pickup_requests
  FOR ALL USING (laundry_id = get_my_laundry_id());

CREATE POLICY "customer_self_read" ON pickup_requests
  FOR SELECT USING (customer_account_id = get_my_customer_account_id());

CREATE POLICY "tenant_isolation" ON logistics_requests
  FOR ALL USING (laundry_id = get_my_laundry_id());

CREATE POLICY "customer_self_read" ON logistics_requests
  FOR SELECT USING (
    order_id IN (
      SELECT o.id FROM orders o
      JOIN customers c ON c.id = o.customer_id
      WHERE c.customer_account_id = get_my_customer_account_id()
    )
  );

-- Note on customer-side writes (deliberate deviation from the existing
-- SECURITY INVOKER RPC pattern in 20240007000000_order_write_transactions.sql):
-- a customer has no employees row, so get_my_laundry_id() resolves to NULL
-- and a plain insert would be rejected by the "tenant_isolation" policies
-- above. The Phase 1 RPCs (create_customer_order_tx, create_pickup_request_tx)
-- must therefore run SECURITY DEFINER and self-check
-- p_customer_account_id = get_my_customer_account_id() as their first
-- statement, since they bypass RLS by design. Not created in this migration —
-- schema only.

-- ---------------------------------------------------------------------------
-- Grants — matching the narrowing already applied to every other tenant
-- table in 20240021000000_tighten_table_grants.sql. No code path deletes
-- these rows (cancellation is a status change, not a delete), and anon has
-- no legitimate access to any tenant table.
-- ---------------------------------------------------------------------------

REVOKE DELETE ON TABLE
  customer_accounts, customer_otp_codes, pickup_requests, logistics_requests
FROM anon, authenticated;

REVOKE INSERT, UPDATE ON TABLE
  customer_accounts, customer_otp_codes, pickup_requests, logistics_requests
FROM anon;

-- ---------------------------------------------------------------------------
-- Realtime — first use in this codebase. Opt-in per table; the laundry
-- dashboard subscribes to postgres_changes on these so staff see new/updated
-- requests live instead of needing a manual refresh.
-- ---------------------------------------------------------------------------

ALTER PUBLICATION supabase_realtime ADD TABLE pickup_requests, logistics_requests;

-- ---------------------------------------------------------------------------
-- settings.allow_customer_submissions is now the manual per-laundry switch
-- for the whole Product B customer portal + pickup/delivery workflow.
-- Defaults FALSE for every laundry (existing and new) — hidden until
-- explicitly turned on for a given laundry, e.g. while testing. This is a
-- manual on/off, not a subscription-plan-tier gate.
-- ---------------------------------------------------------------------------

COMMENT ON COLUMN settings.allow_customer_submissions IS
  'Per-laundry switch for the Product B customer portal + pickup/delivery workflow. Defaults FALSE. No self-serve UI yet — flip manually per laundry to enable. Gates both the customer portal (see laundries.public_slug) and the "Pickup Requests" staff nav item.';
