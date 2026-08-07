-- =============================================================================
-- Order Payment Links
-- M3 of the Paystack Ghana payments plan — customer -> laundry order
-- payments, split directly to the laundry's Paystack subaccount (M2) so
-- Rinsion never custodies the money.
-- =============================================================================

-- payments: allow a payment with no recording employee (webhook-driven,
-- no employee session) and track which provider recorded it. Default
-- provider='staff' means record_payment_tx (20240007000000, the existing
-- manual/cash RPC, unrelated to M1's subscription work despite the similar
-- name) needs ZERO changes — its existing insert still satisfies the new
-- check constraint unmodified.
ALTER TABLE payments ALTER COLUMN recorded_by_employee_id DROP NOT NULL;
ALTER TABLE payments ADD COLUMN provider TEXT NOT NULL DEFAULT 'staff' CHECK (provider IN ('staff', 'paystack'));
ALTER TABLE payments ADD COLUMN external_reference TEXT;
ALTER TABLE payments ADD CONSTRAINT payments_provider_employee_check CHECK (
  (provider = 'staff' AND recorded_by_employee_id IS NOT NULL) OR
  (provider <> 'staff' AND recorded_by_employee_id IS NULL)
);

-- ---------------------------------------------------------------------------
-- order_payment_links
-- Written by:
--   - createPaymentLink.ts (INSERT, service-role admin client) — right after
--     kicking off a Paystack charge/initialize-transaction call. Callable by
--     staff (OrderDetail/dashboard) or the customer themselves (portal
--     invoice self-serve) — created_by_employee_id is NULL for the latter.
--   - handlePaystackOrderEvent.ts (UPDATE, service-role admin client, driven
--     by the charge.success webhook) — the only writer that ever transitions
--     `status` away from 'pending'.
-- ---------------------------------------------------------------------------

CREATE TABLE order_payment_links (
  id                      UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id                UUID           NOT NULL REFERENCES orders(id),
  laundry_id              UUID           NOT NULL REFERENCES laundries(id),
  reference_code          TEXT           NOT NULL UNIQUE,
  amount                  DECIMAL(10,2)  NOT NULL,
  channel                 TEXT           NOT NULL CHECK (channel IN ('mobile_money', 'card', 'bank_transfer')),
  authorization_url       TEXT,
  display_text            TEXT,
  status                  TEXT           NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'expired')),
  -- NULL when customer-self-serve (portal invoice "Pay Now").
  created_by_employee_id  UUID           REFERENCES employees(id),
  created_at              TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  paid_at                 TIMESTAMPTZ
);

CREATE INDEX idx_order_payment_links_order_id ON order_payment_links(order_id);
CREATE INDEX idx_order_payment_links_laundry_id ON order_payment_links(laundry_id);

ALTER TABLE order_payment_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON order_payment_links
  FOR ALL USING (laundry_id = get_my_laundry_id());

-- Mirrors the customer_self_read policy on payments (20240037000000) — the
-- portal invoice page's own "Pay Now" status poll needs to read its own
-- order's link.
CREATE POLICY "customer_self_read" ON order_payment_links
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_payment_links.order_id
        AND orders.customer_id IN (SELECT id FROM customers WHERE customer_account_id = get_my_customer_account_id())
    )
  );

-- Every write goes through the service-role admin client — same reasoning
-- as subscription_payment_links (20240043000000).
REVOKE INSERT, UPDATE, DELETE ON TABLE order_payment_links FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- record_online_payment_tx — webhook-driven payments insert, deliberately
-- separate from record_payment_tx (which stays untouched, SECURITY INVOKER,
-- called under a staff session for the manual/cash flow). This one runs
-- SECURITY DEFINER because a webhook delivery has no employee session to
-- check RLS against, and is granted to service_role only.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION record_online_payment_tx(
  p_order_id           UUID,
  p_laundry_id         UUID,
  p_amount             DECIMAL(10,2),
  p_method             payment_method,
  p_provider           TEXT,
  p_external_reference TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment_id UUID;
BEGIN
  INSERT INTO payments (order_id, recorded_by_employee_id, amount, payment_method, provider, external_reference)
  VALUES (p_order_id, NULL, p_amount, p_method, p_provider, p_external_reference)
  RETURNING id INTO v_payment_id;

  INSERT INTO activity_logs (laundry_id, order_id, action_type, description)
  VALUES (
    p_laundry_id, p_order_id, 'PAYMENT_RECORDED',
    'Payment of GHS ' || to_char(p_amount, 'FM999999990.00') || ' recorded via ' || p_method || ' (' || p_provider || ')'
  );

  RETURN v_payment_id;
END;
$$;

REVOKE ALL ON FUNCTION record_online_payment_tx FROM PUBLIC;
GRANT EXECUTE ON FUNCTION record_online_payment_tx TO service_role;
