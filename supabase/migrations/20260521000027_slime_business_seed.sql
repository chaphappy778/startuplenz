-- =============================================================================
-- File:         20260521000027_slime_business_seed.sql
-- Description:  New vertical: Slime Brand (small-batch slime business).
--               TikTok Shop heavy, drops-based selling, with temperature-pack
--               shipping economics. Tuned to the actual indie slime market —
--               Jennifer of ChapHaus already runs SlimeLog so the defaults
--               reflect real operator numbers.
-- =============================================================================

BEGIN;

INSERT INTO verticals (id, slug, display_name, description, icon_key, is_active, sort_order)
VALUES (
    gen_random_uuid(),
    'slime-business',
    'Slime Brand',
    'Small-batch slime brand — drops-based selling on TikTok Shop + Etsy. Materials, charms, temp packs, the works.',
    'icon-slime',
    true,
    100
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vertical_access_limits (tier_id, vertical_id, is_accessible)
SELECT t.id, v.id, true
FROM subscription_tiers t, verticals v
WHERE v.slug = 'slime-business'
  AND t.slug IN ('free', 'pro', 'team')
ON CONFLICT (tier_id, vertical_id) DO NOTHING;

DO $$
DECLARE
    v_id uuid;
BEGIN
    SELECT id INTO v_id FROM verticals WHERE slug = 'slime-business';
    IF v_id IS NULL THEN RAISE EXCEPTION 'Vertical slime-business not found.'; END IF;

    INSERT INTO vertical_inputs (
        id, vertical_id, input_key, display_label, unit_label,
        min_value, max_value, default_value, step_size,
        formula_key, is_live_data, sort_order
    ) VALUES

    -- ── DROP / INVENTORY ─────────────────────────────────────────────────────
    (gen_random_uuid(), v_id, 'drops_per_month',                'Drops per Month',                'drops',  1, 12,    2,     1,    'drops_per_month',                false, 10),
    (gen_random_uuid(), v_id, 'units_per_drop',                 'Units per Drop',                 'units',  10, 500,  50,    5,    'units_per_drop',                 false, 20),
    (gen_random_uuid(), v_id, 'sell_through_rate',              'Sell-Through Rate',              '%',      10, 100,  80,    5,    'sell_through_rate',              false, 30),

    -- ── PRICING ──────────────────────────────────────────────────────────────
    (gen_random_uuid(), v_id, 'price_per_unit',                 'Price per Slime (8oz typical)',  'USD',    3, 60,    11,    0.5,  'price_per_unit',                 false, 40),
    (gen_random_uuid(), v_id, 'avg_units_per_order',            'Average Slimes per Order',       'units',  1, 8,     1.8,   0.1,  'avg_units_per_order',            false, 50),

    -- ── MATERIALS + PACKAGING ────────────────────────────────────────────────
    (gen_random_uuid(), v_id, 'material_cost_per_unit',         'Material Cost (glue + activator + scent + mix-ins)', 'USD', 0.50, 15, 3.25, 0.05, 'material_cost_per_unit',         true,  60),
    (gen_random_uuid(), v_id, 'container_cost_per_unit',        'Container + Label per Unit',     'USD',    0.25, 5,   1.25,  0.05, 'container_cost_per_unit',        false, 70),
    (gen_random_uuid(), v_id, 'shipping_supplies_per_order',    'Shipping Supplies per Order',    'USD',    0.50, 10,  2.50,  0.10, 'shipping_supplies_per_order',    false, 80),
    (gen_random_uuid(), v_id, 'temp_pack_cost_per_order',       'Temp-Pack Cost per Order (avg)', 'USD',    0, 5,      0.45,  0.05, 'temp_pack_cost_per_order',       false, 90),

    -- ── LABOR ────────────────────────────────────────────────────────────────
    (gen_random_uuid(), v_id, 'labor_minutes_per_unit',         'Labor Minutes per Unit',         'mins',   1, 60,    15,    1,    'labor_minutes_per_unit',         false, 100),
    (gen_random_uuid(), v_id, 'maker_hourly_rate',              'Maker Hourly Rate',              'USD/hr', 0, 100,   18,    1,    'maker_hourly_rate',              false, 110),

    -- ── SHIPPING ─────────────────────────────────────────────────────────────
    (gen_random_uuid(), v_id, 'avg_shipping_cost_per_order',    'Carrier Shipping Cost per Order','USD',    0, 25,    5.50,  0.25, 'avg_shipping_cost_per_order',    true,  120),

    -- ── PLATFORM MIX ─────────────────────────────────────────────────────────
    (gen_random_uuid(), v_id, 'platform_mix_tiktok_pct',        'TikTok Shop Share',              '%',      0, 100,   50,    5,    'platform_mix_tiktok_pct',        false, 130),
    (gen_random_uuid(), v_id, 'tiktok_fee_pct',                 'TikTok Shop Combined Fees',      '%',      5, 25,    9,     0.5,  'tiktok_fee_pct',                 false, 140),
    (gen_random_uuid(), v_id, 'etsy_fee_pct',                   'Etsy Combined Fees',             '%',      5, 25,    13,    0.5,  'etsy_fee_pct',                   false, 150),

    -- ── MARKETING ────────────────────────────────────────────────────────────
    (gen_random_uuid(), v_id, 'ad_spend_per_month',             'Ad / Creator Gifting per Month', 'USD',    0, 5000,  200,   25,   'ad_spend_per_month',             false, 160)

    ON CONFLICT (vertical_id, input_key) DO NOTHING;

    RAISE NOTICE 'slime-business vertical + inputs seeded (vertical_id=%)', v_id;
END $$;

COMMIT;
