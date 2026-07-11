-- =============================================================================
-- Order Write Transactions
-- createOrder and recordPayment each touch multiple tables (orders+order_items+
-- order_notes+order_status_history+activity_logs+customers for createOrder;
-- payments+activity_logs for recordPayment). Previously these were sequential
-- inserts from the service layer with no rollback on partial failure. Wrapping
-- each in a single plpgsql function makes the whole write atomic.
--
-- Both run SECURITY INVOKER (the default) — they execute with the calling
-- employee's own role, so the existing tenant_isolation RLS policies on every
-- table touched still apply exactly as they did for the individual inserts.
-- =============================================================================

CREATE OR REPLACE FUNCTION create_order_tx(
  p_order_number TEXT,
  p_pickup_code  TEXT,
  p_laundry_id   UUID,
  p_branch_id    UUID,
  p_customer_id  UUID,
  p_employee_id  UUID,
  p_priority     order_priority,
  p_pickup_date  DATE,
  p_subtotal     DECIMAL(10,2),
  p_tax_amount   DECIMAL(10,2),
  p_total        DECIMAL(10,2),
  p_items        JSONB,
  p_note         TEXT
)
RETURNS TABLE(order_id UUID, order_number TEXT, pickup_code TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_order_id UUID;
BEGIN
  INSERT INTO orders (
    order_number, pickup_code, laundry_id, branch_id, customer_id,
    created_by_employee_id, status, priority, pickup_date, subtotal, tax_amount, total
  ) VALUES (
    p_order_number, p_pickup_code, p_laundry_id, p_branch_id, p_customer_id,
    p_employee_id, 'received', p_priority, p_pickup_date, p_subtotal, p_tax_amount, p_total
  )
  RETURNING id INTO v_order_id;

  INSERT INTO order_items (order_id, item_type_id, service_id, quantity, unit_price, total_price, pricing_mode)
  SELECT
    v_order_id,
    NULLIF(item->>'item_type_id', '')::UUID,
    (item->>'service_id')::UUID,
    (item->>'quantity')::NUMERIC,
    (item->>'unit_price')::DECIMAL,
    (item->>'total_price')::DECIMAL,
    (item->>'pricing_mode')::pricing_mode
  FROM jsonb_array_elements(p_items) AS item;

  IF p_note IS NOT NULL AND length(trim(p_note)) > 0 THEN
    INSERT INTO order_notes (order_id, created_by_type, created_by_id, note)
    VALUES (v_order_id, 'employee', p_employee_id, trim(p_note));
  END IF;

  INSERT INTO order_status_history (order_id, employee_id, previous_status, new_status)
  VALUES (v_order_id, p_employee_id, NULL, 'received');

  INSERT INTO activity_logs (laundry_id, order_id, employee_id, action_type, description)
  VALUES (p_laundry_id, v_order_id, p_employee_id, 'ORDER_CREATED', 'Order ' || p_order_number || ' created');

  UPDATE customers SET last_visit_date = CURRENT_DATE WHERE id = p_customer_id;

  RETURN QUERY SELECT v_order_id, p_order_number, p_pickup_code;
END;
$$;

GRANT EXECUTE ON FUNCTION create_order_tx TO authenticated;

CREATE OR REPLACE FUNCTION record_payment_tx(
  p_order_id    UUID,
  p_laundry_id  UUID,
  p_employee_id UUID,
  p_amount      DECIMAL(10,2),
  p_method      payment_method
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_payment_id UUID;
BEGIN
  INSERT INTO payments (order_id, recorded_by_employee_id, amount, payment_method)
  VALUES (p_order_id, p_employee_id, p_amount, p_method)
  RETURNING id INTO v_payment_id;

  INSERT INTO activity_logs (laundry_id, order_id, employee_id, action_type, description)
  VALUES (
    p_laundry_id, p_order_id, p_employee_id, 'PAYMENT_RECORDED',
    'Payment of GHS ' || to_char(p_amount, 'FM999999990.00') || ' recorded via ' || p_method
  );

  RETURN v_payment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION record_payment_tx TO authenticated;
