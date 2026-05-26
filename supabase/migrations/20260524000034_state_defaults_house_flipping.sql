-- =============================================================================
-- Migration: 20260524000034_state_defaults_house_flipping
-- Purpose:   Adds a `state_defaults` table for location-sensitive default
--            values, seeded with all 50 US states (+ DC). Initial use is
--            house flipping, but the table is vertical-agnostic so future
--            location-aware models can join against it.
--
-- Data sources (initial seed, 2024 figures; needs annual refresh):
--   • property_tax_rate_pct   — Tax Foundation effective real estate tax
--                                rates 2024 report
--   • insurance_avg_per_month — Insurance Information Institute / NAIC
--                                home insurance state averages, normalized
--                                to monthly. Higher in hurricane/wildfire
--                                regions.
--   • realtor_commission_pct  — NAR + post-settlement-era industry typical;
--                                most states cluster 5.0–6.0%, with shift
--                                toward 5.0–5.5% in 2024.
--   • median_arv              — Zillow Home Value Index (all homes), rough
--                                state median as of mid-2024. House
--                                flippers should override per-deal.
--   • typical_holding_months  — ATTOM / Redfin state-level avg days-on-
--                                market converted to months and rounded
--                                to nearest half. Sunbelt faster,
--                                Northeast / Midwest slower.
--
-- NOTE: these are reasonable starting values, NOT a substitute for real
-- per-deal due diligence. The /pulse page treats them as "calibrating"
-- tier defaults pending operator submissions to refine.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.state_defaults (
    state_code                  char(2)     PRIMARY KEY,
    state_name                  text        NOT NULL,
    property_tax_rate_pct       numeric(5,3) NOT NULL,  -- effective annual %
    insurance_avg_per_month     numeric(8,2) NOT NULL,
    realtor_commission_pct      numeric(4,2) NOT NULL,
    median_arv                  numeric(12,0) NOT NULL,
    typical_holding_months      numeric(3,1) NOT NULL,
    source_notes                text,
    updated_at                  timestamptz NOT NULL DEFAULT now()
);

-- RLS: anyone can read (these are public reference data); no client writes.
ALTER TABLE public.state_defaults ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS read_state_defaults_all ON public.state_defaults;
CREATE POLICY read_state_defaults_all
    ON public.state_defaults
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Auto-touch updated_at on row update.
DROP TRIGGER IF EXISTS state_defaults_touch_updated_at ON public.state_defaults;
CREATE TRIGGER state_defaults_touch_updated_at
    BEFORE UPDATE ON public.state_defaults
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_updated_at();

-- ─── Seed all 50 states + DC ────────────────────────────────────────────────

INSERT INTO public.state_defaults (
    state_code, state_name, property_tax_rate_pct, insurance_avg_per_month,
    realtor_commission_pct, median_arv, typical_holding_months
) VALUES
    ('AL', 'Alabama',         0.41, 130,  5.5,  220000, 5.5),
    ('AK', 'Alaska',          1.04, 110,  5.5,  370000, 5.5),
    ('AZ', 'Arizona',         0.63, 145,  5.5,  430000, 4.5),
    ('AR', 'Arkansas',        0.64, 175,  5.5,  200000, 5.5),
    ('CA', 'California',      0.75, 140,  5.0,  765000, 5.0),
    ('CO', 'Colorado',        0.55, 200,  5.5,  545000, 4.5),
    ('CT', 'Connecticut',     2.15, 130,  5.5,  390000, 6.0),
    ('DE', 'Delaware',        0.61, 90,   5.5,  370000, 5.5),
    ('DC', 'D.C.',            0.62, 130,  5.5,  640000, 5.0),
    ('FL', 'Florida',         0.91, 350,  5.5,  395000, 4.5),
    ('GA', 'Georgia',         0.92, 165,  5.5,  330000, 5.0),
    ('HI', 'Hawaii',          0.32, 110,  5.5,  840000, 6.0),
    ('ID', 'Idaho',           0.67, 95,   5.5,  445000, 4.5),
    ('IL', 'Illinois',        2.27, 130,  5.5,  260000, 6.0),
    ('IN', 'Indiana',         0.85, 140,  5.5,  240000, 5.5),
    ('IA', 'Iowa',            1.57, 145,  5.5,  220000, 5.5),
    ('KS', 'Kansas',          1.41, 290,  5.5,  225000, 5.5),
    ('KY', 'Kentucky',        0.86, 230,  5.5,  205000, 5.5),
    ('LA', 'Louisiana',       0.56, 320,  5.5,  205000, 6.0),
    ('ME', 'Maine',           1.36, 95,   5.5,  395000, 5.5),
    ('MD', 'Maryland',        1.09, 110,  5.5,  430000, 5.5),
    ('MA', 'Massachusetts',   1.23, 140,  5.0,  610000, 5.5),
    ('MI', 'Michigan',        1.54, 145,  5.5,  240000, 5.5),
    ('MN', 'Minnesota',       1.12, 150,  5.5,  330000, 5.0),
    ('MS', 'Mississippi',     0.81, 230,  5.5,  175000, 5.5),
    ('MO', 'Missouri',        1.01, 165,  5.5,  235000, 5.0),
    ('MT', 'Montana',         0.84, 165,  5.5,  445000, 5.5),
    ('NE', 'Nebraska',        1.73, 320,  5.5,  240000, 5.5),
    ('NV', 'Nevada',          0.59, 100,  5.5,  430000, 4.5),
    ('NH', 'New Hampshire',   2.18, 110,  5.5,  470000, 5.5),
    ('NJ', 'New Jersey',      2.49, 110,  5.5,  510000, 6.0),
    ('NM', 'New Mexico',      0.80, 160,  5.5,  290000, 5.5),
    ('NY', 'New York',        1.72, 145,  5.0,  430000, 6.0),
    ('NC', 'North Carolina',  0.84, 175,  5.5,  330000, 5.0),
    ('ND', 'North Dakota',    0.98, 220,  5.5,  255000, 5.5),
    ('OH', 'Ohio',            1.59, 130,  5.5,  220000, 5.5),
    ('OK', 'Oklahoma',        0.90, 360,  5.5,  205000, 5.0),
    ('OR', 'Oregon',          0.93, 95,   5.5,  490000, 5.0),
    ('PA', 'Pennsylvania',    1.58, 105,  5.5,  255000, 5.5),
    ('RI', 'Rhode Island',    1.63, 140,  5.5,  445000, 5.5),
    ('SC', 'South Carolina',  0.57, 175,  5.5,  295000, 5.0),
    ('SD', 'South Dakota',    1.31, 220,  5.5,  270000, 5.5),
    ('TN', 'Tennessee',       0.71, 165,  5.5,  315000, 4.5),
    ('TX', 'Texas',           1.74, 320,  5.5,  300000, 4.5),
    ('UT', 'Utah',            0.63, 110,  5.5,  525000, 4.5),
    ('VT', 'Vermont',         1.90, 95,   5.5,  370000, 6.0),
    ('VA', 'Virginia',        0.82, 105,  5.5,  385000, 5.0),
    ('WA', 'Washington',      0.98, 110,  5.5,  580000, 5.0),
    ('WV', 'West Virginia',   0.59, 100,  5.5,  155000, 6.0),
    ('WI', 'Wisconsin',       1.85, 110,  5.5,  290000, 5.5),
    ('WY', 'Wyoming',         0.61, 145,  5.5,  340000, 5.5)
ON CONFLICT (state_code) DO UPDATE
    SET property_tax_rate_pct  = EXCLUDED.property_tax_rate_pct,
        insurance_avg_per_month = EXCLUDED.insurance_avg_per_month,
        realtor_commission_pct = EXCLUDED.realtor_commission_pct,
        median_arv             = EXCLUDED.median_arv,
        typical_holding_months = EXCLUDED.typical_holding_months;

COMMIT;
