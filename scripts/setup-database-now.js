#!/usr/bin/env node

/**
 * Database Setup Script
 * Creates the database tables and functions needed for the Scrydex integration
 */

console.log('🔧 Setting up Scrydex Database...');
console.log('================================');

const sql = `
-- Drop existing tables if they exist
DROP TABLE IF EXISTS pokemon_cards CASCADE;
DROP TABLE IF EXISTS pokemon_expansions CASCADE;
DROP TABLE IF EXISTS card_prices CASCADE;
DROP TABLE IF EXISTS sync_status CASCADE;

-- Create sync_status table
CREATE TABLE sync_status (
  id INTEGER PRIMARY KEY DEFAULT 1,
  last_full_sync TIMESTAMP WITH TIME ZONE,
  last_pricing_sync TIMESTAMP WITH TIME ZONE,
  total_cards INTEGER DEFAULT 0,
  total_expansions INTEGER DEFAULT 0,
  sync_in_progress BOOLEAN DEFAULT FALSE,
  last_error TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create pokemon_expansions table
CREATE TABLE pokemon_expansions (
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
CREATE TABLE pokemon_cards (
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
  image_url_large TEXT,
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
  legalities JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create card_prices table
CREATE TABLE card_prices (
  id SERIAL PRIMARY KEY,
  card_id TEXT REFERENCES pokemon_cards(id) ON DELETE CASCADE,
  market_price_usd DECIMAL(10,2),
  market_price_eur DECIMAL(10,2),
  market_price_gbp DECIMAL(10,2),
  tcgplayer_price_usd DECIMAL(10,2),
  tcgplayer_price_eur DECIMAL(10,2),
  tcgplayer_price_gbp DECIMAL(10,2),
  cardmarket_price_eur DECIMAL(10,2),
  cardmarket_price_usd DECIMAL(10,2),
  cardmarket_price_gbp DECIMAL(10,2),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_pokemon_expansions_name ON pokemon_expansions(name);
CREATE INDEX idx_pokemon_expansions_series ON pokemon_expansions(series);
CREATE INDEX idx_pokemon_expansions_release_date ON pokemon_expansions(release_date);

CREATE INDEX idx_pokemon_cards_name ON pokemon_cards(name);
CREATE INDEX idx_pokemon_cards_expansion_id ON pokemon_cards(expansion_id);
CREATE INDEX idx_pokemon_cards_types ON pokemon_cards USING GIN(types);
CREATE INDEX idx_pokemon_cards_subtypes ON pokemon_cards USING GIN(subtypes);
CREATE INDEX idx_pokemon_cards_rarity ON pokemon_cards(rarity);

CREATE INDEX idx_card_prices_card_id ON card_prices(card_id);
CREATE INDEX idx_card_prices_last_updated ON card_prices(last_updated);

-- Enable Row Level Security
ALTER TABLE pokemon_expansions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pokemon_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_status ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Allow public read access to pokemon_expansions" ON pokemon_expansions
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access to pokemon_cards" ON pokemon_cards
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access to card_prices" ON card_prices
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access to sync_status" ON sync_status
  FOR SELECT USING (true);

-- Create policies for service role to manage data
CREATE POLICY "Allow service role to manage pokemon_expansions" ON pokemon_expansions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role to manage pokemon_cards" ON pokemon_cards
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role to manage card_prices" ON card_prices
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role to manage sync_status" ON sync_status
  FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions
GRANT SELECT ON pokemon_expansions TO anon, authenticated;
GRANT SELECT ON pokemon_cards TO anon, authenticated;
GRANT SELECT ON card_prices TO anon, authenticated;
GRANT SELECT ON sync_status TO anon, authenticated;

GRANT ALL ON pokemon_expansions TO service_role;
GRANT ALL ON pokemon_cards TO service_role;
GRANT ALL ON card_prices TO service_role;
GRANT ALL ON sync_status TO service_role;

-- Initialize sync status
INSERT INTO sync_status (id, total_cards, total_expansions, sync_in_progress) 
VALUES (1, 0, 0, false)
ON CONFLICT (id) DO NOTHING;
`;

console.log('📋 SQL to create database tables:');
console.log('=====================================');
console.log(sql);
console.log('=====================================');
console.log('');
console.log('💡 Instructions:');
console.log('1. Go to your Supabase dashboard');
console.log('2. Navigate to SQL Editor');
console.log('3. Copy and paste the SQL above');
console.log('4. Click "Run" to execute');
console.log('');
console.log('🎯 After running the SQL:');
console.log('1. The database tables will be created');
console.log('2. Your app will work without the Supabase function');
console.log('3. You can manually add data or deploy the function later');
console.log('');
console.log('✅ This will fix the current errors you\'re seeing!');
