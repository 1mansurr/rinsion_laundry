-- =============================================================================
-- provision_laundry_tx: infer pricing_model from seeded services
-- Previously the settings row provisioning inserted never set pricing_model,
-- silently leaving it at the column default ('per_item') even when the
-- template/uploaded price list seeded per_kg (or mixed) services — the new
-- laundry's Items & Services page and order form would then disagree with
-- what was actually priced. The caller now computes the right value (uniform
-- per_item/per_kg, or 'mixed' when services vary) and passes it through.
-- Signature changed (new trailing param), so the old overload is dropped
-- first rather than left registered alongside a CREATE OR REPLACE.
-- =============================================================================

DROP FUNCTION IF EXISTS provision_laundry_tx(TEXT, TEXT, TEXT, TEXT, TEXT, INT, INT, TEXT[], JSONB, JSONB, UUID);

CREATE FUNCTION provision_laundry_tx(
  p_laundry_code      TEXT,
  p_laundry_name      TEXT,
  p_branch_code       TEXT,
  p_branch_name       TEXT,
  p_join_pin          TEXT,
  p_trial_days        INT,
  p_sms_quota         INT,
  p_item_types        TEXT[],
  p_services          JSONB,   -- [{name, pricing_mode, min_kg_rate, max_kg_rate, notes}]
  p_prices            JSONB,   -- [{item_type_name, service_name, min_price, max_price, notes}]
  p_platform_admin_id UUID,
  p_pricing_model     laundry_pricing_model DEFAULT 'per_item'
)
RETURNS TABLE(laundry_id UUID, branch_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_laundry_id UUID;
  v_branch_id UUID;
  v_trial_end DATE := CURRENT_DATE + (p_trial_days || ' days')::INTERVAL;
BEGIN
  INSERT INTO laundries (name, laundry_code, join_pin)
  VALUES (p_laundry_name, p_laundry_code, p_join_pin)
  RETURNING id INTO v_laundry_id;

  INSERT INTO branches (laundry_id, branch_code, name)
  VALUES (v_laundry_id, p_branch_code, p_branch_name)
  RETURNING id INTO v_branch_id;

  -- onboarding_completed_at is set immediately: the template/upload already
  -- seeded item types, services, and pricing, so the owner must never be
  -- routed through the from-scratch onboarding wizard (dashboard/page.tsx
  -- redirects there when unset) — that wizard would create a second,
  -- duplicate set of default items/services on top of what's seeded here.
  INSERT INTO settings (laundry_id, onboarding_completed_at, pricing_model)
  VALUES (v_laundry_id, NOW(), p_pricing_model);

  INSERT INTO subscriptions (laundry_id, plan, status, cycle_start_date, cycle_end_date, sms_quota)
  VALUES (v_laundry_id, 'trial', 'trialing', CURRENT_DATE, v_trial_end, p_sms_quota);

  INSERT INTO item_types (laundry_id, name, is_active)
  SELECT v_laundry_id, name, TRUE FROM unnest(p_item_types) AS name;

  INSERT INTO services (laundry_id, name, is_active, pricing_mode, min_kg_rate, max_kg_rate, notes)
  SELECT
    v_laundry_id,
    svc->>'name',
    TRUE,
    (svc->>'pricing_mode')::pricing_mode,
    (svc->>'min_kg_rate')::DECIMAL,
    (svc->>'max_kg_rate')::DECIMAL,
    svc->>'notes'
  FROM jsonb_array_elements(p_services) AS svc;

  INSERT INTO item_service_prices (laundry_id, item_type_id, service_id, min_price, max_price, notes)
  SELECT
    v_laundry_id,
    it.id,
    sv.id,
    (price->>'min_price')::DECIMAL,
    (price->>'max_price')::DECIMAL,
    price->>'notes'
  FROM jsonb_array_elements(p_prices) AS price
  JOIN item_types it ON it.laundry_id = v_laundry_id AND it.name = price->>'item_type_name'
  JOIN services sv ON sv.laundry_id = v_laundry_id AND sv.name = price->>'service_name';

  INSERT INTO activity_logs (laundry_id, platform_admin_id, action_type, description)
  VALUES (v_laundry_id, p_platform_admin_id, 'LAUNDRY_PROVISIONED', 'Laundry "' || p_laundry_name || '" provisioned');

  RETURN QUERY SELECT v_laundry_id, v_branch_id;
END;
$$;

GRANT EXECUTE ON FUNCTION provision_laundry_tx TO service_role;
