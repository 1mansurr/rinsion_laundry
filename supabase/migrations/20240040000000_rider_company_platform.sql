-- =============================================================================
-- Rider Company Platform (Phase 0: schema)
-- Spec reference: docs/customer-portal+rider.md, "Architecture Recommendation:
-- Logistics Provider Abstraction Layer"
--
-- Supersedes the assumption that a real courier company's own API sits
-- behind LogisticsProvider (src/lib/logistics/types.ts). Instead, Rinsion
-- hosts the rider company itself: a rider company gets its own dashboard
-- tenant (mirrors laundries/employees), invites and tracks its own riders,
-- and works the pickup/delivery job queue that laundries approve into
-- existence. A real external courier API remains a *future*
-- LogisticsProvider implementation if one ever becomes available — this
-- migration does not foreclose that, it just isn't what ships first.
--
-- Single rider company at launch (deliberately): rider_companies is a real
-- table so a second company later is a new row, not a schema rewrite, but no
-- matching/selection/discovery logic is built this phase — every approved
-- pickup/delivery routes to the one active company. See
-- provisionRiderCompany.ts (added later) for the manual, platform-admin-only
-- provisioning path — same shape as provisionLaundry.ts.
--
-- Two independent status trails on logistics_requests, per product decision:
-- `status` (existing, logistics_request_status) stays the laundry/provider
-- -facing lifecycle staff already read via trackPickupStatus/confirmPickupArrival
-- — unchanged. `rider_status` (new, rider_job_status) is the rider's own
-- operational trail on the same row, written from the rider's own view. A
-- rider physically collecting laundry from a customer and the laundry
-- physically receiving it at the shop are two different real-world moments
-- with two different confirmers — this column split is that distinction
-- made concrete, not a duplicate of `status`.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

CREATE TYPE rider_role AS ENUM ('admin', 'rider');

-- Symmetric across both logistics_requests.kind values by design:
-- pickup   -> picked_up means "collected from the customer", dropped_off means "handed to the laundry"
-- delivery -> picked_up means "collected from the laundry",  dropped_off means "handed to the customer"
-- Deliberately NOT reusing 'collected' (already an order_status meaning
-- "customer walked in and collected a finished order" — a different concept,
-- see constants/statuses.ts's note on the /pickup staff flow).
CREATE TYPE rider_job_status AS ENUM ('assigned', 'en_route', 'picked_up', 'dropped_off');

-- ---------------------------------------------------------------------------
-- Rider companies
-- ---------------------------------------------------------------------------

CREATE TABLE rider_companies (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  phone      TEXT        NOT NULL,
  is_active  BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Riders
-- One table for both the company's own dashboard admin and its field
-- riders, same trick as employees.role for laundries. 'admin' manages the
-- roster + job queue; 'rider' works only jobs assigned to them.
-- Soft delete baked in from the start (unlike employees, which added
-- deleted_at in a later migration) now that the end-state shape is known.
-- phone stays plaintext — same convention as employees.phone (staff/company
-- personnel, not customer PII; see customer name/phone encryption which is
-- deliberately scoped to customer_accounts/customers only).
-- ---------------------------------------------------------------------------

CREATE TABLE riders (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id     UUID        UNIQUE REFERENCES auth.users(id),
  rider_company_id UUID        NOT NULL REFERENCES rider_companies(id),
  role             rider_role  NOT NULL DEFAULT 'rider',
  first_name       TEXT        NOT NULL,
  last_name        TEXT        NOT NULL,
  phone            TEXT        NOT NULL,
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);

CREATE INDEX idx_riders_rider_company_id ON riders(rider_company_id);

-- ---------------------------------------------------------------------------
-- Rider invites
-- Same shape and purpose as pending_invites (20240009000000), but a separate
-- table rather than reusing pending_invites: role there is typed to
-- employee_role, not rider_role, and the two tenant spaces (laundries vs
-- rider companies) shouldn't share one invite table's FK story. Powers both
-- the company's first admin (provisionRiderCompany.ts, mirrors
-- provisionLaundry.ts's use of createInvite) and every subsequent rider
-- invite from that company's own dashboard.
-- ---------------------------------------------------------------------------

CREATE TABLE rider_invites (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_company_id  UUID        NOT NULL REFERENCES rider_companies(id),
  phone             TEXT        NOT NULL,
  role              rider_role  NOT NULL,
  token_hash        TEXT        NOT NULL UNIQUE,
  expires_at        TIMESTAMPTZ NOT NULL,
  accepted_at       TIMESTAMPTZ,
  created_by_rider_id UUID      REFERENCES riders(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rider_invites_rider_company_id ON rider_invites(rider_company_id);

-- ---------------------------------------------------------------------------
-- Rider notifications
-- In-app alerts only this phase (Supabase Realtime subscription in the
-- rider's own view) — deliberately not SMS, so rider job notifications never
-- draw against a laundry's SMS quota (a laundry's quota belongs to that
-- laundry's own customer/staff SMS use, not a rider company's operations).
-- True OS-level push (phone alerts with the app closed) needs a native app
-- and is out of scope until that's built.
-- ---------------------------------------------------------------------------

CREATE TABLE rider_notifications (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id              UUID        NOT NULL REFERENCES riders(id),
  logistics_request_id  UUID        NOT NULL REFERENCES logistics_requests(id),
  message               TEXT        NOT NULL,
  read_at               TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rider_notifications_rider_id ON rider_notifications(rider_id, read_at);

-- ---------------------------------------------------------------------------
-- logistics_requests: wire in the rider company platform
-- rider_company_id/assigned_rider_id are nullable — rows created before this
-- migration, and any row a future non-Rinsion-network provider creates, have
-- neither. rider_name/rider_phone (free-text, existing) are untouched and
-- remain the generic fallback for a provider with no `riders` row to point
-- to.
-- ---------------------------------------------------------------------------

ALTER TABLE logistics_requests
  ADD COLUMN rider_company_id UUID REFERENCES rider_companies(id),
  ADD COLUMN assigned_rider_id UUID REFERENCES riders(id),
  ADD COLUMN rider_status rider_job_status;

CREATE INDEX idx_logistics_requests_rider_company_status ON logistics_requests(rider_company_id, status);
CREATE INDEX idx_logistics_requests_assigned_rider_id ON logistics_requests(assigned_rider_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE rider_companies    ENABLE ROW LEVEL SECURITY;
ALTER TABLE riders             ENABLE ROW LEVEL SECURITY;
ALTER TABLE rider_invites      ENABLE ROW LEVEL SECURITY;
ALTER TABLE rider_notifications ENABLE ROW LEVEL SECURITY;

-- Mirrors get_my_laundry_id() (20240001000001_rls_policies.sql) exactly, for
-- the rider-company side of the tenant model.
CREATE OR REPLACE FUNCTION get_my_rider_company_id()
RETURNS UUID AS $$
  SELECT rider_company_id
  FROM riders
  WHERE auth_user_id = auth.uid()
    AND is_active = TRUE
    AND deleted_at IS NULL
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_my_rider_id()
RETURNS UUID AS $$
  SELECT id
  FROM riders
  WHERE auth_user_id = auth.uid()
    AND is_active = TRUE
    AND deleted_at IS NULL
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_my_rider_role()
RETURNS rider_role AS $$
  SELECT role
  FROM riders
  WHERE auth_user_id = auth.uid()
    AND is_active = TRUE
    AND deleted_at IS NULL
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- rider_companies: any rider (admin or field rider) may read their own
-- company's row. No INSERT/UPDATE/DELETE policy — lifecycle is
-- platform-admin-only via the service-role client (provisionRiderCompany.ts),
-- same reasoning as laundries having no owner self-provision path.
CREATE POLICY "self_read" ON rider_companies
  FOR SELECT USING (id = get_my_rider_company_id());

-- riders: tenant-scoped read for everyone in the company (low sensitivity —
-- a roster of names/roles/status). Writes (invite, deactivate, remove)
-- restricted to admin role; enforced in the service layer (requireRiderRole,
-- mirrors requireRole/ROLES.ADMIN) rather than a second RLS policy, matching
-- how employees.role gating already works for laundries.
CREATE POLICY "tenant_isolation" ON riders
  FOR ALL USING (rider_company_id = get_my_rider_company_id());

-- rider_invites: no policy at all. createRiderInvite (admin-authenticated,
-- service-role) and acceptRiderInvite (unauthenticated, service-role) both
-- run entirely on the admin client and bypass RLS by design — same shape as
-- pending_invites having zero policies. RLS-enabled-with-no-policy is
-- default deny, which is correct here.

-- rider_notifications: a rider reads only their own notifications.
CREATE POLICY "self_read" ON rider_notifications
  FOR SELECT USING (rider_id = get_my_rider_id());

CREATE POLICY "self_update" ON rider_notifications
  FOR UPDATE USING (rider_id = get_my_rider_id());

-- logistics_requests: extend the existing tenant_isolation (laundry) +
-- customer_self_read policies with rider-side read access, scoped to the
-- rider's own company. Field-level PII hiding (location only vs full
-- name/phone) is NOT expressed here — that's a service-layer projection
-- concern (getRiderJobs.ts, added later), since it depends on
-- assigned_rider_id = me, not on a column ACL Postgres RLS can express
-- cleanly against joined customer/order data.
CREATE POLICY "rider_company_read" ON logistics_requests
  FOR SELECT USING (rider_company_id = get_my_rider_company_id());

-- Rider-side writes (accepting a job, advancing rider_status) go through
-- SECURITY DEFINER RPCs added alongside the services that use them (mirrors
-- the note at the bottom of 20240037000000 re: create_pickup_request_tx) —
-- a rider has no laundry_id and the existing tenant_isolation policy would
-- otherwise reject a plain update. Not created in this migration — schema
-- only.

-- ---------------------------------------------------------------------------
-- Grants — matching the narrowing already applied to every other tenant
-- table in 20240021000000_tighten_table_grants.sql.
-- ---------------------------------------------------------------------------

REVOKE DELETE ON TABLE
  rider_companies, riders, rider_invites, rider_notifications
FROM anon, authenticated;

REVOKE INSERT, UPDATE ON TABLE
  rider_companies, riders, rider_invites, rider_notifications
FROM anon;

-- ---------------------------------------------------------------------------
-- Realtime — rider_notifications powers the rider's own live in-app badge.
-- logistics_requests is already in the publication (20240037000000); no
-- change needed there for the new columns.
-- ---------------------------------------------------------------------------

ALTER PUBLICATION supabase_realtime ADD TABLE rider_notifications;
