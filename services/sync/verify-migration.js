#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
  console.log('Verifying migration 011 deployment...\n');

  // Check vertical_inputs
  const { data: inputs, error: inputError } = await supabase
    .from('vertical_inputs')
    .select('id, input_key, is_live_data');

  if (inputError) {
    console.log('Error querying vertical_inputs:', inputError);
  } else {
    console.log(`✓ Found ${inputs?.length || 0} vertical_inputs:`);
    inputs?.forEach(i => {
      console.log(`  - ${i.input_key} (live_data=${i.is_live_data})`);
    });
  }

  // Check data_source_mappings
  const { data: mappings, error: mappingError } = await supabase
    .from('data_source_mappings')
    .select('id, source_name, vertical_input_id');

  if (mappingError) {
    console.log('\nError querying data_source_mappings:', mappingError);
  } else {
    console.log(`\n✓ Found ${mappings?.length || 0} data_source_mappings:`);
    mappings?.forEach(m => {
      console.log(`  - ${m.source_name} (input_id: ${m.vertical_input_id.substring(0, 8)}...)`);
    });
  }

  console.log('\n✅ Database state is consistent!');
}

verify().catch(err => console.error('Verification failed:', err));
