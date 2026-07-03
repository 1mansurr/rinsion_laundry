-- =============================================================================
-- Per-Kg Pricing
-- Adds weight-based pricing alongside the existing per-piece pricing, plus an
-- optional pieces breakdown for per_kg order lines (tracking only, never
-- priced — see order_item_pieces below).
-- =============================================================================

CREATE TYPE pricing_mode AS ENUM ('per_item', 'per_kg');

-- Existing rows default to 'per_item' — preserves current pricing behavior.
ALTER TABLE item_service_prices ADD COLUMN pricing_mode pricing_mode NOT NULL DEFAULT 'per_item';

-- Snapshotted at order creation, mirroring unit_price — never joined through
-- item_service_prices at read time, so a later mode change on the price row
-- does not alter historical order lines.
ALTER TABLE order_items ADD COLUMN pricing_mode pricing_mode NOT NULL DEFAULT 'per_item';

-- quantity now holds either a whole piece count or a weight in kg, depending
-- on pricing_mode. The > 0 check carries over unchanged.
ALTER TABLE order_items ALTER COLUMN quantity TYPE NUMERIC(10,3);

-- Optional contents breakdown for a per_kg order_items line (e.g. a 25kg line
-- made up of "3 duvets, 5 pillowcases"). Pure tracking — no price columns,
-- never affects order totals. Added any time from the order detail page;
-- an order is fully valid with zero rows here.
CREATE TABLE order_item_pieces (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID        NOT NULL REFERENCES order_items(id),
  item_type_id  UUID        NOT NULL REFERENCES item_types(id),
  quantity      INT         NOT NULL CHECK (quantity > 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE order_item_pieces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON order_item_pieces
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM order_items
      JOIN orders ON orders.id = order_items.order_id
      WHERE order_items.id = order_item_pieces.order_item_id
        AND orders.laundry_id = get_my_laundry_id()
    )
  );

CREATE INDEX idx_order_item_pieces_order_item_id ON order_item_pieces(order_item_id);
