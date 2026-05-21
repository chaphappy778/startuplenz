-- =============================================================================
-- File:         20260506000018_digital_products_seed.sql
-- Description:  New vertical: Digital Products (templates, presets, courses,
--               printables). Zero COGS, near-zero variable costs — the model
--               is dominated by ad CAC, refunds, and platform/processing fees.
-- =============================================================================

BEGIN;

INSERT INTO verticals (id, slug, display_name, description, icon_key, is_active, sort_order)
VALUES (
    gen_random_uuid(),
    'digital-products',
    'Digital Products',
    'Templates, presets, courses, printables — sell once, deliver instantly, no inventory.',
    'icon-laptop',
    true,
    60
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vertical_access_limits (tier_id, vertical_id, is_accessible)
SELECT t.id, v.id, true
FROM subscription_tiers t, verticals v
WHERE v.slug = 'digital-products'
  AND t.slug IN ('free', 'pro', 'team')
ON CONFLICT (tier_id, vertical_id) DO NOTHING;

DO $$
DECLARE
    v_id uuid;
BEGIN
    SELECT id INTO v_id FROM verticals WHERE slug = 'digital-products';
    IF v_id IS NULL THEN RAISE EXCEPTION 'Vertical digital-products not found.'; END IF;

    INSERT INTO vertical_inputs (
        id, vertical_id, input_key, display_label, unit_label,
        min_value, max_value, default_value, step_size,
        formula_key, is_live_data, sort_order
    ) VALUES
    (gen_random_uuid(), v_id, 'sales_per_month',           'Sales per Month',                 'sales',    0, 5000, 80,    5,    'sales_per_month',           false, 10),
    (gen_random_uuid(), v_id, 'avg_order_value',           'Average Order Value',             'USD',      5, 1000, 27,   1,    'avg_order_value',           false, 20),
    (gen_random_uuid(), v_id, 'bundle_uplift_pct',         'Bundle Uplift on AOV',            '%',        0, 100,  20,   1,    'bundle_uplift_pct',         false, 30),
    (gen_random_uuid(), v_id, 'refund_rate_pct',           'Refund Rate',                     '%',        0, 25,   3,    0.5,  'refund_rate_pct',           false, 40),
    (gen_random_uuid(), v_id, 'payment_processing_pct',    'Payment Processing Fee',          '%',        0, 8,    3,    0.1,  'payment_processing_pct',    false, 50),
    (gen_random_uuid(), v_id, 'marketplace_fee_pct',       'Marketplace Fee (e.g. Etsy, Gumroad)','%',    0, 25,   8,    0.5,  'marketplace_fee_pct',       false, 60),
    (gen_random_uuid(), v_id, 'affiliate_payout_pct',      'Affiliate Payout',                '%',        0, 60,   20,   1,    'affiliate_payout_pct',      false, 70),
    (gen_random_uuid(), v_id, 'affiliate_share_of_sales_pct','Sales via Affiliates',          '%',        0, 100,  15,   5,    'affiliate_share_of_sales_pct',false,80),
    (gen_random_uuid(), v_id, 'ad_spend_per_month',        'Ad Spend per Month',              'USD',      0, 10000,300,  25,   'ad_spend_per_month',        false, 90),
    (gen_random_uuid(), v_id, 'ad_attributed_sales_pct',   'Sales from Paid Ads',             '%',        0, 100,  30,   5,    'ad_attributed_sales_pct',   false, 100),
    (gen_random_uuid(), v_id, 'email_capture_rate_pct',    'Email Capture Rate of Visitors',  '%',        0, 100,  4,    0.5,  'email_capture_rate_pct',    false, 110),
    (gen_random_uuid(), v_id, 'visitors_per_month',        'Visitors per Month',              'visits',   0, 500000,3000,100,  'visitors_per_month',        false, 120),
    (gen_random_uuid(), v_id, 'tools_software_per_month',  'Tools + Software per Month',      'USD',      0, 500,  60,   5,    'tools_software_per_month',  false, 130),
    (gen_random_uuid(), v_id, 'founder_draw_per_month',    'Founder Salary / Draw per Month', 'USD',      0, 20000,0,    100,  'founder_draw_per_month',    false, 140)

    ON CONFLICT (vertical_id, input_key) DO NOTHING;

    RAISE NOTICE 'digital-products vertical + inputs seeded (vertical_id=%)', v_id;
END $$;

COMMIT;
