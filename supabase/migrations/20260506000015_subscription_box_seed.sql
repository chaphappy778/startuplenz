-- =============================================================================
-- File:         20260506000015_subscription_box_seed.sql
-- Description:  Seeds vertical_inputs for the Subscription Box vertical.
--               Calibrated to a small/early-stage indie box at ~200 active
--               subscribers and a single founder operating it.
-- =============================================================================

BEGIN;

DO $$
DECLARE
    v_vertical_id uuid;
BEGIN
    SELECT id INTO v_vertical_id
    FROM verticals
    WHERE slug = 'subscription-box'
    LIMIT 1;

    IF v_vertical_id IS NULL THEN
        RAISE EXCEPTION 'Vertical subscription-box not found.';
    END IF;

    INSERT INTO vertical_inputs (
        id, vertical_id, input_key, display_label, unit_label,
        min_value, max_value, default_value, step_size,
        formula_key, is_live_data, sort_order
    ) VALUES

    -- ── SUBSCRIBERS ──────────────────────────────────────────────────────────
    (gen_random_uuid(), v_vertical_id, 'subscribers_active',
        'Active Subscribers (start of month)', 'subs',
        0, 10000, 200, 10, 'subscribers_active', false, 10),

    (gen_random_uuid(), v_vertical_id, 'monthly_new_signups',
        'New Signups per Month', 'subs',
        0, 2000, 50, 5, 'monthly_new_signups', false, 20),

    (gen_random_uuid(), v_vertical_id, 'monthly_churn_pct',
        'Monthly Churn Rate', '%',
        0, 30, 8, 0.5, 'monthly_churn_pct', false, 30),

    -- ── PRICING ──────────────────────────────────────────────────────────────
    (gen_random_uuid(), v_vertical_id, 'monthly_box_price',
        'Box Price per Month', 'USD',
        5, 200, 39, 1, 'monthly_box_price', false, 40),

    (gen_random_uuid(), v_vertical_id, 'annual_discount_pct',
        'Annual Plan Discount (vs monthly)', '%',
        0, 30, 10, 1, 'annual_discount_pct', false, 50),

    (gen_random_uuid(), v_vertical_id, 'annual_plan_share_pct',
        'Subs on Annual Plan', '%',
        0, 100, 20, 5, 'annual_plan_share_pct', false, 60),

    -- ── BOX UNIT ECONOMICS ───────────────────────────────────────────────────
    (gen_random_uuid(), v_vertical_id, 'cogs_per_box',
        'Box Contents Cost', 'USD',
        1, 100, 12, 0.25, 'cogs_per_box', false, 70),

    (gen_random_uuid(), v_vertical_id, 'packaging_per_box',
        'Packaging + Insert per Box', 'USD',
        0.25, 20, 2.50, 0.25, 'packaging_per_box', false, 80),

    (gen_random_uuid(), v_vertical_id, 'shipping_cost_per_box',
        'Shipping Cost per Box', 'USD',
        0, 30, 6, 0.25, 'shipping_cost_per_box', false, 90),

    (gen_random_uuid(), v_vertical_id, 'shipping_charged_per_box',
        'Shipping Charged to Buyer', 'USD',
        0, 30, 0, 0.25, 'shipping_charged_per_box', false, 100),

    -- ── ACQUISITION ──────────────────────────────────────────────────────────
    (gen_random_uuid(), v_vertical_id, 'cac',
        'Customer Acquisition Cost', 'USD',
        0, 200, 25, 1, 'cac', false, 110),

    -- ── PROCESSING + PLATFORM ────────────────────────────────────────────────
    (gen_random_uuid(), v_vertical_id, 'payment_processing_pct',
        'Payment Processing Fee', '%',
        0, 8, 3, 0.1, 'payment_processing_pct', false, 120),

    (gen_random_uuid(), v_vertical_id, 'platform_fee_pct',
        'Platform Fee (e.g. Cratejoy)', '%',
        0, 15, 0, 0.5, 'platform_fee_pct', false, 130),

    -- ── MONTHLY FIXED ────────────────────────────────────────────────────────
    (gen_random_uuid(), v_vertical_id, 'warehouse_cost_per_month',
        'Warehouse / Storage per Month', 'USD',
        0, 5000, 500, 25, 'warehouse_cost_per_month', false, 140),

    (gen_random_uuid(), v_vertical_id, 'customer_service_per_month',
        'Customer Service per Month', 'USD',
        0, 5000, 400, 25, 'customer_service_per_month', false, 150),

    (gen_random_uuid(), v_vertical_id, 'tools_software_per_month',
        'Tools + Software per Month', 'USD',
        0, 2000, 200, 10, 'tools_software_per_month', false, 160),

    (gen_random_uuid(), v_vertical_id, 'founder_draw_per_month',
        'Founder Salary / Draw per Month', 'USD',
        0, 20000, 0, 100, 'founder_draw_per_month', false, 170)

    ON CONFLICT (vertical_id, input_key) DO NOTHING;

    RAISE NOTICE 'vertical_inputs seeded for subscription-box (vertical_id=%)', v_vertical_id;
END $$;

COMMIT;
