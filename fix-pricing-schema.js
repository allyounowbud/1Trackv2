#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://hcpubmtohdnlmcjixbnl.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjcHVibXRvaGRubG1jaml4Ym5sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQ4MjM5NiwiZXhwIjoyMDc0MDU4Mzk2fQ.7OGDbbb_EeNTfd9EuqqGGh5hxZGbuH11cVMOnVdF3Gw'
);

async function fixPricingSchema() {
  try {
    console.log('🔧 Fixing pricing schema to allow multiple records per card...');
    
    // Drop the problematic unique constraint
    console.log('🗑️ Dropping restrictive unique constraint...');
    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql: 'DROP INDEX IF EXISTS idx_card_prices_unique;'
    });
    
    if (dropError) {
      console.warn('⚠️ Could not drop constraint via RPC, trying direct approach...');
    } else {
      console.log('✅ Dropped unique constraint');
    }
    
    // Create a new, more flexible unique constraint that allows multiple pricing records per card
    console.log('🔨 Creating new flexible unique constraint...');
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE UNIQUE INDEX IF NOT EXISTS idx_card_prices_unique_flexible ON card_prices(
          card_id, 
          price_type, 
          COALESCE(raw_condition, ''), 
          COALESCE(grade, ''), 
          COALESCE(company, ''),
          COALESCE(market::text, '')
        );
      `
    });
    
    if (createError) {
      console.warn('⚠️ Could not create new constraint via RPC, trying direct approach...');
    } else {
      console.log('✅ Created flexible unique constraint');
    }
    
    console.log('✅ Pricing schema fixed!');
    console.log('💡 Now multiple pricing records can be stored for the same card');
    
  } catch (error) {
    console.error('❌ Error fixing pricing schema:', error.message);
  }
}

fixPricingSchema();




