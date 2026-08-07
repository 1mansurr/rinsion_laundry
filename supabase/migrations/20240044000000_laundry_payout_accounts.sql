-- =============================================================================
-- Laundry Payout Accounts
-- M2 of the Paystack Ghana payments plan — prerequisite for M3 (order
-- payments). A laundry needs a Paystack subaccount (percentage_charge: 0, so
-- customer->laundry money settles directly, Rinsion never custodies it)
-- before any order payment can be split to them.
--
-- Written by createPayoutAccount.ts ('use server', admin-only via
-- requireRole(ROLES.ADMIN) at the app layer — no RLS-layer role check exists
-- anywhere else in this codebase either, e.g. updateSettings.ts, so this
-- doesn't introduce a new pattern).
-- =============================================================================

CREATE TABLE laundry_payout_accounts (
  id                        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  laundry_id                UUID          NOT NULL UNIQUE REFERENCES laundries(id),
  business_name             TEXT          NOT NULL,
  settlement_bank_code      TEXT          NOT NULL,
  settlement_bank_name      TEXT          NOT NULL,
  account_number            TEXT          NOT NULL,
  -- Paystack-resolved account holder name (GET /bank/resolve), nullable —
  -- see the plan's pre-launch verification checklist on whether that
  -- endpoint actually resolves Ghanaian MoMo wallet names.
  account_name              TEXT,
  paystack_subaccount_code  TEXT          NOT NULL UNIQUE,
  is_verified                BOOLEAN      NOT NULL DEFAULT FALSE,
  status                    TEXT          NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'disabled')),
  created_by_employee_id    UUID          REFERENCES employees(id),
  created_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_laundry_payout_accounts_laundry_id ON laundry_payout_accounts(laundry_id);

ALTER TABLE laundry_payout_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON laundry_payout_accounts
  FOR ALL USING (laundry_id = get_my_laundry_id());
