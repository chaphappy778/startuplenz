-- =============================================================================
-- File:         20260624000035_power_washing_seed.sql
-- Description:  New vertical: Power Washing / Exterior Cleaning.
--               Mobile service business archetype. Closest cousin to the
--               cleaning-service vertical, but with meaningful equipment
--               cap-ex, higher per-job ticket, and lower repeat-customer
--               share (most homes get washed once every 1-2 years, not
--               weekly like residential cleaning).
-- Dependencies: 20260321000002_core_tables.sql, 20260321000008_seed_data.sql
-- =============================================================================

BEGIN;

INSERT INTO verticals (id, slug, display_name, description, icon_key, is_active, sort_order)
VALUES (
    gen_random_uuid(),
    'power-washing',
    'Power Washing / Exterior Cleaning',
    'Mobile exterior cleaning. Homes, driveways, decks, fleets. Capital-intensive at the start, real margins once routes get dense.',
    'icon-spray',
    true,
    90
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vertical_access_limits (tier_id, vertical_id, is_accessible)
SELECT t.id, v.id, true
FROM subscription_tiers t, verticals v
WHERE v.slug = 'power-washing'
  AND t.slug IN ('free', 'pro', 'team')
ON CONFLICT (tier_id, vertical_id) DO NOTHING;

DO $$
DECLARE
    v_id uuid;
BEGIN
    SELECT id INTO v_id FROM verticals WHERE slug = 'power-washing';
    IF v_id IS NULL THEN RAISE EXCEPTION 'Vertical power-washing not found.'; END IF;

    INSERT INTO vertical_inputs (
        id, vertical_id, input_key, display_label, unit_label,
        min_value, max_value, default_value, step_size,
        formula_key, is_live_data, sort_order
    ) VALUES
    -- Volume (jobs and per-job time). Power washing jobs are slower than
    -- cleaning jobs (a house soft wash runs 2-4 hrs, a driveway 1-2 hrs),
    -- so weekly job count is lower than residential cleaning.
    (gen_random_uuid(), v_id, 'jobs_per_week',                 'Jobs per Week',                       'jobs',   0, 60,   6,    1,    'jobs_per_week',                 false, 10),
    (gen_random_uuid(), v_id, 'avg_hours_per_job',             'Avg Hours per Job',                   'hrs',    0.5, 12, 2.5,  0.5,  'avg_hours_per_job',             false, 20),

    -- Pricing. Power washing is usually quoted flat-rate per house or
    -- driveway, but the effective hourly is ~$100-$200 for a competent
    -- solo operator. Default is conservative for a first-year op.
    (gen_random_uuid(), v_id, 'billable_rate',                 'Effective Hourly Rate',               'USD/hr', 30, 350, 110,  1,    'billable_rate',                 false, 30),

    -- Repeat share. Most residential customers wash 1x every 1-2 years.
    -- Default is much lower than cleaning's 60%. Commercial accounts
    -- (gas stations, storefronts, fleets) push this up over time.
    (gen_random_uuid(), v_id, 'repeat_customer_pct',           'Repeat Customer Share',               '%',      0, 100,  25,   5,    'repeat_customer_pct',           false, 40),

    -- Chemicals and consumables per job. Sodium hypochlorite, surfactants,
    -- brick wash, biocide. Varies by job size and surface type.
    (gen_random_uuid(), v_id, 'chemicals_cost_per_job',        'Chemicals Cost per Job',              'USD',    0, 200,  18,   1,    'chemicals_cost_per_job',        false, 50),

    -- Crew. Most start solo; second person doubles capacity but eats margin.
    (gen_random_uuid(), v_id, 'crew_size',                     'Crew Size (incl. you)',               'people', 1, 8,    1,    1,    'crew_size',                     false, 60),
    (gen_random_uuid(), v_id, 'crew_wage_per_hour',            'Crew Wage per Hour (each)',           'USD/hr', 0, 100,  22,   1,    'crew_wage_per_hour',            false, 70),

    -- Travel. Lower-density routes are the silent margin killer.
    (gen_random_uuid(), v_id, 'travel_minutes_per_job',        'Travel Minutes per Job',              'mins',   0, 120,  30,   1,    'travel_minutes_per_job',        false, 80),

    -- Vehicle. Truck and trailer combined: loan/lease payment plus fuel.
    -- Power washing fuel is real (towing weight + the rig sometimes
    -- runs off the truck engine for hot-water setups).
    (gen_random_uuid(), v_id, 'vehicle_cost_per_month',        'Vehicle (loan + fuel) per Month',     'USD',    0, 5000, 750,  25,   'vehicle_cost_per_month',        false, 90),

    -- Equipment cap-ex spread monthly. Starter rig (4 gpm pressure
    -- washer, surface cleaner, hoses, soft-wash kit) on a 36-month
    -- equipment loan is typically $150-$350/mo. Set to 0 if paid in cash.
    (gen_random_uuid(), v_id, 'equipment_payment_per_month',   'Equipment Loan per Month',            'USD',    0, 2500, 200,  10,   'equipment_payment_per_month',   false, 100),

    -- Insurance. General liability ($600-$1,500/yr) + commercial auto
    -- ($1,200-$2,400/yr). Higher than cleaning because of property
    -- damage exposure (windows, screens, gutters, paint).
    (gen_random_uuid(), v_id, 'insurance_per_month',           'Insurance per Month',                 'USD',    0, 800,  220,  10,   'insurance_per_month',           false, 110),

    -- Scheduling/CRM software. ServiceTitan is overkill; Jobber or
    -- Housecall Pro common.
    (gen_random_uuid(), v_id, 'scheduling_software_per_month', 'Scheduling Software per Month',       'USD',    0, 500,  50,   1,    'scheduling_software_per_month', false, 120),

    -- Marketing. Local SEO + a small Google Local Services Ads spend
    -- + occasional door hangers in target neighborhoods.
    (gen_random_uuid(), v_id, 'marketing_per_month',           'Marketing per Month',                 'USD',    0, 5000, 350,  25,   'marketing_per_month',           false, 130),

    -- Card processing. Standard Stripe/Square rate band.
    (gen_random_uuid(), v_id, 'card_processing_pct',           'Card Processing Fee',                 '%',      0, 6,    2.9,  0.1,  'card_processing_pct',           false, 140),

    -- No-show / cancel rate. Power washing tends to be lower than
    -- cleaning because customers schedule for specific weather windows.
    (gen_random_uuid(), v_id, 'no_show_pct',                   'No-Show / Cancel Rate',               '%',      0, 30,   4,    0.5,  'no_show_pct',                   false, 150)

    ON CONFLICT (vertical_id, input_key) DO NOTHING;

    RAISE NOTICE 'power-washing vertical + inputs seeded (vertical_id=%)', v_id;
END $$;

COMMIT;
