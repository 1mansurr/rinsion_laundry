-- =============================================================================
-- Laundries: public_slug — the customer-portal entry link
-- Spec reference: docs/customer-portal+rider.md
--
-- No open laundry directory exists (out of scope for this phase). Instead,
-- a laundry shares a link like rinsion.app/portal/o/<public_slug> (signage,
-- socials, etc.). The link only functions if that laundry's
-- settings.allow_customer_submissions is also TRUE — see
-- 20240037000000_customer_accounts_and_logistics.sql's comment on that
-- column. Nullable: a laundry has no slug (and therefore no reachable
-- portal) until one is set.
-- =============================================================================

ALTER TABLE laundries ADD COLUMN public_slug TEXT UNIQUE;
