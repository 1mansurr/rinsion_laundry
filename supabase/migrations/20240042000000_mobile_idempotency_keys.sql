-- Mobile offline-queue idempotency
-- The mobile app's offline queue (M5) retries create-order and
-- record-payment actions on reconnect. A retry after a request that actually
-- succeeded server-side but whose response never made it back to the phone
-- (e.g. connection dropped mid-response) would otherwise create a duplicate
-- order or double-count a payment. Each such mobile action carries a
-- client-generated UUID; the API route checks this table first and, on a
-- repeat, replays the stored response instead of redoing the write.
--
-- Deliberately generic (one table, not one column per table) — reusable for
-- any future offline-capable action, not just these two. No RLS policies:
-- only ever touched via the admin client from src/app/api/mobile/*, same
-- convention as rider_invites.

CREATE TABLE mobile_idempotency_keys (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laundry_id        UUID NOT NULL REFERENCES laundries(id),
  client_request_id UUID NOT NULL,
  response_json     JSONB NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (laundry_id, client_request_id)
);

ALTER TABLE mobile_idempotency_keys ENABLE ROW LEVEL SECURITY;
