-- =============================================================================
-- Customer & order location
-- customers.location is the customer's default location (e.g. hall/hostel,
-- landmark), editable from the customer edit page. orders.location is a
-- per-order snapshot pre-filled from the customer's location at order
-- creation, editable per order without touching the customer record — a
-- one-off delivery address never overwrites the customer's saved default.
--
-- Both are encrypted at rest the same way as customers.first_name/last_name/
-- phone (see src/lib/crypto/fieldEncryption.ts) — location is PII of the
-- same sensitivity class. Ciphertext is pre-computed by the TS caller, same
-- convention create_order_tx already uses for other encrypted values.
-- =============================================================================

ALTER TABLE customers ADD COLUMN location TEXT;
ALTER TABLE orders ADD COLUMN location TEXT;

-- create_order_tx: add p_location. DROP first — CREATE OR REPLACE with a new
-- parameter would otherwise define a second overload instead of replacing
-- the original, matching the convention set by provision_laundry_tx's own
-- signature changes (20240013000000, 20240019000000).
DROP FUNCTION IF EXISTS create_order_tx(TEXT, TEXT, UUID, UUID, UUID, UUID, order_priority, DATE, NUMERIC, NUMERIC, NUMERIC, JSONB, TEXT);

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
  p_note         TEXT,
  p_location     TEXT DEFAULT NULL
)
RETURNS TABLE(order_id UUID, order_number TEXT, pickup_code TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_order_id UUID;
BEGIN
  INSERT INTO orders (
    order_number, pickup_code, laundry_id, branch_id, customer_id,
    created_by_employee_id, status, priority, pickup_date, subtotal, tax_amount, total, location
  ) VALUES (
    p_order_number, p_pickup_code, p_laundry_id, p_branch_id, p_customer_id,
    p_employee_id, 'received', p_priority, p_pickup_date, p_subtotal, p_tax_amount, p_total, p_location
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

-- anonymize_customer_tx: scrub location alongside the rest of this
-- customer's PII — same signature, body only.
CREATE OR REPLACE FUNCTION anonymize_customer_tx(
  p_customer_id         UUID,
  p_anon_phone_ct       TEXT,
  p_anon_phone_bidx     TEXT,
  p_old_first_name      TEXT,
  p_old_last_name       TEXT,
  p_old_phone_plain     TEXT,
  p_trigger_description TEXT,
  p_erasure_request_id  UUID DEFAULT NULL,
  p_platform_admin_id   UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_laundry_id UUID;
  v_deleted_at TIMESTAMPTZ;
BEGIN
  SELECT laundry_id, deleted_at INTO v_laundry_id, v_deleted_at
  FROM customers WHERE id = p_customer_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'anonymize_customer_tx: customer % not found', p_customer_id;
  END IF;
  IF v_deleted_at IS NULL THEN
    RAISE EXCEPTION 'anonymize_customer_tx: customer % must be soft-deleted before anonymization', p_customer_id;
  END IF;

  UPDATE customers
  SET first_name = 'Deleted',
      last_name  = 'Customer',
      phone      = p_anon_phone_ct,
      phone_bidx = p_anon_phone_bidx,
      location   = NULL
  WHERE id = p_customer_id;

  -- sms_messages: exact scope via customer_id, full column overwrite (no
  -- text matching needed — the FK already isolates exactly the right rows,
  -- and this never touches the current billing cycle's quota accounting
  -- since it's a column UPDATE, not a row DELETE).
  UPDATE sms_messages
  SET phone = '[redacted]',
      message = '[redacted — customer erased]'
  WHERE customer_id = p_customer_id;

  -- orders.location: per-order snapshot of the customer's location, not
  -- free text — a direct column overwrite, no text-matching scrub needed.
  UPDATE orders
  SET location = NULL
  WHERE customer_id = p_customer_id;

  -- order_notes: best-effort scrub, scoped to this customer's own orders
  -- (docs/deletion_retention_plan.md §3 — deliberately not automated for
  -- employees, whose name could appear on any order, not just their own).
  IF length(trim(coalesce(p_old_first_name, ''))) > 0 AND length(trim(coalesce(p_old_last_name, ''))) > 0 THEN
    UPDATE order_notes
    SET note = replace(note, p_old_first_name || ' ' || p_old_last_name, '[redacted]')
    WHERE order_id IN (SELECT id FROM orders WHERE customer_id = p_customer_id);
  END IF;

  IF length(trim(coalesce(p_old_phone_plain, ''))) > 0 THEN
    UPDATE order_notes
    SET note = replace(note, p_old_phone_plain, '[redacted]')
    WHERE order_id IN (SELECT id FROM orders WHERE customer_id = p_customer_id);
  END IF;

  -- No activity_logs scrub for customers: confirmed in the retention plan
  -- that no customer PII ever reaches activity_logs.description anywhere in
  -- this codebase (order-related descriptions only ever contain
  -- order_number/pickup_code/amounts, never a customer name or phone).

  INSERT INTO activity_logs (laundry_id, platform_admin_id, action_type, description)
  VALUES (
    v_laundry_id,
    p_platform_admin_id,
    'CUSTOMER_ANONYMIZED',
    'Customer permanently anonymized (' || p_trigger_description ||
      CASE WHEN p_erasure_request_id IS NOT NULL THEN ', request ' || p_erasure_request_id ELSE '' END || ')'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION anonymize_customer_tx(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION anonymize_customer_tx(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, UUID) TO service_role;
