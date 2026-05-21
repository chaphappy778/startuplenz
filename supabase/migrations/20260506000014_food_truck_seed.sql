-- =============================================================================
-- File:         20260506000014_food_truck_seed.sql
-- Description:  Seeds vertical_inputs for the Food Truck vertical.
--               Defaults are calibrated to a single-truck operator working
--               ~22 days/month at typical lunch-and-events service.
--
--               Per-input rationale lives in inline comments next to each row
--               so the eventual blog explainer can pull them straight from
--               here.
-- Dependencies: 20260321000003_cost_data_tables.sql, 20260321000008_seed_data.sql
-- =============================================================================

BEGIN;

DO $$
DECLARE
    v_vertical_id uuid;
BEGIN
    SELECT id INTO v_vertical_id
    FROM verticals
    WHERE slug = 'food-truck'
    LIMIT 1;

    IF v_vertical_id IS NULL THEN
        RAISE EXCEPTION 'Vertical food-truck not found. Confirm 000008 seed_data was applied.';
    END IF;

    INSERT INTO vertical_inputs (
        id, vertical_id, input_key, display_label, unit_label,
        min_value, max_value, default_value, step_size,
        formula_key, is_live_data, sort_order
    ) VALUES

    -- ── VOLUME ───────────────────────────────────────────────────────────────
    (gen_random_uuid(), v_vertical_id, 'days_open_per_month',
        'Days Open per Month', 'days',
        1, 30, 22, 1, 'days_open_per_month', false, 10),

    (gen_random_uuid(), v_vertical_id, 'avg_covers_per_day',
        'Avg Customers per Day', 'covers',
        10, 400, 80, 5, 'avg_covers_per_day', false, 20),

    (gen_random_uuid(), v_vertical_id, 'avg_ticket_size',
        'Average Ticket Size', 'USD',
        4, 40, 12, 0.50, 'avg_ticket_size', false, 30),

    -- ── REVENUE MIX ───────────────────────────────────────────────────────────
    (gen_random_uuid(), v_vertical_id, 'beverage_revenue_pct',
        'Beverage Share of Revenue', '%',
        0, 60, 20, 5, 'beverage_revenue_pct', false, 40),

    -- ── COGS ──────────────────────────────────────────────────────────────────
    (gen_random_uuid(), v_vertical_id, 'food_cost_pct',
        'Food Cost (% of food revenue)', '%',
        15, 50, 30, 1, 'food_cost_pct', false, 50),

    (gen_random_uuid(), v_vertical_id, 'beverage_cost_pct',
        'Beverage Cost (% of bev revenue)', '%',
        10, 40, 25, 1, 'beverage_cost_pct', false, 60),

    -- ── LABOR ─────────────────────────────────────────────────────────────────
    (gen_random_uuid(), v_vertical_id, 'labor_hourly_rate',
        'Avg Hourly Wage', 'USD/hr',
        12, 40, 18, 0.50, 'labor_hourly_rate', false, 70),

    (gen_random_uuid(), v_vertical_id, 'labor_hours_per_day',
        'Total Labor Hours per Day', 'hrs',
        2, 36, 12, 0.5, 'labor_hours_per_day', false, 80),

    -- ── DAILY OPERATING ──────────────────────────────────────────────────────
    (gen_random_uuid(), v_vertical_id, 'fuel_cost_per_day',
        'Fuel + Vehicle per Day', 'USD',
        0, 200, 30, 1, 'fuel_cost_per_day', false, 90),

    -- ── MONTHLY FIXED ────────────────────────────────────────────────────────
    (gen_random_uuid(), v_vertical_id, 'event_fee_per_month',
        'Event / Location Fees per Month', 'USD',
        0, 5000, 600, 25, 'event_fee_per_month', false, 100),

    (gen_random_uuid(), v_vertical_id, 'truck_loan_payment',
        'Truck Loan / Lease per Month', 'USD',
        0, 3000, 800, 25, 'truck_loan_payment', false, 110),

    (gen_random_uuid(), v_vertical_id, 'insurance_per_month',
        'Insurance per Month', 'USD',
        0, 1000, 200, 10, 'insurance_per_month', false, 120),

    (gen_random_uuid(), v_vertical_id, 'license_fees_per_month',
        'Licenses + Permits (monthly avg)', 'USD',
        0, 1000, 150, 10, 'license_fees_per_month', false, 130),

    (gen_random_uuid(), v_vertical_id, 'propane_supplies_per_month',
        'Propane + Supplies per Month', 'USD',
        0, 1500, 200, 10, 'propane_supplies_per_month', false, 140),

    (gen_random_uuid(), v_vertical_id, 'marketing_per_month',
        'Marketing per Month', 'USD',
        0, 5000, 300, 25, 'marketing_per_month', false, 150),

    -- ── PROCESSING ───────────────────────────────────────────────────────────
    (gen_random_uuid(), v_vertical_id, 'credit_card_fee_pct',
        'Card Processing Fee', '%',
        0, 6, 2.6, 0.1, 'credit_card_fee_pct', false, 160)

    ON CONFLICT (vertical_id, input_key) DO NOTHING;

    RAISE NOTICE 'vertical_inputs seeded for food-truck (vertical_id=%)', v_vertical_id;
END $$;

COMMIT;
