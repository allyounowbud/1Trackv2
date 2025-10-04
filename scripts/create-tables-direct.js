#!/usr/bin/env node

/**
 * Direct Table Creation Script
 * Creates tables directly in Supabase without requiring environment variables
 */

console.log('🔧 Creating Scrydex tables directly...');

// SQL to create the tables
const createTablesSQL = `
-- Create sync_status table
CREATE TABLE IF NOT EXISTS sync_status (
  id INTEGER PRIMARY KEY DEFAULT 1,
  cards TIMESTAMP WITH TIME ZONE,
  expansions TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create pokemon_expansions table
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

-- Create pokemon_cards table
CREATE TABLE IF NOT EXISTS pokemon_cards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  supertype TEXT,
  types TEXT[],
  subtypes TEXT[],
  hp INTEGER,
  number TEXT,
  rarity TEXT,
  expansion_id TEXT REFERENCES pokemon_expansions(id),
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
  -- Price data
  market_price DECIMAL(10,2),
  low_price DECIMAL(10,2),
  mid_price DECIMAL(10,2),
  high_price DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pokemon_expansions_name ON pokemon_expansions(name);
CREATE INDEX IF NOT EXISTS idx_pokemon_expansions_series ON pokemon_expansions(series);
CREATE INDEX IF NOT EXISTS idx_pokemon_expansions_release_date ON pokemon_expansions(release_date);

CREATE INDEX IF NOT EXISTS idx_pokemon_cards_name ON pokemon_cards(name);
CREATE INDEX IF NOT EXISTS idx_pokemon_cards_expansion_id ON pokemon_cards(expansion_id);
CREATE INDEX IF NOT EXISTS idx_pokemon_cards_types ON pokemon_cards USING GIN(types);
CREATE INDEX IF NOT EXISTS idx_pokemon_cards_subtypes ON pokemon_cards USING GIN(subtypes);
CREATE INDEX IF NOT EXISTS idx_pokemon_cards_rarity ON pokemon_cards(rarity);
CREATE INDEX IF NOT EXISTS idx_pokemon_cards_market_price ON pokemon_cards(market_price);

-- Enable RLS
ALTER TABLE sync_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE pokemon_expansions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pokemon_cards ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY IF NOT EXISTS "Allow public read access to sync_status" ON sync_status
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Allow public read access to pokemon_expansions" ON pokemon_expansions
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Allow public read access to pokemon_cards" ON pokemon_cards
  FOR SELECT USING (true);

-- Create policies for authenticated users to manage sync
CREATE POLICY IF NOT EXISTS "Allow authenticated users to manage sync_status" ON sync_status
  FOR ALL USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT SELECT ON sync_status TO anon, authenticated;
GRANT SELECT ON pokemon_expansions TO anon, authenticated;
GRANT SELECT ON pokemon_cards TO anon, authenticated;
GRANT ALL ON sync_status TO authenticated;

-- Initialize sync status
INSERT INTO sync_status (id, cards, expansions, updated_at) 
VALUES (1, NULL, NULL, NOW())
ON CONFLICT (id) DO NOTHING;
`;

console.log('📋 SQL to create tables:');
console.log('=====================================');
console.log(createTablesSQL);
console.log('=====================================');
console.log('');
console.log('💡 Instructions:');
console.log('1. Go to your Supabase dashboard');
console.log('2. Navigate to SQL Editor');
console.log('3. Copy and paste the SQL above');
console.log('4. Click "Run" to execute');
console.log('');
console.log('🎯 After running the SQL:');
console.log('1. Start your development server: npm run dev');
console.log('2. Navigate to the Search page');
console.log('3. Test the API connection and force sync');
