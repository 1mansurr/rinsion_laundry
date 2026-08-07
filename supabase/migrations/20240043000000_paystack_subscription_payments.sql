-- =============================================================================
-- Paystack Subscription Payments
-- Automated laundry -> Rinsion subscription payments (M1 of the Paystack
-- Ghana payments plan). Kept as its own table, separate from pending_payments
-- (20240002000000), so the fully-manual claim-and-verify flow
-- (claimPaymentSent.ts / resolvePayment.ts / /internal/manual-payments) stays
-- completely untouched and never surfaces a Paystack-pending row to a human
-- who has nothing to do about it.
--
-- Written by:
--   - initiateSubscriptionPayment.ts (INSERT, service-role admin client) —
--     right after kicking off a Paystack charge/initialize-transaction call.
--   - handlePaystackSubscriptionEvent.ts (UPDATE, service-role admin client,
--     driven by the charge.success webhook) — the only writer that ever
--     transitions `status` away from 'pending'.
-- authenticated/anon never write this table directly — see grants below.
-- =============================================================================

CREATE TABLE subscription_payment_links (
  id                       UUID                       PRIMARY KEY DEFAULT gen_random_uuid(),
  laundry_id               UUID                       NOT NULL REFERENCES laundries(id),
  subscription_id          UUID                       NOT NULL REFERENCES subscriptions(id),
  reference_code           TEXT                       NOT NULL UNIQUE,
  payment_type             subscription_payment_type  NOT NULL,
  target_plan              subscription_plan          NOT NULL,
  amount                   DECIMAL(10,2)              NOT NULL,
  target_cycle_start_date  DATE                       NOT NULL,
  target_cycle_end_date    DATE                       NOT NULL,
  channel                  TEXT                       NOT NULL CHECK (channel IN ('mobile_money', 'card', 'bank_transfer')),
  authorization_url        TEXT,
  display_text             TEXT,
  status                   TEXT                       NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'expired')),
  created_at               TIMESTAMPTZ                NOT NULL DEFAULT NOW(),
  resolved_at              TIMESTAMPTZ
);

CREATE INDEX idx_subscription_payment_links_laundry_id ON subscription_payment_links(laundry_id);
CREATE INDEX idx_subscription_payment_links_pending     ON subscription_payment_links(reference_code) WHERE status = 'pending';

ALTER TABLE subscription_payment_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON subscription_payment_links
  FOR ALL USING (laundry_id = get_my_laundry_id());

-- SELECT stays available to `authenticated` (gated by the tenant_isolation
-- policy above) so the settings page's status-polling endpoint can read a
-- laundry's own rows under a normal session client. Every write goes through
-- the service-role admin client instead — same reasoning as
-- subscription_payments (20240021000000_tighten_table_grants.sql).
REVOKE INSERT, UPDATE, DELETE ON TABLE subscription_payment_links FROM anon, authenticated;
