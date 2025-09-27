-- Scrydex Integration Database Schema
-- This migration creates tables for caching Scrydex API data

-- Scrydex cards table for caching card data
CREATE TABLE IF NOT EXISTS scrydex_cards (
    id TEXT PRIMARY KEY,
    game TEXT NOT NULL, -- 'pokemon', 'magic', 'lorcana', 'gundam'
    scrydex_id TEXT NOT NULL,
    name TEXT NOT NULL,
    set_name TEXT,
    set_code TEXT,
    number TEXT,
    rarity TEXT,
    image_url TEXT,
    small_image_url TEXT,
    large_image_url TEXT,
    tcgplayer_id TEXT,
    cardmarket_id TEXT,
    prices JSONB, -- Store pricing data
    legalities JSONB, -- Store legality information
    raw_data JSONB NOT NULL, -- Store complete API response
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(game, scrydex_id)
);

-- Scrydex expansions table for caching expansion data
CREATE TABLE IF NOT EXISTS scrydex_expansions (
    id TEXT PRIMARY KEY,
    game TEXT NOT NULL, -- 'pokemon', 'magic', 'lorcana', 'gundam'
    scrydex_id TEXT NOT NULL,
    name TEXT NOT NULL,
    code TEXT,
    release_date DATE,
    total_cards INTEGER,
    image_url TEXT,
    symbol_url TEXT,
    logo_url TEXT,
    raw_data JSONB NOT NULL, -- Store complete API response
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(game, scrydex_id)
);

-- Scrydex search cache table for caching search results
CREATE TABLE IF NOT EXISTS scrydex_search_cache (
    id TEXT PRIMARY KEY,
    game TEXT NOT NULL,
    search_type TEXT NOT NULL, -- 'cards', 'expansions'
    query TEXT NOT NULL,
    page INTEGER DEFAULT 1,
    page_size INTEGER DEFAULT 20,
    results JSONB NOT NULL,
    total_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    UNIQUE(game, search_type, query, page, page_size)
);

-- Scrydex API usage tracking table
CREATE TABLE IF NOT EXISTS scrydex_api_usage (
    id SERIAL PRIMARY KEY,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL DEFAULT 'GET',
    status_code INTEGER,
    response_time_ms INTEGER,
    credits_used INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_scrydex_cards_game ON scrydex_cards(game);
CREATE INDEX IF NOT EXISTS idx_scrydex_cards_name ON scrydex_cards(name);
CREATE INDEX IF NOT EXISTS idx_scrydex_cards_set ON scrydex_cards(set_name);
CREATE INDEX IF NOT EXISTS idx_scrydex_cards_created_at ON scrydex_cards(created_at);

CREATE INDEX IF NOT EXISTS idx_scrydex_expansions_game ON scrydex_expansions(game);
CREATE INDEX IF NOT EXISTS idx_scrydex_expansions_name ON scrydex_expansions(name);
CREATE INDEX IF NOT EXISTS idx_scrydex_expansions_code ON scrydex_expansions(code);
CREATE INDEX IF NOT EXISTS idx_scrydex_expansions_created_at ON scrydex_expansions(created_at);

CREATE INDEX IF NOT EXISTS idx_scrydex_search_cache_game ON scrydex_search_cache(game);
CREATE INDEX IF NOT EXISTS idx_scrydex_search_cache_type ON scrydex_search_cache(search_type);
CREATE INDEX IF NOT EXISTS idx_scrydex_search_cache_query ON scrydex_search_cache(query);
CREATE INDEX IF NOT EXISTS idx_scrydex_search_cache_expires ON scrydex_search_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_scrydex_api_usage_endpoint ON scrydex_api_usage(endpoint);
CREATE INDEX IF NOT EXISTS idx_scrydex_api_usage_created_at ON scrydex_api_usage(created_at);

-- Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_scrydex_cards_updated_at BEFORE UPDATE ON scrydex_cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scrydex_expansions_updated_at BEFORE UPDATE ON scrydex_expansions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE scrydex_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrydex_expansions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrydex_search_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrydex_api_usage ENABLE ROW LEVEL SECURITY;

-- Create policies for service role access
CREATE POLICY "Service role can manage scrydex_cards" ON scrydex_cards
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage scrydex_expansions" ON scrydex_expansions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage scrydex_search_cache" ON scrydex_search_cache
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage scrydex_api_usage" ON scrydex_api_usage
    FOR ALL USING (auth.role() = 'service_role');

-- Create policies for authenticated users to read data
CREATE POLICY "Authenticated users can read scrydex_cards" ON scrydex_cards
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read scrydex_expansions" ON scrydex_expansions
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read scrydex_search_cache" ON scrydex_search_cache
    FOR SELECT USING (auth.role() = 'authenticated');

-- API usage table should only be accessible by service role
CREATE POLICY "Only service role can access scrydex_api_usage" ON scrydex_api_usage
    FOR ALL USING (auth.role() = 'service_role');

-- Create function to clean up expired search cache
CREATE OR REPLACE FUNCTION cleanup_expired_scrydex_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM scrydex_search_cache 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get API usage statistics
CREATE OR REPLACE FUNCTION get_scrydex_usage_stats(days_back INTEGER DEFAULT 7)
RETURNS TABLE (
    total_requests BIGINT,
    avg_response_time NUMERIC,
    total_credits_used BIGINT,
    requests_by_endpoint JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_requests,
        AVG(response_time_ms) as avg_response_time,
        SUM(credits_used) as total_credits_used,
        jsonb_object_agg(endpoint, endpoint_count) as requests_by_endpoint
    FROM (
        SELECT 
            endpoint,
            COUNT(*) as endpoint_count
        FROM scrydex_api_usage 
        WHERE created_at >= NOW() - INTERVAL '1 day' * days_back
        GROUP BY endpoint
    ) endpoint_stats
    CROSS JOIN (
        SELECT 
            COUNT(*) as total_requests,
            AVG(response_time_ms) as avg_response_time,
            SUM(credits_used) as total_credits_used
        FROM scrydex_api_usage 
        WHERE created_at >= NOW() - INTERVAL '1 day' * days_back
    ) overall_stats;
END;
$$ LANGUAGE plpgsql;
