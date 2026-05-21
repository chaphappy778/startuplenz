-- =============================================================================
-- File:         20260506000019_reseller_seed.sql
-- Description:  New vertical: Reseller / Thrift Flip.
--               eBay / Poshmark / Mercari model. Inventory is sourced
--               (thrift store, estate sale, wholesale lot), priced up,
--               photographed, listed, shipped.
-- =============================================================================

BEGIN;

INSERT INTO verticals (id, slug, display_name, description, icon_key, is_active, sort_order)
VALUES (
    gen_random_uuid(),
    'reseller',
    'Reseller / Thrift Flip',
    'Source low, list high. eBay, Poshmark, Mercari, Depop — your time becomes margin.',
    'icon-tag',
    true,
    70
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vertical_access_limits (tier_id, vertical_id, is_accessible)
SELECT t.id, v.id, true
FROM subscription_tiers t, verticals v
WHERE v.slug = 'reseller'
  AND t.slug IN ('free', 'pro', 'team')
ON CONFLICT (tier_id, vertical_id) DO NOTHING;

DO $$
DECLARE
    v_id uuid;
BEGIN
    SELECT id INTO v_id FROM verticals WHERE slug = 'reseller';
    IF v_id IS NULL THEN RAISE EXCEPTION 'Vertical reseller not found.'; END IF;

    INSERT INTO vertical_inputs (
        id, vertical_id, input_key, display_label, unit_label,
        min_value, max_value, default_value, step_size,
        formula_key, is_live_data, sort_order
    ) VALUES
    (gen_random_uuid(), v_id, 'items_sold_per_month',        'Items Sold per Month',           'items',  0, 500,  40,    1,    'items_sold_per_month',         false, 10),
    (gen_random_uuid(), v_id, 'avg_sale_price',              'Average Sale Price',             'USD',    3, 500,  35,    1,    'avg_sale_price',               false, 20),
    (gen_random_uuid(), v_id, 'avg_sourcing_cost_per_item',  'Avg Sourcing Cost per Item',     'USD',    0, 200,  6,     0.50, 'avg_sourcing_cost_per_item',   false, 30),
    (gen_random_uuid(), v_id, 'sell_through_rate_pct',       'Sell-Through Rate (listings → sold)','%',  5, 100,  45,    5,    'sell_through_rate_pct',        false, 40),
    (gen_random_uuid(), v_id, 'minutes_per_listing',         'Time per Listing (photo + write)','mins', 1, 120,  18,    1,    'minutes_per_listing',          false, 50),
    (gen_random_uuid(), v_id, 'your_hourly_rate',            'Your Time Value per Hour',       'USD/hr',0, 200,  25,    1,    'your_hourly_rate',             false, 60),
    (gen_random_uuid(), v_id, 'platform_fee_pct',            'Platform Fee (eBay/Poshmark/etc.)','%',   3, 25,   13,    0.5,  'platform_fee_pct',             false, 70),
    (gen_random_uuid(), v_id, 'payment_processing_pct',      'Payment Processing Fee',         '%',     0, 6,    2.9,   0.1,  'payment_processing_pct',       false, 80),
    (gen_random_uuid(), v_id, 'shipping_cost_per_item',      'Avg Shipping Cost per Item',     'USD',   0, 30,   5,     0.25, 'shipping_cost_per_item',       true,  90),
    (gen_random_uuid(), v_id, 'shipping_paid_by_buyer',      'Shipping Paid by Buyer',         'USD',   0, 30,   5,     0.25, 'shipping_paid_by_buyer',       false, 100),
    (gen_random_uuid(), v_id, 'supplies_per_month',          'Shipping Supplies per Month',    'USD',   0, 500,  35,    5,    'supplies_per_month',           false, 110),
    (gen_random_uuid(), v_id, 'mileage_per_month',           'Sourcing Mileage per Month',     'USD',   0, 1000, 60,    5,    'mileage_per_month',            false, 120),
    (gen_random_uuid(), v_id, 'tools_per_month',             'Cross-listing Tool per Month',   'USD',   0, 200,  10,    1,    'tools_per_month',              false, 130)

    ON CONFLICT (vertical_id, input_key) DO NOTHING;

    RAISE NOTICE 'reseller vertical + inputs seeded (vertical_id=%)', v_id;
END $$;

COMMIT;
