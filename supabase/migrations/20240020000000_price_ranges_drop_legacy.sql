-- =============================================================================
-- Price ranges — drop legacy columns (contract step of 20240008000000)
-- item_service_prices.price and services.kg_rate were superseded by
-- min_price/max_price and min_kg_rate/max_kg_rate. Confirmed via repo-wide
-- grep that no application code, RPC function, or view reads either legacy
-- column anymore — every call site already moved to the min_/max_ columns.
-- Safe to drop.
-- =============================================================================

ALTER TABLE item_service_prices DROP COLUMN price;
ALTER TABLE services DROP COLUMN kg_rate;
