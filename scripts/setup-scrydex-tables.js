#!/usr/bin/env node

/**
 * Setup Scrydex Tables Script
 * Creates the necessary Supabase tables for Scrydex data synchronization
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   VITE_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupTables() {
  try {
    console.log('🔧 Setting up Scrydex tables...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20241201_create_scrydex_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.error('❌ Failed to create tables:', error);
      process.exit(1);
    }
    
    console.log('✅ Scrydex tables created successfully!');
    console.log('📊 Tables created:');
    console.log('   - pokemon_expansions');
    console.log('   - pokemon_cards');
    console.log('   - sync_status');
    
    // Test the tables
    console.log('🧪 Testing table access...');
    
    const { data: expansions, error: expansionsError } = await supabase
      .from('pokemon_expansions')
      .select('count')
      .limit(1);
    
    if (expansionsError) {
      console.error('❌ Failed to access pokemon_expansions table:', expansionsError);
    } else {
      console.log('✅ pokemon_expansions table accessible');
    }
    
    const { data: cards, error: cardsError } = await supabase
      .from('pokemon_cards')
      .select('count')
      .limit(1);
    
    if (cardsError) {
      console.error('❌ Failed to access pokemon_cards table:', cardsError);
    } else {
      console.log('✅ pokemon_cards table accessible');
    }
    
    const { data: sync, error: syncError } = await supabase
      .from('sync_status')
      .select('count')
      .limit(1);
    
    if (syncError) {
      console.error('❌ Failed to access sync_status table:', syncError);
    } else {
      console.log('✅ sync_status table accessible');
    }
    
    console.log('🎉 Setup completed successfully!');
    console.log('💡 Next steps:');
    console.log('   1. Start your development server: npm run dev');
    console.log('   2. Navigate to the Search page');
    console.log('   3. Click "Force Sync" to populate the tables with data');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run the setup
setupTables();


