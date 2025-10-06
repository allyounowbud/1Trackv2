-- Create search cache table for storing complete API data
CREATE TABLE IF NOT EXISTS search_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key TEXT NOT NULL UNIQUE,
    query TEXT NOT NULL,
    game TEXT NOT NULL,
    search_type TEXT NOT NULL, -- 'general', 'expansion', 'sealed'
    expansion_id TEXT,
    page INTEGER DEFAULT 1,
    page_size INTEGER DEFAULT 100,
    results JSONB NOT NULL,
    total_results INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

-- Create individual cards/products table for detailed storage
CREATE TABLE IF NOT EXISTS cached_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_id TEXT NOT NULL, -- Original API ID
    name TEXT NOT NULL,
    set_name TEXT,
    expansion_name TEXT,
    expansion_id TEXT,
    card_number TEXT,
    rarity TEXT,
    card_type TEXT,
    supertype TEXT,
    types TEXT[],
    subtypes TEXT[],
    hp INTEGER,
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
    image_url TEXT,
    image_url_large TEXT,
    image_source TEXT,
    -- Price data (will be updated periodically)
    market_price DECIMAL(10,2),
    low_price DECIMAL(10,2),
    mid_price DECIMAL(10,2),
    high_price DECIMAL(10,2),
    raw_price DECIMAL(10,2),
    graded_price DECIMAL(10,2),
    -- Metadata
    source TEXT NOT NULL, -- 'scrydex', 'pricecharting', etc.
    game TEXT NOT NULL,
    search_queries TEXT[], -- Array of queries that found this card
    last_searched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create cached sealed products table
CREATE TABLE IF NOT EXISTS cached_sealed_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_id TEXT NOT NULL, -- Original API ID
    name TEXT NOT NULL,
    set_name TEXT,
    expansion_name TEXT,
    expansion_id TEXT,
    product_type TEXT, -- 'booster_box', 'elite_trainer_box', etc.
    image_url TEXT,
    image_url_large TEXT,
    image_source TEXT,
    -- Price data (will be updated periodically)
    market_price DECIMAL(10,2),
    low_price DECIMAL(10,2),
    mid_price DECIMAL(10,2),
    high_price DECIMAL(10,2),
    -- Metadata
    source TEXT NOT NULL, -- 'scrydex', 'pricecharting', etc.
    game TEXT NOT NULL,
    search_queries TEXT[], -- Array of queries that found this product
    last_searched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_search_cache_key ON search_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_search_cache_query_game ON search_cache(query, game);
CREATE INDEX IF NOT EXISTS idx_search_cache_expires ON search_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_search_cache_created ON search_cache(created_at);

-- Indexes for cached_cards
CREATE INDEX IF NOT EXISTS idx_cached_cards_api_id ON cached_cards(api_id);
CREATE INDEX IF NOT EXISTS idx_cached_cards_name ON cached_cards(name);
CREATE INDEX IF NOT EXISTS idx_cached_cards_expansion_id ON cached_cards(expansion_id);
CREATE INDEX IF NOT EXISTS idx_cached_cards_source ON cached_cards(source);
CREATE INDEX IF NOT EXISTS idx_cached_cards_game ON cached_cards(game);
CREATE INDEX IF NOT EXISTS idx_cached_cards_last_searched ON cached_cards(last_searched_at);
CREATE INDEX IF NOT EXISTS idx_cached_cards_market_price ON cached_cards(market_price);

-- Indexes for cached_sealed_products
CREATE INDEX IF NOT EXISTS idx_cached_sealed_api_id ON cached_sealed_products(api_id);
CREATE INDEX IF NOT EXISTS idx_cached_sealed_name ON cached_sealed_products(name);
CREATE INDEX IF NOT EXISTS idx_cached_sealed_expansion_id ON cached_sealed_products(expansion_id);
CREATE INDEX IF NOT EXISTS idx_cached_sealed_source ON cached_sealed_products(source);
CREATE INDEX IF NOT EXISTS idx_cached_sealed_game ON cached_sealed_products(game);
CREATE INDEX IF NOT EXISTS idx_cached_sealed_last_searched ON cached_sealed_products(last_searched_at);
CREATE INDEX IF NOT EXISTS idx_cached_sealed_market_price ON cached_sealed_products(market_price);

-- Enable Row Level Security
ALTER TABLE search_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE cached_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE cached_sealed_products ENABLE ROW LEVEL SECURITY;

-- Create policies for public read/write access (since this is cache data)
CREATE POLICY "Allow public read access to search_cache" ON search_cache
    FOR SELECT USING (true);

CREATE POLICY "Allow public write access to search_cache" ON search_cache
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to search_cache" ON search_cache
    FOR UPDATE USING (true) WITH CHECK (true);

-- Policies for cached_cards
CREATE POLICY "Allow public read access to cached_cards" ON cached_cards
    FOR SELECT USING (true);

CREATE POLICY "Allow public write access to cached_cards" ON cached_cards
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to cached_cards" ON cached_cards
    FOR UPDATE USING (true) WITH CHECK (true);

-- Policies for cached_sealed_products
CREATE POLICY "Allow public read access to cached_sealed_products" ON cached_sealed_products
    FOR SELECT USING (true);

CREATE POLICY "Allow public write access to cached_sealed_products" ON cached_sealed_products
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to cached_sealed_products" ON cached_sealed_products
    FOR UPDATE USING (true) WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON search_cache TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON cached_cards TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON cached_sealed_products TO anon, authenticated;

-- Create updated_at triggers
CREATE TRIGGER update_search_cache_updated_at 
    BEFORE UPDATE ON search_cache 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cached_cards_updated_at 
    BEFORE UPDATE ON cached_cards 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cached_sealed_products_updated_at 
    BEFORE UPDATE ON cached_sealed_products 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
