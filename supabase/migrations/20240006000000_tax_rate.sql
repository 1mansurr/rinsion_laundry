-- =============================================================================
-- Tax Rate
-- Adds a per-laundry tax rate (percentage) and a snapshotted tax_amount on
-- orders, following the same snapshot-at-creation philosophy as order_items.unit_price.
-- =============================================================================

ALTER TABLE settings ADD COLUMN tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0;

-- Snapshotted at order creation from settings.tax_rate — never recomputed later.
ALTER TABLE orders ADD COLUMN tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0;
