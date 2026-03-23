#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixMappingExternalKeys() {
  console.log('Updating data_source_mappings with external_key values...\n');

  // Update the mappings with external_key values that match what the sync sources use
  const updates = [
    {
      id: 'c0000001-0000-0000-0000-000000000001',
      external_key: 'ETSY_FEE'  // Used by platforms.js source
    },
    {
      id: 'c0000002-0000-0000-0000-000000000001',
      external_key: 'SHIPPO_RATE'  // Used by shipping.js source
    },
    {
      id: 'c0000003-0000-0000-0000-000000000001',
      external_key: 'USITC_TARIFF'  // Used by usitc.js source
    }
  ];

  for (const update of updates) {
    const { error } = await supabase
      .from('data_source_mappings')
      .update({ external_key: update.external_key })
      .eq('id', update.id);

    if (error) {
      console.error(`  ✗ Failed to update ${update.id}:`, error.message);
      return;
    }
    console.log(`  ✓ Set external_key='${update.external_key}'`);
  }

  console.log('\n✅ Migration 011 external_keys updated!');
}

fixMappingExternalKeys().catch(err => {
  console.error('Update failed:', err);
  process.exit(1);
});
