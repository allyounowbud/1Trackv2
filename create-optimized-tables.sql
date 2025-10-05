-- Optimized Scrydex Integration Tables
-- Clean schema for Scrydex API integration with proper caching and indexing

-- Drop existing tables if they exist
DROP TABLE IF EXISTS api_cache CASCADE;
DROP TABLE IF EXISTS pokemon_cards CASCADE;
DROP TABLE IF EXISTS pokemon_expansions CASCADE;
DROP TABLE IF EXISTS image_cache CASCADE;
DROP TABLE IF EXISTS pricing_cache CASCADE;

-- Create API cache table for Scrydex API responses
CREATE TABLE api_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cache_key TEXT UNIQUE NOT NULL,
    endpoint TEXT NOT NULL,
    params JSONB,
    response_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    hit_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for fast cache lookups
CREATE INDEX idx_api_cache_key ON api_cache(cache_key);
CREATE INDEX idx_api_cache_endpoint ON api_cache(endpoint);
CREATE INDEX idx_api_cache_expires ON api_cache(expires_at);

-- Create Pokemon cards table
CREATE TABLE pokemon_cards (
    id TEXT PRIMARY KEY, -- Scrydex card ID
    name TEXT NOT NULL,
    supertype TEXT,
    subtypes TEXT[],
    types TEXT[],
    hp INTEGER,
    national_pokedex_numbers INTEGER[],
    images JSONB, -- Store image URLs and metadata
    expansion_id TEXT,
    expansion_name TEXT,
    expansion_code TEXT,
    number TEXT,
    rarity TEXT,
    language TEXT DEFAULT 'en',
    language_code TEXT DEFAULT 'EN',
    translation JSONB, -- Store translation data
    abilities JSONB,
    attacks JSONB,
    weaknesses JSONB,
    resistances JSONB,
    retreat_cost TEXT[],
    converted_retreat_cost INTEGER,
    artist TEXT,
    flavor_text TEXT,
    regulation_mark TEXT,
    -- Pricing data
    market_value DECIMAL(10,2),
    raw_prices JSONB,
    graded_prices JSONB,
    price_updated_at TIMESTAMP WITH TIME ZONE,
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_synced TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for Pokemon cards
CREATE INDEX idx_pokemon_cards_name ON pokemon_cards USING gin(to_tsvector('english', name));
CREATE INDEX idx_pokemon_cards_expansion ON pokemon_cards(expansion_id);
CREATE INDEX idx_pokemon_cards_types ON pokemon_cards USING gin(types);
CREATE INDEX idx_pokemon_cards_subtypes ON pokemon_cards USING gin(subtypes);
CREATE INDEX idx_pokemon_cards_language ON pokemon_cards(language);
CREATE INDEX idx_pokemon_cards_market_value ON pokemon_cards(market_value) WHERE market_value IS NOT NULL;

-- Create Pokemon expansions table
CREATE TABLE pokemon_expansions (
    id TEXT PRIMARY KEY, -- Scrydex expansion ID
    name TEXT NOT NULL,
    series TEXT,
    code TEXT,
    total INTEGER,
    printed_total INTEGER,
    language TEXT DEFAULT 'en',
    language_code TEXT DEFAULT 'EN',
    release_date DATE,
    is_online_only BOOLEAN DEFAULT FALSE,
    logo TEXT, -- Logo URL
    symbol TEXT, -- Symbol URL
    translation JSONB, -- Store translation data
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_synced TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for Pokemon expansions
CREATE INDEX idx_pokemon_expansions_name ON pokemon_expansions USING gin(to_tsvector('english', name));
CREATE INDEX idx_pokemon_expansions_series ON pokemon_expansions(series);
CREATE INDEX idx_pokemon_expansions_language ON pokemon_expansions(language);
CREATE INDEX idx_pokemon_expansions_release_date ON pokemon_expansions(release_date);

-- Create image cache table for local image storage
CREATE TABLE image_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    original_url TEXT NOT NULL,
    cache_key TEXT UNIQUE NOT NULL,
    image_type TEXT NOT NULL, -- 'card', 'expansion', 'logo', etc.
    size TEXT NOT NULL, -- 'small', 'medium', 'large'
    blob_data BYTEA, -- Store image binary data
    content_type TEXT,
    file_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    hit_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for image cache
CREATE INDEX idx_image_cache_key ON image_cache(cache_key);
CREATE INDEX idx_image_cache_original_url ON image_cache(original_url);
CREATE INDEX idx_image_cache_type_size ON image_cache(image_type, size);
CREATE INDEX idx_image_cache_expires ON image_cache(expires_at);

-- Create pricing cache table for price data
CREATE TABLE pricing_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    card_id TEXT NOT NULL REFERENCES pokemon_cards(id) ON DELETE CASCADE,
    grading_company TEXT, -- 'raw', 'psa', 'bgs', 'cgc', etc.
    grade TEXT, -- '10', '9', '8', etc.
    market_price DECIMAL(10,2),
    low_price DECIMAL(10,2),
    mid_price DECIMAL(10,2),
    high_price DECIMAL(10,2),
    trend_7d DECIMAL(10,2), -- 7-day trend percentage
    trend_30d DECIMAL(10,2), -- 30-day trend percentage
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_source TEXT DEFAULT 'scrydex'
);

-- Create indexes for pricing cache
CREATE INDEX idx_pricing_cache_card_id ON pricing_cache(card_id);
CREATE INDEX idx_pricing_cache_grading ON pricing_cache(grading_company, grade);
CREATE INDEX idx_pricing_cache_market_price ON pricing_cache(market_price) WHERE market_price IS NOT NULL;

-- Enable Row Level Security (RLS)
ALTER TABLE api_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE pokemon_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE pokemon_expansions ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_cache ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for public read access
CREATE POLICY "Allow public read access to api_cache" ON api_cache FOR SELECT USING (true);
CREATE POLICY "Allow public read access to pokemon_cards" ON pokemon_cards FOR SELECT USING (true);
CREATE POLICY "Allow public read access to pokemon_expansions" ON pokemon_expansions FOR SELECT USING (true);
CREATE POLICY "Allow public read access to image_cache" ON image_cache FOR SELECT USING (true);
CREATE POLICY "Allow public read access to pricing_cache" ON pricing_cache FOR SELECT USING (true);

-- Create functions for cache management
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Clean up expired API cache entries
    DELETE FROM api_cache WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Clean up expired image cache entries
    DELETE FROM image_cache WHERE expires_at < NOW();
    
    -- Clean up old pricing data (keep last 30 days)
    DELETE FROM pricing_cache WHERE last_updated < NOW() - INTERVAL '30 days';
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to update cache hit counts
CREATE OR REPLACE FUNCTION update_cache_hit(cache_table TEXT, cache_key_value TEXT)
RETURNS VOID AS $$
BEGIN
    IF cache_table = 'api_cache' THEN
        UPDATE api_cache 
        SET hit_count = hit_count + 1, last_accessed = NOW() 
        WHERE cache_key = cache_key_value;
    ELSIF cache_table = 'image_cache' THEN
        UPDATE image_cache 
        SET hit_count = hit_count + 1, last_accessed = NOW() 
        WHERE cache_key = cache_key_value;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to get cache statistics
CREATE OR REPLACE FUNCTION get_cache_stats()
RETURNS TABLE (
    table_name TEXT,
    total_entries BIGINT,
    expired_entries BIGINT,
    total_size_mb NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'api_cache'::TEXT,
        COUNT(*)::BIGINT,
        COUNT(*) FILTER (WHERE expires_at < NOW())::BIGINT,
        ROUND(pg_total_relation_size('api_cache') / 1024.0 / 1024.0, 2)
    FROM api_cache
    UNION ALL
    SELECT 
        'pokemon_cards'::TEXT,
        COUNT(*)::BIGINT,
        0::BIGINT,
        ROUND(pg_total_relation_size('pokemon_cards') / 1024.0 / 1024.0, 2)
    FROM pokemon_cards
    UNION ALL
    SELECT 
        'pokemon_expansions'::TEXT,
        COUNT(*)::BIGINT,
        0::BIGINT,
        ROUND(pg_total_relation_size('pokemon_expansions') / 1024.0 / 1024.0, 2)
    FROM pokemon_expansions
    UNION ALL
    SELECT 
        'image_cache'::TEXT,
        COUNT(*)::BIGINT,
        COUNT(*) FILTER (WHERE expires_at < NOW())::BIGINT,
        ROUND(pg_total_relation_size('image_cache') / 1024.0 / 1024.0, 2)
    FROM image_cache
    UNION ALL
    SELECT 
        'pricing_cache'::TEXT,
        COUNT(*)::BIGINT,
        0::BIGINT,
        ROUND(pg_total_relation_size('pricing_cache') / 1024.0 / 1024.0, 2)
    FROM pricing_cache;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pokemon_cards_updated_at 
    BEFORE UPDATE ON pokemon_cards 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pokemon_expansions_updated_at 
    BEFORE UPDATE ON pokemon_expansions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for card search with pricing
CREATE VIEW card_search_view AS
SELECT 
    c.id,
    c.name,
    c.supertype,
    c.subtypes,
    c.types,
    c.hp,
    c.images,
    c.expansion_id,
    c.expansion_name,
    c.expansion_code,
    c.number,
    c.rarity,
    c.language,
    c.language_code,
    c.abilities,
    c.attacks,
    c.weaknesses,
    c.resistances,
    c.artist,
    c.flavor_text,
    c.market_value,
    c.raw_prices,
    c.graded_prices,
    c.price_updated_at,
    -- Add pricing data from cache
    pc.grading_company,
    pc.grade,
    pc.market_price as cached_market_price,
    pc.low_price as cached_low_price,
    pc.mid_price as cached_mid_price,
    pc.high_price as cached_high_price,
    pc.trend_7d,
    pc.trend_30d,
    pc.last_updated as pricing_last_updated
FROM pokemon_cards c
LEFT JOIN pricing_cache pc ON c.id = pc.card_id
WHERE c.market_value IS NOT NULL OR pc.market_price IS NOT NULL;

-- Grant permissions
GRANT SELECT ON card_search_view TO anon, authenticated;

-- Create indexes on the view (if supported)
-- Note: Some databases don't support indexes on views, so this might need to be handled differently

COMMENT ON TABLE api_cache IS 'Cache for Scrydex API responses with TTL support';
COMMENT ON TABLE pokemon_cards IS 'Pokemon cards data from Scrydex API with pricing information';
COMMENT ON TABLE pokemon_expansions IS 'Pokemon expansions/sets data from Scrydex API';
COMMENT ON TABLE image_cache IS 'Local cache for card and expansion images';
COMMENT ON TABLE pricing_cache IS 'Cached pricing data for cards with different grading companies';
COMMENT ON VIEW card_search_view IS 'Optimized view for card search with pricing data';

-- Insert some sample data for testing (optional)
-- INSERT INTO pokemon_expansions (id, name, series, code, total, printed_total, language, release_date) VALUES
-- ('base1', 'Base Set', 'Base', 'BS', 102, 102, 'en', '1996-10-20'),
-- ('jungle', 'Jungle', 'Base', 'JU', 64, 64, 'en', '1999-06-16');

COMMIT;

