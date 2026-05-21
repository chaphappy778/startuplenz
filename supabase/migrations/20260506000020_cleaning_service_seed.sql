-- =============================================================================
-- File:         20260506000020_cleaning_service_seed.sql
-- Description:  New vertical: Cleaning / Handyman Service.
--               Hourly-billable service-business archetype. Different cost
--               structure from product makers — labor IS the product, and
--               supplies/transportation are real recurring costs.
-- =============================================================================

BEGIN;

INSERT INTO verticals (id, slug, display_name, description, icon_key, is_active, sort_order)
VALUES (
    gen_random_uuid(),
    'cleaning-service',
    'Cleaning / Handyman Service',
    'Hourly-billable service. Your time and a truck full of supplies are the business.',
    'icon-broom',
    true,
    80
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vertical_access_limits (tier_id, vertical_id, is_accessible)
SELECT t.id, v.id, true
FROM subscription_tiers t, verticals v
WHERE v.slug = 'cleaning-service'
  AND t.slug IN ('free', 'pro', 'team')
ON CONFLICT (tier_id, vertical_id) DO NOTHING;

DO $$
DECLARE
    v_id uuid;
BEGIN
    SELECT id INTO v_id FROM verticals WHERE slug = 'cleaning-service';
    IF v_id IS NULL THEN RAISE EXCEPTION 'Vertical cleaning-service not found.'; END IF;

    INSERT INTO vertical_inputs (
        id, vertical_id, input_key, display_label, unit_label,
        min_value, max_value, default_value, step_size,
        formula_key, is_live_data, sort_order
    ) VALUES
    (gen_random_uuid(), v_id, 'jobs_per_week',                'Jobs per Week',                  'jobs',   0, 100,  10,    1,    'jobs_per_week',                false, 10),
    (gen_random_uuid(), v_id, 'avg_hours_per_job',            'Avg Hours per Job',              'hrs',    0.5,12, 3,     0.5,  'avg_hours_per_job',            false, 20),
    (gen_random_uuid(), v_id, 'billable_rate',                'Hourly Billing Rate',            'USD/hr', 20, 250, 65,   1,    'billable_rate',                false, 30),
    (gen_random_uuid(), v_id, 'repeat_customer_pct',          'Repeat Customer Share',          '%',      0, 100,  60,   5,    'repeat_customer_pct',          false, 40),
    (gen_random_uuid(), v_id, 'supplies_cost_per_job',        'Supplies Cost per Job',          'USD',    0, 100,  8,    0.50, 'supplies_cost_per_job',        false, 50),
    (gen_random_uuid(), v_id, 'crew_size',                    'Crew Size (incl. you)',          'people', 1, 10,   1,    1,    'crew_size',                    false, 60),
    (gen_random_uuid(), v_id, 'crew_wage_per_hour',           'Crew Wage per Hour (each)',      'USD/hr', 0, 100,  20,   1,    'crew_wage_per_hour',           false, 70),
    (gen_random_uuid(), v_id, 'travel_minutes_per_job',       'Travel Minutes per Job',         'mins',   0, 120,  20,   1,    'travel_minutes_per_job',       false, 80),
    (gen_random_uuid(), v_id, 'vehicle_cost_per_month',       'Vehicle (loan + fuel) per Month','USD',    0, 5000, 600,  25,   'vehicle_cost_per_month',       false, 90),
    (gen_random_uuid(), v_id, 'insurance_per_month',          'Insurance + Bond per Month',     'USD',    0, 2000, 180,  10,   'insurance_per_month',          false, 100),
    (gen_random_uuid(), v_id, 'scheduling_software_per_month','Scheduling Software per Month',  'USD',    0, 500,  40,   1,    'scheduling_software_per_month',false, 110),
    (gen_random_uuid(), v_id, 'marketing_per_month',          'Marketing per Month',            'USD',    0, 5000, 250,  25,   'marketing_per_month',          false, 120),
    (gen_random_uuid(), v_id, 'card_processing_pct',          'Card Processing Fee',            '%',      0, 6,    2.9,  0.1,  'card_processing_pct',          false, 130),
    (gen_random_uuid(), v_id, 'no_show_pct',                  'No-Show / Cancel Rate',          '%',      0, 30,   5,    0.5,  'no_show_pct',                  false, 140)

    ON CONFLICT (vertical_id, input_key) DO NOTHING;

    RAISE NOTICE 'cleaning-service vertical + inputs seeded (vertical_id=%)', v_id;
END $$;

COMMIT;
