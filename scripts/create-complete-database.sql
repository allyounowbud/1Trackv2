-- Complete Scrydex Database Schema
-- This stores ALL data from Scrydex API locally for instant access

-- Drop existing tables if they exist
DROP TABLE IF EXISTS pokemon_cards CASCADE;
DROP TABLE IF EXISTS pokemon_expansions CASCADE;
DROP TABLE IF EXISTS card_prices CASCADE;
DROP TABLE IF EXISTS sync_status CASCADE;

-- Create pokemon_expansions table (static data)
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

-- Create pokemon_cards table (static data)
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

-- Create card_prices table (dynamic data - updated every 20 hours)
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

-- Create indexes for better performance
CREATE INDEX idx_pokemon_expansions_name ON pokemon_expansions(name);
CREATE INDEX idx_pokemon_expansions_series ON pokemon_expansions(series);
CREATE INDEX idx_pokemon_expansions_release_date ON pokemon_expansions(release_date);
CREATE INDEX idx_pokemon_expansions_code ON pokemon_expansions(code);

CREATE INDEX idx_pokemon_cards_name ON pokemon_cards(name);
CREATE INDEX idx_pokemon_cards_expansion_id ON pokemon_cards(expansion_id);
CREATE INDEX idx_pokemon_cards_types ON pokemon_cards USING GIN(types);
CREATE INDEX idx_pokemon_cards_subtypes ON pokemon_cards USING GIN(subtypes);
CREATE INDEX idx_pokemon_cards_rarity ON pokemon_cards(rarity);
CREATE INDEX idx_pokemon_cards_number ON pokemon_cards(number);
CREATE INDEX idx_pokemon_cards_supertype ON pokemon_cards(supertype);
CREATE INDEX idx_pokemon_cards_hp ON pokemon_cards(hp);

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

-- Create a function to update sync status
CREATE OR REPLACE FUNCTION update_sync_status(
  p_sync_type TEXT,
  p_total_cards INTEGER DEFAULT NULL,
  p_total_expansions INTEGER DEFAULT NULL,
  p_sync_in_progress BOOLEAN DEFAULT NULL,
  p_error TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE sync_status SET
    last_full_sync = CASE WHEN p_sync_type = 'full' THEN NOW() ELSE last_full_sync END,
    last_pricing_sync = CASE WHEN p_sync_type = 'pricing' THEN NOW() ELSE last_pricing_sync END,
    total_cards = COALESCE(p_total_cards, total_cards),
    total_expansions = COALESCE(p_total_expansions, total_expansions),
    sync_in_progress = COALESCE(p_sync_in_progress, sync_in_progress),
    last_error = COALESCE(p_error, last_error),
    updated_at = NOW()
  WHERE id = 1;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get sync status
CREATE OR REPLACE FUNCTION get_sync_status()
RETURNS TABLE(
  last_full_sync TIMESTAMP WITH TIME ZONE,
  last_pricing_sync TIMESTAMP WITH TIME ZONE,
  total_cards INTEGER,
  total_expansions INTEGER,
  sync_in_progress BOOLEAN,
  last_error TEXT,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.last_full_sync,
    s.last_pricing_sync,
    s.total_cards,
    s.total_expansions,
    s.sync_in_progress,
    s.last_error,
    s.updated_at
  FROM sync_status s
  WHERE s.id = 1;
END;
$$ LANGUAGE plpgsql;
