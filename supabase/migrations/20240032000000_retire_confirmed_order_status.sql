-- Retire the 'confirmed' order status.
--
-- Product decision: 'confirmed' never corresponded to a distinct real-world
-- event — createOrder.ts already locks items/pricing before the order row
-- exists, so "items and pricing verified" (the status's own definition in
-- Rinsion_Business_Overview.md) has always already happened by the time an
-- order can be created. No code path gated on 'confirmed' specifically
-- (no SMS trigger, no payment check, nothing) — it was a pure label step
-- between 'received' and 'processing'. New lifecycle: received -> processing
-- -> ready -> collected, with cancelled available from any non-terminal
-- state. See docs/Legal_and_Product_Consistency_Report.md's chat context
-- for the full rationale.
--
-- 'confirmed' is NOT removed from the order_status enum itself — Postgres
-- enum value removal requires recreating the type, which is riskier than
-- leaving an unused value in place (same precedent as 'draft', already
-- unused by the app on purpose). order_status_history rows that already
-- recorded a transition through 'confirmed' are left untouched: they are an
-- immutable audit log of what actually happened and must not be rewritten.
--
-- This only touches *current* order state, and only if any exists.
UPDATE orders
SET status = 'processing'
WHERE status = 'confirmed';
