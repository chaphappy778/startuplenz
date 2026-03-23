#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const { readFileSync } = require('fs');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function deployMigration011() {
  console.log('Deploying Migration 011 (Handmade Vertical Seed)...\n');

  // Step 1: Insert vertical_inputs
  console.log('Step 1: Creating vertical_inputs for handmade vertical...');

  const verticalInputs = [
    {
      id: 'd0000001-0000-0000-0000-000000000001',
      vertical_id: 'b0000000-0000-0000-0000-000000000001',
      input_key: 'platform_fees_pct',
      display_label: 'Platform fees (%)',
      unit_label: '%',
      default_value: 9.5,
      min_value: 0.0,
      max_value: 15.0,
      step_size: 0.1,
      formula_key: 'platform_fee_calculation',
      is_live_data: true,
      sort_order: 10
    },
    {
      id: 'd0000002-0000-0000-0000-000000000001',
      vertical_id: 'b0000000-0000-0000-0000-000000000001',
      input_key: 'shipping_cost_usd',
      display_label: 'Shipping per order (USD)',
      unit_label: 'USD',
      default_value: 8.50,
      min_value: 2.0,
      max_value: 50.0,
      step_size: 0.50,
      formula_key: 'shipping_cost_calculation',
      is_live_data: true,
      sort_order: 20
    },
    {
      id: 'd0000003-0000-0000-0000-000000000001',
      vertical_id: 'b0000000-0000-0000-0000-000000000001',
      input_key: 'tariff_rate_pct',
      display_label: 'Applied tariff rate (%)',
      unit_label: '%',
      default_value: 0.0,
      min_value: 0.0,
      max_value: 50.0,
      step_size: 1.0,
      formula_key: 'tariff_impact_calculation',
      is_live_data: true,
      sort_order: 30
    }
  ];

  for (const input of verticalInputs) {
    const { error } = await supabase
      .from('vertical_inputs')
      .upsert([input], { onConflict: 'vertical_id,input_key' });

    if (error) {
      console.error(`  ✗ Failed to insert ${input.input_key}:`, error.message);
      return;
    }
    console.log(`  ✓ Created ${input.input_key}`);
  }

  // Step 2: Insert data_source_mappings
  console.log('\nStep 2: Creating data_source_mappings...');

  const mappings = [
    {
      id: 'c0000001-0000-0000-0000-000000000001',
      vertical_input_id: 'd0000001-0000-0000-0000-000000000001',
      source_name: 'ETSY_FEE',
      api_endpoint: 'https://api.etsy.com/v3/application/seller-fees',
      json_path_selector: '$.listing_fee + $.transaction_fee + $.payment_processor_fee',
      transform_expression: 'current_fee * 100.0 / base_price',
      change_alert_threshold_pct: 2.0,
      is_active: true
    },
    {
      id: 'c0000002-0000-0000-0000-000000000001',
      vertical_input_id: 'd0000002-0000-0000-0000-000000000001',
      source_name: 'SHIPPO_RATE',
      api_endpoint: 'https://api.goshippo.com/rates/?carriers=usps&service_levels=priority',
      json_path_selector: '$.results[0].amount',
      transform_expression: 'float(raw_value)',
      change_alert_threshold_pct: 3.0,
      is_active: true
    },
    {
      id: 'c0000003-0000-0000-0000-000000000001',
      vertical_input_id: 'd0000003-0000-0000-0000-000000000001',
      source_name: 'USITC_TARIFF',
      api_endpoint: 'https://api.usitc.gov/tariff/rates',
      json_path_selector: '$.duty_rate_pct',
      transform_expression: 'float(raw_value)',
      change_alert_threshold_pct: 5.0,
      is_active: true
    }
  ];

  for (const mapping of mappings) {
    const { error } = await supabase
      .from('data_source_mappings')
      .upsert([mapping], { onConflict: 'id' });

    if (error) {
      console.error(`  ✗ Failed to insert mapping ${mapping.id}:`, error.message);
      return;
    }
    console.log(`  ✓ Created mapping for ${mapping.source_name}`);
  }

  console.log('\n✅ Migration 011 deployed successfully!');
  console.log(`Created 3 vertical_inputs and 3 data_source_mappings for handmade vertical.`);
}

deployMigration011().catch(err => {
  console.error('Deployment failed:', err);
  process.exit(1);
});
