-- =============================================================================
-- Customers Phone Blind Index (application-level field encryption)
-- customers.phone is being migrated to ciphertext (AES-256-GCM, encrypted in
-- the app layer — see src/lib/crypto/fieldEncryption.ts). Exact-match lookups
-- (createCustomer's dedup check, phone search in getCustomersList/
-- getOrdersList/searchOrders) can no longer use the plaintext column, so
-- phone_bidx = HMAC-SHA256(normalized_phone, BLIND_INDEX_KEY) is added as a
-- deterministic, non-reversible lookup key.
--
-- Nullable, non-unique for now — existing rows have no blind index until
-- scripts/backfillFieldEncryption.ts runs. The NOT NULL + partial unique
-- constraint (replacing customers_laundry_phone_key) land in a later
-- migration, only once every row has been backfilled.
-- =============================================================================

ALTER TABLE customers ADD COLUMN phone_bidx TEXT;

CREATE INDEX IF NOT EXISTS customers_phone_bidx_idx ON customers(phone_bidx);
