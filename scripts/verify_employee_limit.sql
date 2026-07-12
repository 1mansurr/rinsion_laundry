-- Verification for: trial plan employee_limit/sms_quota snapshot change
-- Run in the Supabase SQL editor after `supabase db push`.

-- 1. Column exists, NOT NULL, correct type
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'subscriptions' AND column_name = 'employee_limit';

-- 2. Existing rows backfilled correctly (grandfathered — should NOT reflect the new
--    trial=4/300 constant; pre-existing trial/growth rows should still show 9,
--    starter should show 4). Grouped so you can eyeball counts per plan/limit combo.
SELECT plan, employee_limit, sms_quota, count(*) AS row_count
FROM subscriptions
GROUP BY plan, employee_limit, sms_quota
ORDER BY plan, employee_limit;

-- 3. provision_laundry_tx signature now includes p_employee_limit with a DEFAULT 9
--    (so any caller that omits it — e.g. an old cached client — still gets 9, not NULL)
SELECT pg_get_function_arguments(oid) AS args
FROM pg_proc
WHERE proname = 'provision_laundry_tx';

-- 4. Spot-check the most recently created subscription rows (newest first) —
--    after you create a NEW trial via the app, re-run this and confirm the top
--    row shows employee_limit = 4, sms_quota = 300, plan = 'trial'.
SELECT id, laundry_id, plan, status, employee_limit, sms_quota, created_at
FROM subscriptions
ORDER BY created_at DESC
LIMIT 10;

-- 5. Employee count vs. limit for every laundry currently at or over its cap
--    (sanity check that canAddEmployee's counting logic — active employees only —
--    matches what's already in the DB; none of these should be able to add more
--    via invite or join-by-PIN)
SELECT
  s.laundry_id,
  s.plan,
  s.employee_limit,
  count(e.id) FILTER (WHERE e.is_active) AS active_employees
FROM subscriptions s
LEFT JOIN employees e ON e.laundry_id = s.laundry_id
WHERE s.status <> 'cancelled'
GROUP BY s.laundry_id, s.plan, s.employee_limit
HAVING count(e.id) FILTER (WHERE e.is_active) >= s.employee_limit
ORDER BY active_employees DESC;
