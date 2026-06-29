-- =============================================================================
-- Pending Payments
-- Laundry-submitted MoMo payment claims awaiting Rinsion verification.
-- Created by claimPaymentSent() when the admin clicks "I have sent payment".
-- Resolved by the Rinsion internal admin in Phase 11 via createAdminClient().
-- =============================================================================

CREATE TABLE pending_payments (
  id                      UUID                       PRIMARY KEY DEFAULT gen_random_uuid(),
  laundry_id              UUID                       NOT NULL REFERENCES laundries(id),
  subscription_id         UUID                       NOT NULL REFERENCES subscriptions(id),
  reference_code          TEXT                       NOT NULL UNIQUE,
  claimed_amount          DECIMAL(10,2)              NOT NULL,
  target_plan             subscription_plan          NOT NULL,
  payment_type            subscription_payment_type  NOT NULL,
  target_cycle_start_date DATE                       NOT NULL,
  target_cycle_end_date   DATE                       NOT NULL,
  claimed_at              TIMESTAMPTZ                NOT NULL DEFAULT NOW(),
  resolved_at             TIMESTAMPTZ,
  resolved_by_email       TEXT,
  resolution              TEXT CHECK (resolution IN ('paid', 'rejected'))
);

ALTER TABLE pending_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON pending_payments
  FOR ALL USING (laundry_id = get_my_laundry_id());

CREATE INDEX idx_pending_payments_laundry_id ON pending_payments(laundry_id);
CREATE INDEX idx_pending_payments_unresolved  ON pending_payments(claimed_at) WHERE resolved_at IS NULL;
