-- Create JustTCG Cards table for storing Pokemon cards from JustTCG API
-- This table is separate from pokemon_cards to avoid conflicts and allow comparison

CREATE TABLE IF NOT EXISTS justtcg_cards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    set_name TEXT,
    set_code TEXT,
    card_number TEXT,
    rarity TEXT,
    language TEXT DEFAULT 'en',
    language_code TEXT DEFAULT 'en',
    
    -- Card details
    supertype TEXT,
    types TEXT[],
    subtypes TEXT[],
    hp INTEGER,
    stage TEXT,
    
    -- Images
    image_url TEXT,
    image_small TEXT,
    image_large TEXT,
    
    -- Pricing data (JustTCG specific)
    justtcg_market_price DECIMAL(10,2),
    justtcg_low_price DECIMAL(10,2),
    justtcg_mid_price DECIMAL(10,2),
    justtcg_high_price DECIMAL(10,2),
    justtcg_foil_price DECIMAL(10,2),
    justtcg_normal_price DECIMAL(10,2),
    
    -- Raw API data for reference
    raw_api_data JSONB,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_synced_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_justtcg_cards_name ON justtcg_cards(name);
CREATE INDEX IF NOT EXISTS idx_justtcg_cards_set_name ON justtcg_cards(set_name);
CREATE INDEX IF NOT EXISTS idx_justtcg_cards_set_code ON justtcg_cards(set_code);
CREATE INDEX IF NOT EXISTS idx_justtcg_cards_language ON justtcg_cards(language);
CREATE INDEX IF NOT EXISTS idx_justtcg_cards_rarity ON justtcg_cards(rarity);
CREATE INDEX IF NOT EXISTS idx_justtcg_cards_types ON justtcg_cards USING GIN(types);
CREATE INDEX IF NOT EXISTS idx_justtcg_cards_last_synced ON justtcg_cards(last_synced_at);

-- Create sync tracking table for JustTCG
CREATE TABLE IF NOT EXISTS justtcg_sync_status (
    id INTEGER PRIMARY KEY DEFAULT 1,
    total_cards INTEGER DEFAULT 0,
    cards_imported INTEGER DEFAULT 0,
    last_full_sync TIMESTAMP WITH TIME ZONE,
    last_price_sync TIMESTAMP WITH TIME ZONE,
    api_requests_used INTEGER DEFAULT 0,
    api_requests_remaining INTEGER DEFAULT 1000,
    daily_requests_used INTEGER DEFAULT 0,
    daily_requests_remaining INTEGER DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial sync status
INSERT INTO justtcg_sync_status (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE justtcg_cards IS 'Pokemon cards imported from JustTCG API with pricing data';
COMMENT ON TABLE justtcg_sync_status IS 'Tracks JustTCG API usage and sync status to manage rate limits';


