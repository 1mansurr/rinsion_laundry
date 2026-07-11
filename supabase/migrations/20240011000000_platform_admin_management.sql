-- =============================================================================
-- Platform Admin Management
-- Mirrors get_auth_user_by_phone (20240009000000) for email, so addPlatformAdmin
-- can resolve an existing Rinsion account by either identity.
-- =============================================================================

CREATE OR REPLACE FUNCTION get_auth_user_by_email(p_email TEXT)
RETURNS UUID AS $$
  SELECT id FROM auth.users WHERE email = p_email LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

REVOKE EXECUTE ON FUNCTION get_auth_user_by_email(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_auth_user_by_email(TEXT) TO service_role;
