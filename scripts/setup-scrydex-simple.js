#!/usr/bin/env node

/**
 * Simple Scrydex Tables Setup
 * Creates tables using Supabase client directly
 */

import { createClient } from '@supabase/supabase-js';

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   VITE_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  console.error('');
  console.error('💡 To get these values:');
  console.error('   1. Go to your Supabase project dashboard');
  console.error('   2. Go to Settings > API');
  console.error('   3. Copy the Project URL and service_role key');
  console.error('   4. Set them as environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTables() {
  try {
    console.log('🔧 Creating Scrydex tables...');
    
    // Create pokemon_expansions table
    console.log('📦 Creating pokemon_expansions table...');
    const { error: expansionsError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS pokemon_expansions (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          series TEXT,
          code TEXT,
          total INTEGER,
          printed_total INTEGER,
          language TEXT DEFAULT 'en',
          language_code TEXT DEFAULT 'en',
          release_date DATE,
          is_online_only BOOLEAN DEFAULT FALSE,
          logo_url TEXT,
          symbol_url TEXT,
          translation JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });
    
    if (expansionsError) {
      console.error('❌ Failed to create pokemon_expansions:', expansionsError);
    } else {
      console.log('✅ pokemon_expansions table created');
    }
    
    // Create pokemon_cards table
    console.log('🃏 Creating pokemon_cards table...');
    const { error: cardsError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS pokemon_cards (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          supertype TEXT,
          types TEXT[],
          subtypes TEXT[],
          hp INTEGER,
          number TEXT,
          rarity TEXT,
          expansion_id TEXT,
          expansion_name TEXT,
          image_url TEXT,
          abilities JSONB,
          attacks JSONB,
          weaknesses JSONB,
          resistances JSONB,
          retreat_cost TEXT[],
          converted_retreat_cost INTEGER,
          artist TEXT,
          flavor_text TEXT,
          regulation_mark TEXT,
          language TEXT DEFAULT 'en',
          language_code TEXT DEFAULT 'en',
          national_pokedex_numbers INTEGER[],
          market_price DECIMAL(10,2),
          low_price DECIMAL(10,2),
          mid_price DECIMAL(10,2),
          high_price DECIMAL(10,2),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });
    
    if (cardsError) {
      console.error('❌ Failed to create pokemon_cards:', cardsError);
    } else {
      console.log('✅ pokemon_cards table created');
    }
    
    // Create sync_status table
    console.log('🔄 Creating sync_status table...');
    const { error: syncError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS sync_status (
          id INTEGER PRIMARY KEY DEFAULT 1,
          cards TIMESTAMP WITH TIME ZONE,
          expansions TIMESTAMP WITH TIME ZONE,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });
    
    if (syncError) {
      console.error('❌ Failed to create sync_status:', syncError);
    } else {
      console.log('✅ sync_status table created');
    }
    
    // Enable RLS and create policies
    console.log('🔒 Setting up Row Level Security...');
    const { error: rlsError } = await supabase.rpc('exec', {
      sql: `
        ALTER TABLE pokemon_expansions ENABLE ROW LEVEL SECURITY;
        ALTER TABLE pokemon_cards ENABLE ROW LEVEL SECURITY;
        ALTER TABLE sync_status ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY IF NOT EXISTS "Allow public read access to pokemon_expansions" 
          ON pokemon_expansions FOR SELECT USING (true);
        
        CREATE POLICY IF NOT EXISTS "Allow public read access to pokemon_cards" 
          ON pokemon_cards FOR SELECT USING (true);
        
        CREATE POLICY IF NOT EXISTS "Allow public read access to sync_status" 
          ON sync_status FOR SELECT USING (true);
      `
    });
    
    if (rlsError) {
      console.error('❌ Failed to setup RLS:', rlsError);
    } else {
      console.log('✅ Row Level Security configured');
    }
    
    console.log('🎉 All tables created successfully!');
    console.log('');
    console.log('💡 Next steps:');
    console.log('   1. Start your development server: npm run dev');
    console.log('   2. Navigate to the Search page');
    console.log('   3. Click "Force Sync" to populate the tables with data');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    console.error('');
    console.error('💡 Alternative setup method:');
    console.error('   1. Go to your Supabase project dashboard');
    console.error('   2. Go to SQL Editor');
    console.error('   3. Run the SQL from supabase/migrations/20241201_create_scrydex_tables.sql');
    process.exit(1);
  }
}

// Run the setup
createTables();


