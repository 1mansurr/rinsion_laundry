-- The onboarding page's "already set up" gate checked item_types count, but
-- both laundry-creation paths insert default item types immediately —
-- meaning a brand new admin would always be bounced straight to /dashboard
-- before ever seeing the wizard. An explicit flag, set when the wizard's
-- last step is submitted, replaces that heuristic.
ALTER TABLE settings ADD COLUMN onboarding_completed_at TIMESTAMPTZ;

-- Existing laundries already went through setup (or were provisioned before
-- onboarding existed) — backfill so they aren't sent through the wizard again.
UPDATE settings SET onboarding_completed_at = NOW() WHERE onboarding_completed_at IS NULL;
