-- =============================================================================
-- Phone-based password reset tokens
-- Mirrors pending_invites' token pattern (docs/auth_spec.md §1): possession of
-- a hashed, single-use, short-lived token is the authorization, delivered via
-- the existing mNotify SMS provider rather than Supabase's native phone-OTP
-- (which would require configuring a second SMS provider in the dashboard).
-- =============================================================================

CREATE TABLE password_reset_tokens (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID        NOT NULL,
  token_hash   TEXT        NOT NULL UNIQUE,
  expires_at   TIMESTAMPTZ NOT NULL,
  used_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- No policy — requestPhoneReset/confirmPhoneReset are both unauthenticated
-- and always go through the service-role client, which bypasses RLS. No
-- session client ever has a legitimate reason to read this table, so
-- RLS-enabled-with-no-policy (default deny) is correct, unlike
-- pending_invites which admins do browse via a session client.
CREATE INDEX idx_password_reset_tokens_token_hash ON password_reset_tokens(token_hash);
