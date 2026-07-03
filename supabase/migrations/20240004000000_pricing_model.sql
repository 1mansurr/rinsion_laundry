-- =============================================================================
-- Pricing Model Overhaul
-- Moves per-kg pricing from the (item_type, service) combo up to the service
-- itself — a laundry doesn't charge different weight rates per item type,
-- just one rate per weight-priced service (e.g. "Wash Only" @ GHS 15/kg).
-- Also lets each laundry declare its overall pricing model at setup time.
-- =============================================================================

-- Laundry-level choice, made at onboarding and editable later in Settings.
-- 'mixed' means individual services are independently per_item or per_kg;
-- 'per_item' / 'per_kg' lock every service to that one mode.
CREATE TYPE laundry_pricing_model AS ENUM ('per_item', 'per_kg', 'mixed');
ALTER TABLE settings ADD COLUMN pricing_model laundry_pricing_model NOT NULL DEFAULT 'per_item';

-- Reuses the pricing_mode enum added in 20240003000000_pricing_mode.sql.
ALTER TABLE services ADD COLUMN pricing_mode pricing_mode NOT NULL DEFAULT 'per_item';
-- Only meaningful when pricing_mode = 'per_kg'; NULL until the admin sets a rate.
ALTER TABLE services ADD COLUMN kg_rate DECIMAL(10,2);

-- No longer meaningful — pricing mode now lives on the service, not the combo.
ALTER TABLE item_service_prices DROP COLUMN pricing_mode;

-- per_kg order lines have no item type — contents are tracked separately and
-- optionally via order_item_pieces instead.
ALTER TABLE order_items ALTER COLUMN item_type_id DROP NOT NULL;
