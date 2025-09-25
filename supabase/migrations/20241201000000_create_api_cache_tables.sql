-- Create API cache tables for centralized data storage
-- This migration creates tables to store cached API responses

-- API cache table for general API responses
CREATE TABLE IF NOT EXISTS api_cache (
    id TEXT PRIMARY KEY,
    service TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cached cards table
CREATE TABLE IF NOT EXISTS cached_cards (
    id TEXT PRIMARY KEY,
    search_term TEXT NOT NULL,
    name TEXT NOT NULL,
    set TEXT,
    rarity TEXT,
    price DECIMAL(10,2),
    image_url TEXT,
    product_id TEXT,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cached products table
CREATE TABLE IF NOT EXISTS cached_products (
    id TEXT PRIMARY KEY,
    search_term TEXT NOT NULL,
    name TEXT NOT NULL,
    set TEXT,
    price DECIMAL(10,2),
    image_url TEXT,
    product_id TEXT,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cached expansions table
CREATE TABLE IF NOT EXISTS cached_expansions (
    id TEXT PRIMARY KEY,
    expansion_id TEXT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cached market data table
CREATE TABLE IF NOT EXISTS cached_market_data (
    id TEXT PRIMARY KEY,
    product_name TEXT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_api_cache_service ON api_cache(service);
CREATE INDEX IF NOT EXISTS idx_api_cache_created_at ON api_cache(created_at);

CREATE INDEX IF NOT EXISTS idx_cached_cards_search_term ON cached_cards(search_term);
CREATE INDEX IF NOT EXISTS idx_cached_cards_name ON cached_cards(name);
CREATE INDEX IF NOT EXISTS idx_cached_cards_set ON cached_cards(set);
CREATE INDEX IF NOT EXISTS idx_cached_cards_created_at ON cached_cards(created_at);

CREATE INDEX IF NOT EXISTS idx_cached_products_search_term ON cached_products(search_term);
CREATE INDEX IF NOT EXISTS idx_cached_products_name ON cached_products(name);
CREATE INDEX IF NOT EXISTS idx_cached_products_set ON cached_products(set);
CREATE INDEX IF NOT EXISTS idx_cached_products_created_at ON cached_products(created_at);

CREATE INDEX IF NOT EXISTS idx_cached_expansions_expansion_id ON cached_expansions(expansion_id);
CREATE INDEX IF NOT EXISTS idx_cached_expansions_created_at ON cached_expansions(created_at);

CREATE INDEX IF NOT EXISTS idx_cached_market_data_product_name ON cached_market_data(product_name);
CREATE INDEX IF NOT EXISTS idx_cached_market_data_created_at ON cached_market_data(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_api_cache_updated_at BEFORE UPDATE ON api_cache
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cached_cards_updated_at BEFORE UPDATE ON cached_cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cached_products_updated_at BEFORE UPDATE ON cached_products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cached_expansions_updated_at BEFORE UPDATE ON cached_expansions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cached_market_data_updated_at BEFORE UPDATE ON cached_market_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE api_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE cached_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE cached_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE cached_expansions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cached_market_data ENABLE ROW LEVEL SECURITY;

-- Create policies for service role access
CREATE POLICY "Service role can manage api_cache" ON api_cache
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage cached_cards" ON cached_cards
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage cached_products" ON cached_products
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage cached_expansions" ON cached_expansions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage cached_market_data" ON cached_market_data
    FOR ALL USING (auth.role() = 'service_role');

-- Create policies for authenticated users to read data
CREATE POLICY "Authenticated users can read api_cache" ON api_cache
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read cached_cards" ON cached_cards
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read cached_products" ON cached_products
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read cached_expansions" ON cached_expansions
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read cached_market_data" ON cached_market_data
    FOR SELECT USING (auth.role() = 'authenticated');
