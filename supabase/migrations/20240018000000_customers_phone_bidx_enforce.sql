-- =============================================================================
-- Customers Phone Blind Index — enforce uniqueness (Stage 2)
-- Run only after scripts/backfillFieldEncryption.ts has populated phone_bidx
-- for every existing customers row (confirmed manually before this migration
-- shipped). Mirrors 20240014000000_customers_phone_partial_unique.sql
-- exactly, just keyed on phone_bidx (the HMAC blind index) instead of the
-- now-ciphertext phone column.
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS customers_laundry_phone_bidx_key
  ON customers(laundry_id, phone_bidx) WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS customers_laundry_phone_key;

ALTER TABLE customers ALTER COLUMN phone_bidx SET NOT NULL;
