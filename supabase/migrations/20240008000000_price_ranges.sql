-- Price ranges: item_service_prices.price -> min_price/max_price,
-- services.kg_rate -> min_kg_rate/max_kg_rate, plus a notes field on both.
-- Additive only — old `price`/`kg_rate` columns are left in place here so
-- currently-deployed application code keeps working unmodified. They are
-- dropped in a follow-up migration once the new app code has shipped and
-- been verified stable (expand/contract pattern — this is the first
-- migration in this repo that removes a column live code actively reads).

ALTER TABLE item_service_prices ADD COLUMN min_price DECIMAL(10,2);
ALTER TABLE item_service_prices ADD COLUMN max_price DECIMAL(10,2);
ALTER TABLE item_service_prices ADD COLUMN notes TEXT;

UPDATE item_service_prices SET min_price = price, max_price = price;

ALTER TABLE item_service_prices ALTER COLUMN min_price SET NOT NULL;
ALTER TABLE item_service_prices ALTER COLUMN max_price SET NOT NULL;
ALTER TABLE item_service_prices
  ADD CONSTRAINT item_service_prices_min_nonneg CHECK (min_price >= 0),
  ADD CONSTRAINT item_service_prices_max_gte_min CHECK (max_price >= min_price);

ALTER TABLE services ADD COLUMN min_kg_rate DECIMAL(10,2);
ALTER TABLE services ADD COLUMN max_kg_rate DECIMAL(10,2);
ALTER TABLE services ADD COLUMN notes TEXT;

UPDATE services SET min_kg_rate = kg_rate, max_kg_rate = kg_rate;

-- kg_rate is nullable (unset until an admin configures a per_kg service),
-- so min/max stay nullable too — constraint only fires once both are set.
ALTER TABLE services
  ADD CONSTRAINT services_kg_rate_range_valid CHECK (
    (min_kg_rate IS NULL AND max_kg_rate IS NULL) OR
    (min_kg_rate >= 0 AND max_kg_rate >= min_kg_rate)
  );
