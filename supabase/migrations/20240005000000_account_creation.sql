-- =============================================================================
-- Self-Serve Account Creation
-- Adds a join PIN per laundry and a join_requests table so a new user can
-- either create their own laundry (self-serve) or request to join an
-- existing one, pending admin approval.
-- =============================================================================

ALTER TABLE laundries ADD COLUMN join_pin TEXT;
-- Backfill existing laundries with a random 6-digit PIN. Collision odds are
-- negligible at this table's size; the app generates+retries for new ones.
UPDATE laundries SET join_pin = LPAD((FLOOR(RANDOM() * 1000000))::TEXT, 6, '0') WHERE join_pin IS NULL;
ALTER TABLE laundries ALTER COLUMN join_pin SET NOT NULL;
ALTER TABLE laundries ADD CONSTRAINT laundries_join_pin_key UNIQUE (join_pin);

-- A pending/approved/rejected request from an authenticated (but not-yet-employee)
-- user to join an existing laundry. The requester already has an auth.users
-- row from signup — approval just creates their employees row.
CREATE TABLE join_requests (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  laundry_id              UUID        NOT NULL REFERENCES laundries(id),
  auth_user_id            UUID        NOT NULL REFERENCES auth.users(id),
  first_name              TEXT        NOT NULL,
  last_name               TEXT        NOT NULL,
  email                   TEXT        NOT NULL,
  phone                   TEXT        NOT NULL,
  status                  TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  resolved_by_employee_id UUID        REFERENCES employees(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at             TIMESTAMPTZ
);

ALTER TABLE join_requests ENABLE ROW LEVEL SECURITY;

-- Admin access, scoped to their own laundry — same pattern as every other table.
CREATE POLICY "tenant_isolation" ON join_requests
  FOR ALL USING (laundry_id = get_my_laundry_id());

-- The requester isn't an employee yet, so get_my_laundry_id() resolves to NULL
-- for them — these two policies are the narrow exception letting them create
-- and check their own request without any employee row existing yet.
CREATE POLICY "requester_can_view_own" ON join_requests
  FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY "requester_can_insert_own" ON join_requests
  FOR INSERT WITH CHECK (auth_user_id = auth.uid());

CREATE INDEX idx_join_requests_laundry_id ON join_requests(laundry_id);
CREATE INDEX idx_join_requests_pending ON join_requests(laundry_id, status) WHERE status = 'pending';
