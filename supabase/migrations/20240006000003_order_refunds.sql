-- =============================================================================
-- Order Refunds
-- Append-only refund ledger, same philosophy as payments — never edit or
-- delete a payment row to represent a refund; log a separate refund instead.
-- =============================================================================

CREATE TABLE order_refunds (
  id                      UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id                UUID           NOT NULL REFERENCES orders(id),
  amount                  DECIMAL(10,2)  NOT NULL CHECK (amount > 0),
  reason                  TEXT,
  refund_method           payment_method NOT NULL,
  recorded_by_employee_id UUID           NOT NULL REFERENCES employees(id),
  created_at              TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

ALTER TABLE order_refunds ENABLE ROW LEVEL SECURITY;

-- Same tenant-isolation-via-parent-order pattern as order_items/payments/order_notes.
CREATE POLICY "tenant_isolation" ON order_refunds
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_refunds.order_id
        AND orders.laundry_id = get_my_laundry_id()
    )
  );

CREATE INDEX idx_order_refunds_order_id ON order_refunds(order_id);
