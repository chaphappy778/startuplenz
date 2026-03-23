-- ============================================================================
-- Migration: 20260322000011_handmade_vertical_seed.sql
-- Purpose:   Seeds the Handmade / Craft E-commerce vertical with all
--            vertical_inputs rows and data_source_mappings rows.
--
-- Prerequisites:
--   • The `verticals` row for slug='handmade-craft' must already exist OR
--     is inserted here (idempotent via ON CONFLICT).
--   • Migrations 000001–000010 deployed (schema intact).
--
-- This migration is idempotent: re-running it will not duplicate rows.
-- ============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. ENSURE VERTICAL ROW EXISTS
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO verticals (
    id,
    slug,
    display_name,
    description,
    icon_key,
    is_active,
    sort_order
) VALUES (
    gen_random_uuid(),
    'handmade-craft',
    'Handmade / Craft E-commerce',
    'Model unit economics for handmade products sold on Etsy and TikTok Shop, '
    'with live material cost, packaging, and shipping updates.',
    'handmade',
    true,
    1
)
ON CONFLICT (slug) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. VERTICAL INPUTS
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
    v_vertical_id uuid;
BEGIN
    SELECT id INTO v_vertical_id
    FROM verticals
    WHERE slug = 'handmade-craft'
    LIMIT 1;

    IF v_vertical_id IS NULL THEN
        RAISE EXCEPTION 'Vertical handmade-craft not found after insert — check verticals table.';
    END IF;

    -- ── DROP / INVENTORY ─────────────────────────────────────────────────────

    INSERT INTO vertical_inputs (
        id, vertical_id, input_key, display_label, unit_label,
        min_value, max_value, default_value, step_size,
        formula_key,
        is_live_data, sort_order
    ) VALUES
    (
        gen_random_uuid(), v_vertical_id,
        'units_per_drop', 'Units per Drop', 'units',
        1, 500, 24, 1,
        'units_per_drop',
        false, 10
    ),
    (
        gen_random_uuid(), v_vertical_id,
        'drops_per_month', 'Drops per Month', 'drops',
        1, 12, 2, 1,
        'drops_per_month',
        false, 20
    ),
    (
        gen_random_uuid(), v_vertical_id,
        'sell_through_rate', 'Sell-Through Rate', '%',
        10, 100, 75, 5,
        'sell_through_rate',
        false, 30
    ),

    -- ── PRICING ──────────────────────────────────────────────────────────────

    (
        gen_random_uuid(), v_vertical_id,
        'price_per_unit', 'Price per Unit', 'USD',
        1, 500, 14, 0.5,
        'price_per_unit',
        false, 40
    ),
    (
        gen_random_uuid(), v_vertical_id,
        'avg_order_size', 'Average Order Size', 'units',
        1, 10, 2, 0.5,
        'avg_order_size',
        false, 50
    ),

    -- ── MATERIAL & PRODUCTION COSTS ──────────────────────────────────────────

    (
        gen_random_uuid(), v_vertical_id,
        'material_cost_per_unit', 'Material Cost per Unit', 'USD',
        0.10, 200, 2.50, 0.10,
        'material_cost_per_unit',
        true, 60
    ),
    (
        gen_random_uuid(), v_vertical_id,
        'packaging_cost_per_unit', 'Packaging Cost per Unit', 'USD',
        0.05, 20, 0.75, 0.05,
        'packaging_cost_per_unit',
        true, 70
    ),
    (
        gen_random_uuid(), v_vertical_id,
        'labor_minutes_per_unit', 'Labor per Unit', 'mins',
        1, 480, 20, 1,
        'labor_minutes_per_unit',
        false, 80
    ),
    (
        gen_random_uuid(), v_vertical_id,
        'maker_hourly_rate', 'Maker Hourly Rate', 'USD/hr',
        0, 150, 15, 1,
        'maker_hourly_rate',
        false, 90
    ),

    -- ── SHIPPING ─────────────────────────────────────────────────────────────

    (
        gen_random_uuid(), v_vertical_id,
        'avg_shipping_cost_per_order', 'Avg. Shipping Cost per Order', 'USD',
        0, 30, 4.50, 0.25,
        'avg_shipping_cost_per_order',
        true, 100
    ),
    (
        gen_random_uuid(), v_vertical_id,
        'free_shipping_threshold', 'Free Shipping Threshold', 'USD',
        0, 200, 35, 5,
        'free_shipping_threshold',
        false, 110
    ),

    -- ── PLATFORM & ADVERTISING ───────────────────────────────────────────────

    (
        gen_random_uuid(), v_vertical_id,
        'platform_mix_etsy_pct', 'Etsy Channel Mix', '%',
        0, 100, 80, 5,
        'platform_mix_etsy_pct',
        false, 120
    ),
    (
        gen_random_uuid(), v_vertical_id,
        'etsy_offsite_ads_opt_out', 'Etsy Offsite Ads Opted Out', 'bool',
        0, 1, 0, 1,
        'etsy_offsite_ads_opt_out',
        false, 130
    ),
    (
        gen_random_uuid(), v_vertical_id,
        'ad_spend_pct_revenue', 'Ad Spend (% of Revenue)', '%',
        0, 30, 5, 1,
        'ad_spend_pct_revenue',
        false, 140
    ),
    (
        gen_random_uuid(), v_vertical_id,
        'tiktok_affiliate_rate', 'TikTok Affiliate Rate', '%',
        0, 30, 10, 1,
        'tiktok_affiliate_rate',
        false, 150
    ),

    -- ── RETURNS & REFUNDS ────────────────────────────────────────────────────

    (
        gen_random_uuid(), v_vertical_id,
        'return_rate', 'Return / Refund Rate', '%',
        0, 20, 2, 0.5,
        'return_rate',
        false, 160
    )
    ON CONFLICT (vertical_id, input_key) DO NOTHING;

    RAISE NOTICE 'vertical_inputs seeded for vertical_id = %', v_vertical_id;
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. DATA SOURCE MAPPINGS
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
    v_vertical_id              uuid;
    v_input_material           uuid;
    v_input_packaging          uuid;
    v_input_shipping           uuid;
BEGIN
    SELECT id INTO v_vertical_id
    FROM verticals
    WHERE slug = 'handmade-craft'
    LIMIT 1;

    SELECT id INTO v_input_material
    FROM vertical_inputs
    WHERE vertical_id = v_vertical_id AND input_key = 'material_cost_per_unit';

    SELECT id INTO v_input_packaging
    FROM vertical_inputs
    WHERE vertical_id = v_vertical_id AND input_key = 'packaging_cost_per_unit';

    SELECT id INTO v_input_shipping
    FROM vertical_inputs
    WHERE vertical_id = v_vertical_id AND input_key = 'avg_shipping_cost_per_order';

    -- ── MATERIAL COST MAPPINGS ────────────────────────────────────────────────

    INSERT INTO data_source_mappings (
        id,
        vertical_input_id,
        source_name,
        api_endpoint,
        json_path_selector,
        external_key,
        change_alert_threshold_pct,
        is_active
    )
    SELECT
        gen_random_uuid(),
        v_input_material,
        'BLS_CPI',
        'https://api.bls.gov/publicAPI/v2/timeseries/data/',
        '$.Results.series[0].data[0].value',
        'PCU325510325510',
        3.0,
        true
    WHERE NOT EXISTS (
        SELECT 1
        FROM data_source_mappings
        WHERE vertical_input_id = v_input_material
          AND external_key = 'PCU325510325510'
    );

    INSERT INTO data_source_mappings (
        id,
        vertical_input_id,
        source_name,
        api_endpoint,
        json_path_selector,
        external_key,
        change_alert_threshold_pct,
        is_active
    )
    SELECT
        gen_random_uuid(),
        v_input_material,
        'BLS_CPI',
        'https://api.bls.gov/publicAPI/v2/timeseries/data/',
        '$.Results.series[0].data[0].value',
        'PCU313110313110',
        4.0,
        true
    WHERE NOT EXISTS (
        SELECT 1
        FROM data_source_mappings
        WHERE vertical_input_id = v_input_material
          AND external_key = 'PCU313110313110'
    );

    INSERT INTO data_source_mappings (
        id,
        vertical_input_id,
        source_name,
        api_endpoint,
        json_path_selector,
        external_key,
        change_alert_threshold_pct,
        is_active
    )
    SELECT
        gen_random_uuid(),
        v_input_material,
        'USITC_TARIFF',
        'https://api.usitc.gov/api/get_data_value',
        '$.data[0].duty_rate',
        'HTS:3907.30.0000',
        5.0,
        true
    WHERE NOT EXISTS (
        SELECT 1
        FROM data_source_mappings
        WHERE vertical_input_id = v_input_material
          AND external_key = 'HTS:3907.30.0000'
    );

    INSERT INTO data_source_mappings (
        id,
        vertical_input_id,
        source_name,
        api_endpoint,
        json_path_selector,
        external_key,
        change_alert_threshold_pct,
        is_active
    )
    SELECT
        gen_random_uuid(),
        v_input_material,
        'USITC_TARIFF',
        'https://api.usitc.gov/api/get_data_value',
        '$.data[0].duty_rate',
        'HTS:5509.21.0060',
        5.0,
        true
    WHERE NOT EXISTS (
        SELECT 1
        FROM data_source_mappings
        WHERE vertical_input_id = v_input_material
          AND external_key = 'HTS:5509.21.0060'
    );

    INSERT INTO data_source_mappings (
        id,
        vertical_input_id,
        source_name,
        api_endpoint,
        json_path_selector,
        external_key,
        change_alert_threshold_pct,
        is_active
    )
    SELECT
        gen_random_uuid(),
        v_input_material,
        'USITC_TARIFF',
        'https://api.usitc.gov/api/get_data_value',
        '$.data[0].duty_rate',
        'HTS:3923.21.0085',
        5.0,
        true
    WHERE NOT EXISTS (
        SELECT 1
        FROM data_source_mappings
        WHERE vertical_input_id = v_input_material
          AND external_key = 'HTS:3923.21.0085'
    );

    -- ── PACKAGING COST MAPPINGS ───────────────────────────────────────────────

    INSERT INTO data_source_mappings (
        id,
        vertical_input_id,
        source_name,
        api_endpoint,
        json_path_selector,
        external_key,
        change_alert_threshold_pct,
        is_active
    )
    SELECT
        gen_random_uuid(),
        v_input_packaging,
        'BLS_CPI',
        'https://api.bls.gov/publicAPI/v2/timeseries/data/',
        '$.Results.series[0].data[0].value',
        'WPU0915',
        4.0,
        true
    WHERE NOT EXISTS (
        SELECT 1
        FROM data_source_mappings
        WHERE vertical_input_id = v_input_packaging
          AND external_key = 'WPU0915'
    );

    INSERT INTO data_source_mappings (
        id,
        vertical_input_id,
        source_name,
        api_endpoint,
        json_path_selector,
        external_key,
        change_alert_threshold_pct,
        is_active
    )
    SELECT
        gen_random_uuid(),
        v_input_packaging,
        'BLS_CPI',
        'https://api.bls.gov/publicAPI/v2/timeseries/data/',
        '$.Results.series[0].data[0].value',
        'WPU0911',
        4.0,
        true
    WHERE NOT EXISTS (
        SELECT 1
        FROM data_source_mappings
        WHERE vertical_input_id = v_input_packaging
          AND external_key = 'WPU0911'
    );

    -- ── SHIPPING COST MAPPINGS ────────────────────────────────────────────────

    INSERT INTO data_source_mappings (
        id,
        vertical_input_id,
        source_name,
        api_endpoint,
        json_path_selector,
        external_key,
        change_alert_threshold_pct,
        is_active
    )
    SELECT
        gen_random_uuid(),
        v_input_shipping,
        'SHIPPO_RATE',
        'https://api.goshippo.com/rates/',
        '$.amount',
        'shippo:usps_first_class_package',
        3.0,
        true
    WHERE NOT EXISTS (
        SELECT 1
        FROM data_source_mappings
        WHERE vertical_input_id = v_input_shipping
          AND external_key = 'shippo:usps_first_class_package'
    );

    INSERT INTO data_source_mappings (
        id,
        vertical_input_id,
        source_name,
        api_endpoint,
        json_path_selector,
        external_key,
        change_alert_threshold_pct,
        is_active
    )
    SELECT
        gen_random_uuid(),
        v_input_shipping,
        'SHIPPO_RATE',
        'https://api.goshippo.com/rates/',
        '$.amount',
        'shippo:usps_priority_mail',
        3.0,
        true
    WHERE NOT EXISTS (
        SELECT 1
        FROM data_source_mappings
        WHERE vertical_input_id = v_input_shipping
          AND external_key = 'shippo:usps_priority_mail'
    );

    INSERT INTO data_source_mappings (
        id,
        vertical_input_id,
        source_name,
        api_endpoint,
        json_path_selector,
        external_key,
        change_alert_threshold_pct,
        is_active
    )
    SELECT
        gen_random_uuid(),
        v_input_shipping,
        'BLS_CPI',
        'https://api.bls.gov/publicAPI/v2/timeseries/data/',
        '$.Results.series[0].data[0].value',
        'PCU484122484122',
        3.0,
        true
    WHERE NOT EXISTS (
        SELECT 1
        FROM data_source_mappings
        WHERE vertical_input_id = v_input_shipping
          AND external_key = 'PCU484122484122'
    );

    RAISE NOTICE 'data_source_mappings seeded for handmade-craft vertical.';
    RAISE NOTICE '  material_cost_per_unit input id:      %', v_input_material;
    RAISE NOTICE '  packaging_cost_per_unit input id:     %', v_input_packaging;
    RAISE NOTICE '  avg_shipping_cost_per_order input id: %', v_input_shipping;
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. VERIFICATION QUERIES (uncomment to run manually after migration)
-- ─────────────────────────────────────────────────────────────────────────────

/*
-- Confirm vertical exists
SELECT id, slug, display_name FROM verticals WHERE slug = 'handmade-craft';

-- Confirm all 16 inputs seeded
SELECT input_key, display_label, unit_label, default_value, is_live_data, sort_order
FROM vertical_inputs
WHERE vertical_id = (SELECT id FROM verticals WHERE slug = 'handmade-craft')
ORDER BY sort_order;

-- Confirm all 10 data source mappings seeded
SELECT dsm.external_key, dsm.source_name, dsm.change_alert_threshold_pct, vi.input_key
FROM data_source_mappings dsm
JOIN vertical_inputs vi ON vi.id = dsm.vertical_input_id
WHERE vi.vertical_id = (SELECT id FROM verticals WHERE slug = 'handmade-craft')
ORDER BY vi.input_key, dsm.source_name;
*/

COMMIT;

-- ============================================================================
-- Summary:
--   1 vertical row      (handmade-craft, tier 1, idempotent)
--  16 vertical_inputs   (all sliders for the Handmade vertical)
--  10 data_source_mappings (BLS PPI x6, USITC HTS x3, Shippo x2)
--
-- Cost snapshot writes:
--   The sync worker must call supabase.rpc('insert_cost_snapshot', { ... })
--   for each data_source_mapping after polling the external API.
--   Never INSERT into cost_snapshots directly.
--   Both p_data_source_mapping_id and p_sync_run_id must exist before calling.
-- ============================================================================