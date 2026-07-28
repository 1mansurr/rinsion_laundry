-- =============================================================================
-- Customer order submission + pickup request RPCs
-- Spec reference: docs/customer-portal+rider.md
--
-- Deliberate deviation from create_order_tx/record_payment_tx
-- (20240007000000_order_write_transactions.sql), which run SECURITY INVOKER:
-- a customer has no employees row, so get_my_laundry_id() resolves to NULL
-- and the existing tenant_isolation policies would reject a plain insert
-- outright. Both functions here run SECURITY DEFINER and therefore bypass
-- RLS by design — each does its own authorization check as its first
-- statement instead. IS DISTINCT FROM (not !=) is used throughout for that
-- check specifically because it's NULL-safe: with plain !=, an
-- unauthenticated caller (for whom get_my_customer_account_id() is NULL)
-- would make the whole comparison evaluate to NULL rather than TRUE,
-- silently skipping the RAISE EXCEPTION.
-- =============================================================================

-- order_status_history.employee_id has been NOT NULL since the initial
-- schema — every history row was previously staff-attributed. Relaxed here,
-- with a parallel customer_account_id column, so a customer-submitted
-- order's initial 'draft' entry can be recorded (informational only, no XOR
-- constraint the way orders has one — an audit log doesn't need to enforce
-- exclusivity as strictly as the row it's describing).
ALTER TABLE order_status_history ALTER COLUMN employee_id DROP NOT NULL;
ALTER TABLE order_status_history ADD COLUMN customer_account_id UUID REFERENCES customer_accounts(id);

CREATE OR REPLACE FUNCTION create_customer_order_tx(
  p_customer_account_id UUID,
  p_laundry_id          UUID,
  p_order_number        TEXT,
  p_pickup_code         TEXT,
  p_subtotal            DECIMAL(10,2),
  p_tax_amount          DECIMAL(10,2),
  p_total               DECIMAL(10,2),
  p_items               JSONB,
  p_note                TEXT
)
RETURNS TABLE(order_id UUID, order_number TEXT, pickup_code TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id     UUID;
  v_customer_id  UUID;
  v_branch_id    UUID;
  v_allow_submissions BOOLEAN;
  v_location     TEXT;
BEGIN
  IF p_customer_account_id IS NULL OR p_customer_account_id IS DISTINCT FROM get_my_customer_account_id() THEN
    RAISE EXCEPTION 'Not authorized to submit an order for this customer account.';
  END IF;

  SELECT allow_customer_submissions INTO v_allow_submissions
  FROM settings WHERE laundry_id = p_laundry_id;

  IF v_allow_submissions IS NOT TRUE THEN
    RAISE EXCEPTION 'This laundry is not accepting customer order submissions.';
  END IF;

  -- Rinsion is effectively single-branch per laundry today (branch
  -- selection is already removed from the staff UI — see
  -- src/services/branches/getSoleBranchId.ts); resolve it the same way here
  -- rather than trust a client-supplied branch_id.
  SELECT id INTO v_branch_id FROM branches WHERE laundry_id = p_laundry_id ORDER BY created_at ASC LIMIT 1;
  IF v_branch_id IS NULL THEN
    RAISE EXCEPTION 'No branch found for this laundry.';
  END IF;

  -- Find or create the per-laundry customer record linked to this account.
  SELECT id INTO v_customer_id
  FROM customers
  WHERE laundry_id = p_laundry_id
    AND customer_account_id = p_customer_account_id
    AND deleted_at IS NULL
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    INSERT INTO customers (
      laundry_id, customer_code, first_name, last_name, phone, phone_bidx,
      customer_account_id, first_visit_date, last_visit_date
    )
    SELECT
      p_laundry_id,
      'C' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6)),
      COALESCE(ca.first_name, 'Customer'), COALESCE(ca.last_name, ''), ca.phone, ca.phone_bidx,
      ca.id, CURRENT_DATE, CURRENT_DATE
    FROM customer_accounts ca
    WHERE ca.id = p_customer_account_id
    RETURNING id INTO v_customer_id;
  ELSE
    UPDATE customers SET last_visit_date = CURRENT_DATE WHERE id = v_customer_id;
  END IF;

  -- orders.location snapshots the customer's saved default at creation time
  -- (20240036000000_customer_and_order_location.sql) — the customer isn't
  -- asked for it here; it's resolved and can be edited later, at the
  -- "Request Pickup" step (create_pickup_request_tx below), same as the
  -- staff order form's own "editable per order" behavior.
  SELECT location INTO v_location FROM customers WHERE id = v_customer_id;

  INSERT INTO orders (
    order_number, pickup_code, laundry_id, branch_id, customer_id,
    created_by_customer_account_id, status, priority, subtotal, tax_amount, total, location
  ) VALUES (
    p_order_number, p_pickup_code, p_laundry_id, v_branch_id, v_customer_id,
    p_customer_account_id, 'draft', 'normal', p_subtotal, p_tax_amount, p_total, v_location
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
    VALUES (v_order_id, 'customer', p_customer_account_id, trim(p_note));
  END IF;

  INSERT INTO order_status_history (order_id, employee_id, customer_account_id, previous_status, new_status)
  VALUES (v_order_id, NULL, p_customer_account_id, NULL, 'draft');

  INSERT INTO activity_logs (laundry_id, order_id, employee_id, action_type, description)
  VALUES (p_laundry_id, v_order_id, NULL, 'ORDER_SUBMITTED_BY_CUSTOMER', 'Order ' || p_order_number || ' submitted by customer');

  RETURN QUERY SELECT v_order_id, p_order_number, p_pickup_code;
END;
$$;

REVOKE EXECUTE ON FUNCTION create_customer_order_tx FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_customer_order_tx TO authenticated;

-- The pickup address is orders.location, not a field of its own (see
-- pickup_requests' table comment) — customers.location and orders.location
-- "should be the same unless the customer edits it for this order" (product
-- decision, 2026-07-28). p_location is only passed when the customer
-- actually edited it on the Request Pickup screen; p_update_customer_default
-- distinguishes "just for this pickup" (orders.location only) from "my
-- location has changed" (also updates customers.location, so it becomes the
-- default for future orders at this laundry).
CREATE OR REPLACE FUNCTION create_pickup_request_tx(
  p_customer_account_id     UUID,
  p_order_id                UUID,
  p_location                TEXT DEFAULT NULL,
  p_update_customer_default BOOLEAN DEFAULT FALSE,
  p_pickup_notes            TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request_id      UUID;
  v_laundry_id      UUID;
  v_order_status    order_status;
  v_order_customer  UUID;
  v_customer_id     UUID;
  v_final_location  TEXT;
BEGIN
  IF p_customer_account_id IS NULL OR p_customer_account_id IS DISTINCT FROM get_my_customer_account_id() THEN
    RAISE EXCEPTION 'Not authorized to request pickup for this order.';
  END IF;

  SELECT laundry_id, status, created_by_customer_account_id, customer_id, location
  INTO v_laundry_id, v_order_status, v_order_customer, v_customer_id, v_final_location
  FROM orders WHERE id = p_order_id;

  IF v_laundry_id IS NULL THEN
    RAISE EXCEPTION 'Order not found.';
  END IF;

  IF v_order_customer IS DISTINCT FROM p_customer_account_id THEN
    RAISE EXCEPTION 'This order does not belong to this customer account.';
  END IF;

  IF v_order_status != 'draft' THEN
    RAISE EXCEPTION 'A pickup request can only be made for a draft order.';
  END IF;

  IF EXISTS (SELECT 1 FROM pickup_requests WHERE order_id = p_order_id) THEN
    RAISE EXCEPTION 'A pickup request already exists for this order.';
  END IF;

  IF p_location IS NOT NULL THEN
    v_final_location := p_location;
    UPDATE orders SET location = p_location WHERE id = p_order_id;
    IF p_update_customer_default THEN
      UPDATE customers SET location = p_location WHERE id = v_customer_id;
    END IF;
  END IF;

  IF v_final_location IS NULL THEN
    RAISE EXCEPTION 'Enter a pickup address.';
  END IF;

  INSERT INTO pickup_requests (order_id, laundry_id, customer_account_id, pickup_notes)
  VALUES (p_order_id, v_laundry_id, p_customer_account_id, p_pickup_notes)
  RETURNING id INTO v_request_id;

  INSERT INTO activity_logs (laundry_id, order_id, employee_id, action_type, description)
  VALUES (v_laundry_id, p_order_id, NULL, 'PICKUP_REQUESTED', 'Customer requested pickup');

  RETURN v_request_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION create_pickup_request_tx FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_pickup_request_tx TO authenticated;
