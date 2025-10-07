-- Update search cache table to properly store complete API responses
-- This ensures we can cache the exact API response structure

-- Drop and recreate search cache table with proper structure
DROP TABLE IF EXISTS search_cache CASCADE;
DROP TABLE IF EXISTS cached_cards CASCADE;
DROP TABLE IF EXISTS cached_sealed_products CASCADE;

-- Create search cache table for storing complete API responses
CREATE TABLE search_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key TEXT NOT NULL UNIQUE,
    query TEXT NOT NULL,
    game TEXT NOT NULL,
    search_type TEXT NOT NULL, -- 'general', 'expansion', 'sealed'
    expansion_id TEXT,
    page INTEGER DEFAULT 1,
    page_size INTEGER DEFAULT 100,
    -- Store the complete API response as JSONB
    api_response JSONB NOT NULL,
    -- Store individual results for easy querying
    results JSONB NOT NULL,
    total_results INTEGER DEFAULT 0,
    -- Cache metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

-- Create individual cards table for detailed storage (matches ScrydexCard interface)
CREATE TABLE cached_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_id TEXT NOT NULL UNIQUE, -- Original API ID from Scrydex
    name TEXT NOT NULL,
    supertype TEXT,
    types TEXT[],
    subtypes TEXT[],
    hp INTEGER,
    number TEXT,
    rarity TEXT,
    -- Expansion reference (flattened from API's nested structure)
    expansion_id TEXT,
    expansion_name TEXT,
    -- Images (flattened from API's nested structure)
    image_small TEXT,
    image_large TEXT,
    -- Complex data stored as JSONB to preserve exact API structure
    abilities JSONB,
    attacks JSONB,
    weaknesses JSONB,
    resistances JSONB,
    retreat_cost TEXT[],
    converted_retreat_cost INTEGER,
    artist TEXT,
    flavor_text TEXT,
    regulation_mark TEXT,
    language TEXT,
    language_code TEXT,
    national_pokedex_numbers INTEGER[],
    legalities JSONB,
    -- Pricing data (complete API pricing structure)
    prices JSONB,
    -- Individual price fields for easy querying
    market_price_usd DECIMAL(10,2),
    market_price_eur DECIMAL(10,2),
    market_price_gbp DECIMAL(10,2),
    tcgplayer_price_usd DECIMAL(10,2),
    tcgplayer_price_eur DECIMAL(10,2),
    tcgplayer_price_gbp DECIMAL(10,2),
    cardmarket_price_eur DECIMAL(10,2),
    cardmarket_price_usd DECIMAL(10,2),
    cardmarket_price_gbp DECIMAL(10,2),
    -- Metadata
    source TEXT NOT NULL DEFAULT 'scrydex',
    game TEXT NOT NULL DEFAULT 'pokemon',
    search_queries TEXT[], -- Array of queries that found this card
    last_searched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create cached sealed products table (for future sealed product support)
CREATE TABLE cached_sealed_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_id TEXT NOT NULL UNIQUE, -- Original API ID
    name TEXT NOT NULL,
    set_name TEXT,
    expansion_name TEXT,
    expansion_id TEXT,
    product_type TEXT, -- 'booster_box', 'elite_trainer_box', etc.
    image_small TEXT,
    image_large TEXT,
    -- Pricing data (will be updated periodically)
    prices JSONB,
    market_price_usd DECIMAL(10,2),
    market_price_eur DECIMAL(10,2),
    market_price_gbp DECIMAL(10,2),
    -- Metadata
    source TEXT NOT NULL DEFAULT 'scrydex',
    game TEXT NOT NULL DEFAULT 'pokemon',
    search_queries TEXT[], -- Array of queries that found this product
    last_searched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_search_cache_key ON search_cache(cache_key);
CREATE INDEX idx_search_cache_query_game ON search_cache(query, game);
CREATE INDEX idx_search_cache_expires ON search_cache(expires_at);
CREATE INDEX idx_search_cache_created ON search_cache(created_at);
CREATE INDEX idx_search_cache_search_type ON search_cache(search_type);

-- Indexes for cached_cards
CREATE INDEX idx_cached_cards_api_id ON cached_cards(api_id);
CREATE INDEX idx_cached_cards_name ON cached_cards(name);
CREATE INDEX idx_cached_cards_expansion_id ON cached_cards(expansion_id);
CREATE INDEX idx_cached_cards_source ON cached_cards(source);
CREATE INDEX idx_cached_cards_game ON cached_cards(game);
CREATE INDEX idx_cached_cards_last_searched ON cached_cards(last_searched_at);
CREATE INDEX idx_cached_cards_market_price_usd ON cached_cards(market_price_usd);
CREATE INDEX idx_cached_cards_rarity ON cached_cards(rarity);
CREATE INDEX idx_cached_cards_supertype ON cached_cards(supertype);
CREATE INDEX idx_cached_cards_types ON cached_cards USING GIN(types);
CREATE INDEX idx_cached_cards_subtypes ON cached_cards USING GIN(subtypes);

-- Indexes for cached_sealed_products
CREATE INDEX idx_cached_sealed_products_api_id ON cached_sealed_products(api_id);
CREATE INDEX idx_cached_sealed_products_name ON cached_sealed_products(name);
CREATE INDEX idx_cached_sealed_products_expansion_id ON cached_sealed_products(expansion_id);
CREATE INDEX idx_cached_sealed_products_source ON cached_sealed_products(source);
CREATE INDEX idx_cached_sealed_products_game ON cached_sealed_products(game);
CREATE INDEX idx_cached_sealed_products_last_searched ON cached_sealed_products(last_searched_at);
CREATE INDEX idx_cached_sealed_products_market_price_usd ON cached_sealed_products(market_price_usd);

-- Create function to extract pricing data from JSONB for cached cards
CREATE OR REPLACE FUNCTION extract_cached_card_pricing()
RETURNS TRIGGER AS $$
BEGIN
    -- Extract pricing data from the prices JSONB object
    IF NEW.prices IS NOT NULL THEN
        -- Market prices
        NEW.market_price_usd := (NEW.prices->'market'->>'usd')::DECIMAL(10,2);
        NEW.market_price_eur := (NEW.prices->'market'->>'eur')::DECIMAL(10,2);
        NEW.market_price_gbp := (NEW.prices->'market'->>'gbp')::DECIMAL(10,2);
        
        -- TCGPlayer prices
        NEW.tcgplayer_price_usd := (NEW.prices->'tcgplayer'->>'usd')::DECIMAL(10,2);
        NEW.tcgplayer_price_eur := (NEW.prices->'tcgplayer'->>'eur')::DECIMAL(10,2);
        NEW.tcgplayer_price_gbp := (NEW.prices->'tcgplayer'->>'gbp')::DECIMAL(10,2);
        
        -- Cardmarket prices
        NEW.cardmarket_price_eur := (NEW.prices->'cardmarket'->>'eur')::DECIMAL(10,2);
        NEW.cardmarket_price_usd := (NEW.prices->'cardmarket'->>'usd')::DECIMAL(10,2);
        NEW.cardmarket_price_gbp := (NEW.prices->'cardmarket'->>'gbp')::DECIMAL(10,2);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically extract pricing data for cached cards
CREATE TRIGGER extract_cached_card_pricing_trigger
    BEFORE INSERT OR UPDATE ON cached_cards
    FOR EACH ROW
    EXECUTE FUNCTION extract_cached_card_pricing();

-- Create function to store complete API response in search cache
CREATE OR REPLACE FUNCTION store_search_cache(
    p_cache_key TEXT,
    p_query TEXT,
    p_game TEXT,
    p_search_type TEXT,
    p_expansion_id TEXT,
    p_page INTEGER,
    p_page_size INTEGER,
    p_api_response JSONB,
    p_results JSONB,
    p_total_results INTEGER
)
RETURNS UUID AS $$
DECLARE
    cache_id UUID;
BEGIN
    INSERT INTO search_cache (
        cache_key, query, game, search_type, expansion_id,
        page, page_size, api_response, results, total_results
    ) VALUES (
        p_cache_key, p_query, p_game, p_search_type, p_expansion_id,
        p_page, p_page_size, p_api_response, p_results, p_total_results
    )
    ON CONFLICT (cache_key) DO UPDATE SET
        query = EXCLUDED.query,
        game = EXCLUDED.game,
        search_type = EXCLUDED.search_type,
        expansion_id = EXCLUDED.expansion_id,
        page = EXCLUDED.page,
        page_size = EXCLUDED.page_size,
        api_response = EXCLUDED.api_response,
        results = EXCLUDED.results,
        total_results = EXCLUDED.total_results,
        updated_at = NOW()
    RETURNING id INTO cache_id;
    
    RETURN cache_id;
END;
$$ LANGUAGE plpgsql;

-- Add comments to document the schema
COMMENT ON TABLE search_cache IS 'Stores complete API responses for search results caching';
COMMENT ON TABLE cached_cards IS 'Stores individual cards from API responses for detailed caching';
COMMENT ON TABLE cached_sealed_products IS 'Stores sealed products from API responses for detailed caching';
COMMENT ON COLUMN search_cache.api_response IS 'Complete API response as received from Scrydex';
COMMENT ON COLUMN search_cache.results IS 'Extracted results array from API response';
COMMENT ON COLUMN cached_cards.prices IS 'Complete pricing object from Scrydex API as JSONB';
COMMENT ON COLUMN cached_cards.legalities IS 'Card legalities information from Scrydex API';
