-- =============================================================================
-- File:         20260515000022_house_flipping_seed.sql
-- Description:  New vertical: House Flipping (fix-and-flip real estate).
--               Different economics from every other vertical — project-
--               based instead of recurring revenue, financed acquisition,
--               heavy holding-cost sensitivity to time-on-market.
-- =============================================================================

BEGIN;

INSERT INTO verticals (id, slug, display_name, description, icon_key, is_active, sort_order)
VALUES (
    gen_random_uuid(),
    'house-flipping',
    'House Flipping',
    'Fix-and-flip real estate. Acquisition, rehab, holding costs, and resale economics.',
    'icon-house',
    true,
    90
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vertical_access_limits (tier_id, vertical_id, is_accessible)
SELECT t.id, v.id, true
FROM subscription_tiers t, verticals v
WHERE v.slug = 'house-flipping'
  AND t.slug IN ('free', 'pro', 'team')
ON CONFLICT (tier_id, vertical_id) DO NOTHING;

DO $$
DECLARE
    v_id uuid;
BEGIN
    SELECT id INTO v_id FROM verticals WHERE slug = 'house-flipping';
    IF v_id IS NULL THEN RAISE EXCEPTION 'Vertical house-flipping not found.'; END IF;

    INSERT INTO vertical_inputs (
        id, vertical_id, input_key, display_label, unit_label,
        min_value, max_value, default_value, step_size,
        formula_key, is_live_data, sort_order
    ) VALUES

    -- ── VOLUME ───────────────────────────────────────────────────────────────
    (gen_random_uuid(), v_id, 'flips_per_year',                'Flips per Year',                       'flips',   1, 20,     2,      1,    'flips_per_year',                false, 10),

    -- ── ACQUISITION ──────────────────────────────────────────────────────────
    (gen_random_uuid(), v_id, 'purchase_price',                'Purchase Price',                       'USD',     20000, 1500000, 180000, 5000, 'purchase_price',                false, 20),
    (gen_random_uuid(), v_id, 'acquisition_closing_pct',       'Closing Costs on Purchase',            '%',       0, 6,      2,      0.1,  'acquisition_closing_pct',       false, 30),
    (gen_random_uuid(), v_id, 'inspection_due_diligence',      'Inspection + Due Diligence',           'USD',     0, 5000,   500,    25,   'inspection_due_diligence',      false, 40),

    -- ── FINANCING ────────────────────────────────────────────────────────────
    (gen_random_uuid(), v_id, 'down_payment_pct',              'Down Payment',                         '%',       0, 100,    30,     5,    'down_payment_pct',              false, 50),
    (gen_random_uuid(), v_id, 'loan_interest_rate_pct',        'Loan Interest Rate (annual)',          '%',       0, 25,     12,     0.25, 'loan_interest_rate_pct',        false, 60),
    (gen_random_uuid(), v_id, 'loan_points_pct',               'Loan Points (origination)',            '%',       0, 8,      2,      0.25, 'loan_points_pct',               false, 70),

    -- ── REHAB ─────────────────────────────────────────────────────────────────
    (gen_random_uuid(), v_id, 'rehab_budget',                  'Rehab Budget',                         'USD',     0, 500000, 35000,  1000, 'rehab_budget',                  false, 80),
    (gen_random_uuid(), v_id, 'rehab_contingency_pct',         'Rehab Contingency',                    '%',       0, 50,     15,     1,    'rehab_contingency_pct',         false, 90),

    -- ── HOLDING ──────────────────────────────────────────────────────────────
    (gen_random_uuid(), v_id, 'holding_time_months',           'Holding Time',                         'months',  1, 18,     4,      0.5,  'holding_time_months',           false, 100),
    (gen_random_uuid(), v_id, 'holding_costs_per_month',       'Holding Costs / Month (tax + ins + util)', 'USD', 0, 5000,   400,    25,   'holding_costs_per_month',       false, 110),

    -- ── SALE ─────────────────────────────────────────────────────────────────
    (gen_random_uuid(), v_id, 'after_repair_value',            'ARV (After-Repair Value)',             'USD',     30000, 2000000, 275000, 5000, 'after_repair_value',            false, 120),
    (gen_random_uuid(), v_id, 'realtor_commission_pct',        'Realtor Commission on Sale',           '%',       0, 8,      6,      0.25, 'realtor_commission_pct',        false, 130),
    (gen_random_uuid(), v_id, 'selling_closing_pct',           'Closing Costs on Sale',                '%',       0, 4,      1,      0.1,  'selling_closing_pct',           false, 140),
    (gen_random_uuid(), v_id, 'staging_marketing',             'Staging + Marketing',                  'USD',     0, 20000,  1500,   100,  'staging_marketing',             false, 150)

    ON CONFLICT (vertical_id, input_key) DO NOTHING;

    RAISE NOTICE 'house-flipping vertical + inputs seeded (vertical_id=%)', v_id;
END $$;

COMMIT;
