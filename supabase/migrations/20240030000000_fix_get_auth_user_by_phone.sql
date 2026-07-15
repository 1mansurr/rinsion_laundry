-- =============================================================================
-- Fix get_auth_user_by_phone: strip leading '+' before matching
--
-- toAuthPhone() (src/utils/toAuthPhone.ts) produces E.164 with a leading '+'
-- (e.g. "+233509307696") because that's what Supabase's own auth calls
-- (signUp/signIn/createUser) require as input. But Supabase stores and
-- returns auth.users.phone WITHOUT the '+' (confirmed via listUsers()).
--
-- get_auth_user_by_phone did a bare `phone = p_phone` equality check, so it
-- never matched anything — every caller (phoneReset.ts, createInvite.ts,
-- addPlatformAdmin.ts) always got NULL back, regardless of whether the phone
-- actually had an account. For phoneReset.ts specifically this meant the
-- request-reset flow silently no-opped (enumeration-protection success
-- response, no token row, no SMS) for every single request.
-- =============================================================================

CREATE OR REPLACE FUNCTION get_auth_user_by_phone(p_phone TEXT)
RETURNS UUID AS $$
  SELECT id FROM auth.users WHERE phone = regexp_replace(p_phone, '^\+', '') LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;
