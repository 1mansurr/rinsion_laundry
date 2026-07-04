-- =============================================================================
-- Alphanumeric Pickup Codes
-- Switches pickup_code from a 5-digit numeric string to a 6-char alphanumeric
-- code (same unambiguous charset as order_number) and enforces per-laundry
-- uniqueness among non-deleted orders.
-- =============================================================================

ALTER TABLE orders ALTER COLUMN pickup_code TYPE TEXT;

-- Replaces the old non-unique idx_orders_pickup_code with an equivalent unique
-- index — same columns and predicate, so lookups stay fast and a soft-deleted
-- order's code can be reused.
DROP INDEX IF EXISTS idx_orders_pickup_code;
CREATE UNIQUE INDEX orders_laundry_pickup_code_key ON orders(laundry_id, pickup_code) WHERE deleted_at IS NULL;
