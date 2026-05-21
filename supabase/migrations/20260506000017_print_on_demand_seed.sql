-- =============================================================================
-- File:         20260506000017_print_on_demand_seed.sql
-- Description:  New vertical: Print-on-Demand (POD).
--               Adds the verticals row + vertical_access_limits for all tiers
--               + vertical_inputs covering apparel/posters via Printful-style
--               providers.
-- =============================================================================

BEGIN;

-- 1. Verticals row
INSERT INTO verticals (id, slug, display_name, description, icon_key, is_active, sort_order)
VALUES (
    gen_random_uuid(),
    'print-on-demand',
    'Print-on-Demand',
    'Apparel, posters, accessories — POD providers fulfill, you design and market.',
    'icon-shirt',
    true,
    50
)
ON CONFLICT (slug) DO NOTHING;

-- 2. Tier access: Free + Pro + Team can all view (matches existing patterns)
INSERT INTO vertical_access_limits (tier_id, vertical_id, is_accessible)
SELECT t.id, v.id, true
FROM subscription_tiers t, verticals v
WHERE v.slug = 'print-on-demand'
  AND t.slug IN ('free', 'pro', 'team')
ON CONFLICT (tier_id, vertical_id) DO NOTHING;

-- 3. Vertical inputs
DO $$
DECLARE
    v_id uuid;
BEGIN
    SELECT id INTO v_id FROM verticals WHERE slug = 'print-on-demand';
    IF v_id IS NULL THEN RAISE EXCEPTION 'Vertical print-on-demand not found.'; END IF;

    INSERT INTO vertical_inputs (
        id, vertical_id, input_key, display_label, unit_label,
        min_value, max_value, default_value, step_size,
        formula_key, is_live_data, sort_order
    ) VALUES
    (gen_random_uuid(), v_id, 'orders_per_month',          'Orders per Month',                'orders',   0, 5000, 60,    5,    'orders_per_month',          false, 10),
    (gen_random_uuid(), v_id, 'avg_units_per_order',       'Average Units per Order',         'units',    1, 10,   1.4,  0.1,  'avg_units_per_order',       false, 20),
    (gen_random_uuid(), v_id, 'avg_retail_price_per_unit', 'Avg Retail Price per Unit',       'USD',      5, 200,  28,   1,    'avg_retail_price_per_unit', false, 30),
    (gen_random_uuid(), v_id, 'pod_base_cost_per_unit',    'POD Provider Cost per Unit',      'USD',      3, 80,   12,   0.25, 'pod_base_cost_per_unit',    true,  40),
    (gen_random_uuid(), v_id, 'pod_shipping_per_order',    'POD Shipping per Order',          'USD',      0, 25,   5.5,  0.25, 'pod_shipping_per_order',    true,  50),
    (gen_random_uuid(), v_id, 'customer_shipping_paid',    'Shipping Charged to Customer',    'USD',      0, 25,   5,    0.25, 'customer_shipping_paid',    false, 60),
    (gen_random_uuid(), v_id, 'return_rate_pct',           'Return / Reprint Rate',           '%',        0, 20,   2.5,  0.5,  'return_rate_pct',           false, 70),
    (gen_random_uuid(), v_id, 'storefront_platform_fee_pct','Storefront Fee (Shopify, Etsy, etc.)','%',  0, 20,   2.9,  0.1,  'storefront_platform_fee_pct',false,80),
    (gen_random_uuid(), v_id, 'storefront_monthly_fee',    'Storefront Monthly Fee',          'USD',      0, 500,  39,   1,    'storefront_monthly_fee',    false, 90),
    (gen_random_uuid(), v_id, 'design_cost_per_month',     'Design Cost per Month',           'USD',      0, 2000, 100,  10,   'design_cost_per_month',     false, 100),
    (gen_random_uuid(), v_id, 'ad_spend_per_month',        'Ad Spend per Month',              'USD',      0, 10000,400,  25,   'ad_spend_per_month',        false, 110),
    (gen_random_uuid(), v_id, 'ad_attributed_revenue_pct', 'Revenue from Paid Ads',           '%',        0, 100,  35,   5,    'ad_attributed_revenue_pct', false, 120),
    (gen_random_uuid(), v_id, 'tools_software_per_month',  'Tools + Software per Month',      'USD',      0, 500,  30,   5,    'tools_software_per_month',  false, 130),
    (gen_random_uuid(), v_id, 'founder_draw_per_month',    'Founder Salary / Draw per Month', 'USD',      0, 20000,0,    100,  'founder_draw_per_month',    false, 140)

    ON CONFLICT (vertical_id, input_key) DO NOTHING;

    RAISE NOTICE 'print-on-demand vertical + inputs seeded (vertical_id=%)', v_id;
END $$;

COMMIT;
