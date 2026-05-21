-- =============================================================================
-- File:         20260506000016_candle_bath_body_seed.sql
-- Description:  Seeds vertical_inputs for the Candle / Bath & Body vertical.
--               Similar economics to Handmade but with three distinct sales
--               channels (own site, Etsy, wholesale to retailers).
-- =============================================================================

BEGIN;

DO $$
DECLARE
    v_vertical_id uuid;
BEGIN
    SELECT id INTO v_vertical_id
    FROM verticals
    WHERE slug = 'candle-bath-body'
    LIMIT 1;

    IF v_vertical_id IS NULL THEN
        RAISE EXCEPTION 'Vertical candle-bath-body not found.';
    END IF;

    INSERT INTO vertical_inputs (
        id, vertical_id, input_key, display_label, unit_label,
        min_value, max_value, default_value, step_size,
        formula_key, is_live_data, sort_order
    ) VALUES

    -- ── VOLUME + PRICING ─────────────────────────────────────────────────────
    (gen_random_uuid(), v_vertical_id, 'units_produced_per_month',
        'Units Produced per Month', 'units',
        10, 5000, 120, 5, 'units_produced_per_month', false, 10),

    (gen_random_uuid(), v_vertical_id, 'price_per_unit',
        'Retail Price per Unit', 'USD',
        4, 200, 22, 0.50, 'price_per_unit', false, 20),

    -- ── CHANNEL MIX ──────────────────────────────────────────────────────────
    (gen_random_uuid(), v_vertical_id, 'channel_mix_direct_pct',
        'Own Site / Markets Share', '%',
        0, 100, 40, 5, 'channel_mix_direct_pct', false, 30),

    (gen_random_uuid(), v_vertical_id, 'channel_mix_etsy_pct',
        'Etsy Share', '%',
        0, 100, 30, 5, 'channel_mix_etsy_pct', false, 40),

    (gen_random_uuid(), v_vertical_id, 'channel_mix_wholesale_pct',
        'Wholesale Share', '%',
        0, 100, 30, 5, 'channel_mix_wholesale_pct', false, 50),

    (gen_random_uuid(), v_vertical_id, 'wholesale_discount_pct',
        'Wholesale Discount vs Retail', '%',
        20, 70, 50, 1, 'wholesale_discount_pct', false, 60),

    -- ── UNIT COSTS ───────────────────────────────────────────────────────────
    (gen_random_uuid(), v_vertical_id, 'material_cost_per_unit',
        'Material Cost per Unit', 'USD',
        0.50, 50, 4.50, 0.10, 'material_cost_per_unit', true, 70),

    (gen_random_uuid(), v_vertical_id, 'packaging_cost_per_unit',
        'Packaging Cost per Unit', 'USD',
        0.10, 20, 1.20, 0.05, 'packaging_cost_per_unit', true, 80),

    (gen_random_uuid(), v_vertical_id, 'labor_minutes_per_unit',
        'Labor Minutes per Unit', 'mins',
        1, 240, 25, 1, 'labor_minutes_per_unit', false, 90),

    (gen_random_uuid(), v_vertical_id, 'maker_hourly_rate',
        'Maker Hourly Rate', 'USD/hr',
        0, 100, 18, 1, 'maker_hourly_rate', false, 100),

    -- ── SHIPPING + FEES ──────────────────────────────────────────────────────
    (gen_random_uuid(), v_vertical_id, 'avg_shipping_cost_per_direct_order',
        'Shipping Cost per Direct Order', 'USD',
        0, 30, 6, 0.25, 'avg_shipping_cost_per_direct_order', true, 110),

    (gen_random_uuid(), v_vertical_id, 'avg_order_size',
        'Average Order Size (units)', 'units',
        1, 20, 2, 0.5, 'avg_order_size', false, 120),

    (gen_random_uuid(), v_vertical_id, 'etsy_fee_pct',
        'Etsy Combined Fees', '%',
        5, 25, 13, 0.5, 'etsy_fee_pct', false, 130),

    -- ── OVERHEAD ─────────────────────────────────────────────────────────────
    (gen_random_uuid(), v_vertical_id, 'studio_rent_per_month',
        'Studio / Storage per Month', 'USD',
        0, 5000, 600, 25, 'studio_rent_per_month', false, 140),

    (gen_random_uuid(), v_vertical_id, 'supplies_overhead_per_month',
        'Supplies + Overhead per Month', 'USD',
        0, 2000, 200, 10, 'supplies_overhead_per_month', false, 150),

    (gen_random_uuid(), v_vertical_id, 'marketing_per_month',
        'Marketing per Month', 'USD',
        0, 5000, 200, 25, 'marketing_per_month', false, 160)

    ON CONFLICT (vertical_id, input_key) DO NOTHING;

    RAISE NOTICE 'vertical_inputs seeded for candle-bath-body (vertical_id=%)', v_vertical_id;
END $$;

COMMIT;
