-- =============================================================================
-- File:         20260322_000011_handmade_vertical_seed.sql
-- Description:  Populates vertical_inputs and data_source_mappings for handmade
--               vertical with platform fees, shipping, and tariff sources
-- Dependencies: 20260321_000002_core_tables.sql
--               20260321_000003_cost_data_tables.sql
--               20260321_000008_seed_data.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Step 1: Create vertical_inputs for handmade vertical cost factors
-- ─────────────────────────────────────────────────────────────────────────
-- These define the user input sliders and which ones are sourced from
-- live external feeds (platform_fees, shipping, tariff).
-- ---------------------------------------------------------------------------

-- Platform Fees Input
insert into vertical_inputs (
  id, vertical_id, input_key, display_label, unit_label,
  default_value, min_value, max_value, step_size,
  formula_key, is_live_data, sort_order
)
values (
  'd0000001-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001', -- handmade vertical
  'platform_fees_pct',
  'Platform fees (%)',
  '%',
  9.5,    -- average: listing (0.2) + txn (6.5) + payment (3%)
  0.0,
  15.0,
  0.1,
  'platform_fee_calculation',
  true,   -- this is sourced from live Etsy API data
  10
)
on conflict (vertical_id, input_key) do update set
  display_label = excluded.display_label,
  is_live_data = excluded.is_live_data;

-- Shipping Cost Input
insert into vertical_inputs (
  id, vertical_id, input_key, display_label, unit_label,
  default_value, min_value, max_value, step_size,
  formula_key, is_live_data, sort_order
)
values (
  'd0000002-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'shipping_cost_usd',
  'Shipping per order (USD)',
  'USD',
  8.50,   -- default USPS Priority
  2.0,
  50.0,
  0.50,
  'shipping_cost_calculation',
  true,   -- sourced from carrier APIs
  20
)
on conflict (vertical_id, input_key) do update set
  display_label = excluded.display_label,
  is_live_data = excluded.is_live_data;

-- Tariff Impact Input (for sensitivity analysis)
insert into vertical_inputs (
  id, vertical_id, input_key, display_label, unit_label,
  default_value, min_value, max_value, step_size,
  formula_key, is_live_data, sort_order
)
values (
  'd0000003-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'tariff_rate_pct',
  'Applied tariff rate (%)',
  '%',
  0.0,    -- baseline: no tariff
  0.0,
  50.0,
  1.0,
  'tariff_impact_calculation',
  true,   -- sourced from USITC
  30
)
on conflict (vertical_id, input_key) do update set
  display_label = excluded.display_label,
  is_live_data = excluded.is_live_data;

-- ---------------------------------------------------------------------------
-- Step 2: Create data_source_mappings pointing to real external APIs
-- ─────────────────────────────────────────────────────────────────────────
-- Each mapping tells the sync orchestrator:
--   - which external API to query (api_endpoint)
--   - how to extract the value (json_path_selector)
--   - alert threshold if the value changes unexpectedly
-- ---------------------------------------------------------------------------

-- Etsy Fees Source (for platform_fees_pct input)
insert into data_source_mappings (
  id, vertical_input_id, source_name,
  api_endpoint, json_path_selector,
  transform_expression, change_alert_threshold_pct,
  is_active
)
values (
  'c0000001-0000-0000-0000-000000000001',
  'd0000001-0000-0000-0000-000000000001', -- platform_fees_pct input
  'ETSY_FEE',
  'https://api.etsy.com/v3/application/seller-fees',
  '$.listing_fee + $.transaction_fee + $.payment_processor_fee',
  'current_fee * 100.0 / base_price',  -- convert to percentage
  2.0,    -- alert if fees change by more than 2%
  true
)
on conflict do nothing;

-- USPS Shipping Source (for shipping_cost_usd input)
insert into data_source_mappings (
  id, vertical_input_id, source_name,
  api_endpoint, json_path_selector,
  transform_expression, change_alert_threshold_pct,
  is_active
)
values (
  'c0000002-0000-0000-0000-000000000001',
  'd0000002-0000-0000-0000-000000000001', -- shipping_cost_usd input
  'SHIPPO_RATE',
  'https://api.goshippo.com/rates/?carriers=usps&service_levels=priority',
  '$.results[0].amount',
  'float(raw_value)',
  3.0,    -- alert if shipping changes by more than 3%
  true
)
on conflict do nothing;

-- USITC Tariff Source (for tariff_rate_pct input)
insert into data_source_mappings (
  id, vertical_input_id, source_name,
  api_endpoint, json_path_selector,
  transform_expression, change_alert_threshold_pct,
  is_active
)
values (
  'c0000003-0000-0000-0000-000000000001',
  'd0000003-0000-0000-0000-000000000001', -- tariff_rate_pct input
  'USITC_TARIFF',
  'https://api.usitc.gov/tariff/rates',
  '$.duty_rate_pct',
  'float(raw_value)',
  5.0,    -- alert if tariff changes by more than 5%
  true
)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Metadata/Notes:
-- - vertical_inputs define cost factors that users can adjust
-- - data_source_mappings link each input to its external API source
-- - To add more mappings, follow this same pattern:
--   1. Create a vertical_input row with unique (vertical_id, input_key)
--   2. Create a data_source_mapping with vertical_input_id FK
--   3. Update the sync service if using new source_name enum values
-- ---------------------------------------------------------------------------
