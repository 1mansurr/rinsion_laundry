-- =============================================================================
-- Phone password reset: switch from a link-in-SMS token to a 6-digit code
-- entered directly in the app (see docs/auth_spec.md §1 update).
--
-- token_hash keeps its name/shape (sha256 hex of the secret, single-use,
-- short-lived) — only the secret's format changes, from a 22-char base64url
-- token to a 6-digit numeric code. attempts tracks failed code checks so a
-- code can be locked out well before its 1-hour expiry (6-digit space is
-- brute-forceable without a low attempt cap).
-- =============================================================================

ALTER TABLE password_reset_tokens ADD COLUMN attempts INT NOT NULL DEFAULT 0;
