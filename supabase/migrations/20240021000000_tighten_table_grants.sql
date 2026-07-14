-- Tighten default Supabase project-creation grants on public schema tables.
--
-- Audit finding: every public table currently grants anon and authenticated
-- the full arwdDxtm set (SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/
-- TRIGGER/MAINTAIN) — Supabase's unrevoked default. RLS policies (all
-- "tenant_isolation", FOR ALL, USING only, no WITH CHECK) restrict which
-- ROWS a role can touch, but never restricted DELETE as a privilege, and
-- were never paired with a REVOKE narrowing the underlying grant. Verified
-- live against the project (pg_class.relacl via aclexplode) on 2026-07-13.
--
-- App-code audit of every .delete()/.update() call site (grep across all of
-- src/, both src/services and src/app) found exactly one legitimate
-- hard-delete under the authenticated (session-client) role:
--   src/services/orders/setOrderItemPieces.ts:52-56 — delete-then-reinsert
--   of order_item_pieces rows when an admin edits a per-kg order line's
--   contents breakdown.
-- The only other .delete() call in the app (removePlatformAdmin.ts:13) runs
-- under the service-role admin client, which is unaffected by any REVOKE on
-- anon/authenticated below.
--
-- Also verified: no code path ever UPDATEs `payments` or `subscription_payments`
-- (grep across src/ for `.from('payments')`/`.from('subscription_payments')`
-- found only .select()/.insert()). subscription_payments is additionally only
-- ever INSERTed via the service-role admin client (recordUpgradePayment.ts,
-- recordCycleRenewalPayment.ts) — the authenticated role only ever SELECTs it
-- (getSubscriptionPageData.ts). No purge/anonymize RPCs exist yet anywhere in
-- this codebase as of this migration; when added, they should run as
-- SECURITY DEFINER under service_role (matching the existing admin-client
-- pattern), not rely on these authenticated/anon grants.
--
-- anon sanity: grep across signup, login, and join-laundry flows confirms
-- the anon role is never used for direct public-schema table access anywhere
-- in the app — every server action requires an authenticated Supabase Auth
-- session before touching the database (src/middleware.ts), and the one
-- unauthenticated-reachable page (/i/[token], invite redemption) performs no
-- direct table access of its own; even the join-by-code laundry lookup
-- (joinLaundry.ts:28-30) runs server-side via the admin client, not the
-- browser's anon key. anon therefore has no legitimate need for any
-- SELECT/INSERT/UPDATE/DELETE on any tenant table.

-- 1. Revoke DELETE from anon and authenticated on every table except
--    order_item_pieces (the one verified legitimate hard-delete path).
REVOKE DELETE ON TABLE
  activity_logs, branches, customers, employees, item_service_prices,
  item_types, join_requests, laundries, order_items, order_notes,
  order_refunds, order_status_history, orders, payments, pending_invites,
  pending_payments, platform_admins, services, settings, sms_messages,
  subscription_payments, subscriptions
FROM anon, authenticated;

-- 2. Immutable-ledger tables: no code path ever UPDATEs either table via any
--    role, and authenticated never INSERTs subscription_payments (only
--    service_role does). Narrow both accordingly.
REVOKE UPDATE ON TABLE payments FROM anon, authenticated;
REVOKE INSERT, UPDATE ON TABLE subscription_payments FROM anon, authenticated;

-- 3. anon has no verified legitimate use of any tenant table (see note
--    above) — revoke every remaining write privilege. SELECT is left as-is
--    here since RLS already resolves to no visible rows for anon in every
--    "tenant_isolation" policy (they key off get_my_laundry_id(), which
--    requires auth.uid()); revoking SELECT too is a reasonable follow-up but
--    is deliberately left out of this migration for the team to decide
--    explicitly, since it's a larger behavior change than the DELETE/UPDATE
--    narrowing above and wasn't part of the literal ask.
REVOKE INSERT, UPDATE ON TABLE
  activity_logs, branches, customers, employees, item_service_prices,
  item_types, join_requests, laundries, order_item_pieces, order_items,
  order_notes, order_refunds, order_status_history, orders, payments,
  pending_invites, pending_payments, platform_admins, services, settings,
  sms_messages, subscription_payments, subscriptions
FROM anon;
-- order_item_pieces DELETE for anon already covered by the REVOKE in step 1
-- (anon was never in the "needed" set for that table either).
