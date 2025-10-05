-- Create Pokemon Expansions table
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

-- Create Pokemon Cards table
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

-- Create Sync Status table
CREATE TABLE IF NOT EXISTS sync_status (
    id INTEGER PRIMARY KEY DEFAULT 1,
    cards TIMESTAMP WITH TIME ZONE,
    expansions TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pokemon_cards_name ON pokemon_cards(name);
CREATE INDEX IF NOT EXISTS idx_pokemon_cards_expansion_id ON pokemon_cards(expansion_id);
CREATE INDEX IF NOT EXISTS idx_pokemon_cards_types ON pokemon_cards USING GIN(types);
CREATE INDEX IF NOT EXISTS idx_pokemon_cards_subtypes ON pokemon_cards USING GIN(subtypes);
CREATE INDEX IF NOT EXISTS idx_pokemon_cards_rarity ON pokemon_cards(rarity);
CREATE INDEX IF NOT EXISTS idx_pokemon_cards_market_price ON pokemon_cards(market_price);

CREATE INDEX IF NOT EXISTS idx_pokemon_expansions_name ON pokemon_expansions(name);
CREATE INDEX IF NOT EXISTS idx_pokemon_expansions_series ON pokemon_expansions(series);
CREATE INDEX IF NOT EXISTS idx_pokemon_expansions_release_date ON pokemon_expansions(release_date);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_pokemon_expansions_updated_at 
    BEFORE UPDATE ON pokemon_expansions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pokemon_cards_updated_at 
    BEFORE UPDATE ON pokemon_cards 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE pokemon_expansions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pokemon_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_status ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Allow public read access to pokemon_expansions" ON pokemon_expansions
    FOR SELECT USING (true);

CREATE POLICY "Allow public read access to pokemon_cards" ON pokemon_cards
    FOR SELECT USING (true);

CREATE POLICY "Allow public read access to sync_status" ON sync_status
    FOR SELECT USING (true);

-- Create policies for authenticated users to manage sync
CREATE POLICY "Allow authenticated users to manage sync_status" ON sync_status
    FOR ALL USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT SELECT ON pokemon_expansions TO anon, authenticated;
GRANT SELECT ON pokemon_cards TO anon, authenticated;
GRANT SELECT ON sync_status TO anon, authenticated;
GRANT ALL ON sync_status TO authenticated;


