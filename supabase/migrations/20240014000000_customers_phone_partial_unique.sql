-- =============================================================================
-- Customers Phone Partial Unique (Stage 1 of soft-delete/Recycle Bin work)
-- Mirrors the exact fix already applied to orders.pickup_code in
-- 20240006000001_pickup_code_alphanumeric.sql: a plain UNIQUE(laundry_id,
-- phone) would otherwise permanently block a phone number from reuse after
-- a soft-delete. The constraint was declared inline in CREATE TABLE
-- customers with no explicit name, so find and drop it by dynamic lookup
-- rather than a guessed name.
-- =============================================================================

DO $$
DECLARE
  v_conname text;
BEGIN
  SELECT conname INTO v_conname
  FROM pg_constraint
  WHERE conrelid = 'customers'::regclass AND contype = 'u';

  IF v_conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE customers DROP CONSTRAINT %I', v_conname);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS customers_laundry_phone_key
  ON customers(laundry_id, phone) WHERE deleted_at IS NULL;
