-- =============================================================================
-- Employee Invites
-- Admin enters phone + role; the invitee sets their own name + password via
-- a tokenized link (SMS-delivered). Only a hash of the token is stored so a
-- DB leak can't hand out live invites.
-- =============================================================================

-- Phone-only invitees never supply an email — the accept page collects only
-- first name, last name, and password (see docs/auth_spec.md §3).
ALTER TABLE employees ALTER COLUMN email DROP NOT NULL;

CREATE TABLE pending_invites (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  laundry_id    UUID          NOT NULL REFERENCES laundries(id),
  phone         TEXT          NOT NULL,
  role          employee_role NOT NULL,
  token_hash    TEXT          NOT NULL UNIQUE,
  expires_at    TIMESTAMPTZ   NOT NULL,
  accepted_at   TIMESTAMPTZ,
  -- Polymorphic by design: employees.id on the tenant path (inviteEmployee),
  -- platform_admins.id on the platform path (provisionLaundry, added later).
  -- No FK — the two id spaces aren't unifiable without a discriminator column,
  -- and this table is never joined against either for display.
  created_by    UUID,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

ALTER TABLE pending_invites ENABLE ROW LEVEL SECURITY;

-- Same tenant-scoping convention as every other table. acceptInvite (the one
-- public/session-less write) always goes through the service-role client, so
-- it never needs — and must never get — an RLS carve-out here.
CREATE POLICY "tenant_isolation" ON pending_invites
  FOR ALL USING (laundry_id = get_my_laundry_id());

CREATE INDEX idx_pending_invites_laundry_id ON pending_invites(laundry_id);
CREATE INDEX idx_pending_invites_token_hash ON pending_invites(token_hash);

-- createInvite's "already has an account" fast path needs to check auth.users
-- by phone, which isn't reachable through the normal REST API (only the
-- public schema is exposed). SECURITY DEFINER lets this narrow function read
-- auth.users without exposing the table itself.
CREATE OR REPLACE FUNCTION get_auth_user_by_phone(p_phone TEXT)
RETURNS UUID AS $$
  SELECT id FROM auth.users WHERE phone = p_phone LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

REVOKE EXECUTE ON FUNCTION get_auth_user_by_phone(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_auth_user_by_phone(TEXT) TO service_role;
