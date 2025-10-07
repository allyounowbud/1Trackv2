-- Update search cache table to match ACTUAL Scrydex API response structure
-- Based on real API responses provided by user

-- Drop and recreate search cache tables with correct structure
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

-- Create individual cards table for detailed storage (matches ACTUAL Scrydex API response)
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
    
    -- RAW PRICING DATA (matching actual API response)
    raw_condition TEXT,
    raw_is_perfect BOOLEAN,
    raw_is_signed BOOLEAN,
    raw_is_error BOOLEAN,
    raw_type TEXT DEFAULT 'raw',
    raw_low DECIMAL(10,2),
    raw_market DECIMAL(10,2),
    raw_currency TEXT DEFAULT 'USD',
    -- Raw trends with ALL actual periods and both price_change and percent_change
    raw_trend_1d_percent DECIMAL(10,2),
    raw_trend_1d_price DECIMAL(10,2),
    raw_trend_7d_percent DECIMAL(10,2),
    raw_trend_7d_price DECIMAL(10,2),
    raw_trend_14d_percent DECIMAL(10,2),
    raw_trend_14d_price DECIMAL(10,2),
    raw_trend_30d_percent DECIMAL(10,2),
    raw_trend_30d_price DECIMAL(10,2),
    raw_trend_90d_percent DECIMAL(10,2),
    raw_trend_90d_price DECIMAL(10,2),
    raw_trend_180d_percent DECIMAL(10,2),
    raw_trend_180d_price DECIMAL(10,2),
    
    -- GRADED PRICING DATA (matching actual API response)
    graded_grade TEXT,
    graded_company TEXT,
    graded_is_perfect BOOLEAN,
    graded_is_signed BOOLEAN,
    graded_is_error BOOLEAN,
    graded_type TEXT DEFAULT 'graded',
    graded_low DECIMAL(10,2),
    graded_mid DECIMAL(10,2),
    graded_high DECIMAL(10,2),
    graded_market DECIMAL(10,2),
    graded_currency TEXT DEFAULT 'USD',
    -- Graded trends with ALL actual periods and both price_change and percent_change
    graded_trend_1d_percent DECIMAL(10,2),
    graded_trend_1d_price DECIMAL(10,2),
    graded_trend_7d_percent DECIMAL(10,2),
    graded_trend_7d_price DECIMAL(10,2),
    graded_trend_14d_percent DECIMAL(10,2),
    graded_trend_14d_price DECIMAL(10,2),
    graded_trend_30d_percent DECIMAL(10,2),
    graded_trend_30d_price DECIMAL(10,2),
    graded_trend_90d_percent DECIMAL(10,2),
    graded_trend_90d_price DECIMAL(10,2),
    graded_trend_180d_percent DECIMAL(10,2),
    graded_trend_180d_price DECIMAL(10,2),
    
    -- Complete pricing objects from API (JSONB)
    raw_pricing JSONB,
    graded_pricing JSONB,
    
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
    raw_pricing JSONB,
    graded_pricing JSONB,
    raw_market DECIMAL(10,2),
    raw_low DECIMAL(10,2),
    graded_market DECIMAL(10,2),
    graded_low DECIMAL(10,2),
    graded_mid DECIMAL(10,2),
    graded_high DECIMAL(10,2),
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
CREATE INDEX idx_cached_cards_raw_market ON cached_cards(raw_market);
CREATE INDEX idx_cached_cards_graded_market ON cached_cards(graded_market);
CREATE INDEX idx_cached_cards_graded_grade ON cached_cards(graded_grade);
CREATE INDEX idx_cached_cards_graded_company ON cached_cards(graded_company);
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
CREATE INDEX idx_cached_sealed_products_raw_market ON cached_sealed_products(raw_market);
CREATE INDEX idx_cached_sealed_products_graded_market ON cached_sealed_products(graded_market);

-- Create function to extract pricing data from actual API response for cached cards
CREATE OR REPLACE FUNCTION extract_cached_card_actual_pricing()
RETURNS TRIGGER AS $$
BEGIN
    -- Extract raw pricing data from JSONB
    IF NEW.raw_pricing IS NOT NULL THEN
        NEW.raw_condition := NEW.raw_pricing->>'condition';
        NEW.raw_is_perfect := (NEW.raw_pricing->>'is_perfect')::BOOLEAN;
        NEW.raw_is_signed := (NEW.raw_pricing->>'is_signed')::BOOLEAN;
        NEW.raw_is_error := (NEW.raw_pricing->>'is_error')::BOOLEAN;
        NEW.raw_type := NEW.raw_pricing->>'type';
        NEW.raw_low := (NEW.raw_pricing->>'low')::DECIMAL(10,2);
        NEW.raw_market := (NEW.raw_pricing->>'market')::DECIMAL(10,2);
        NEW.raw_currency := NEW.raw_pricing->>'currency';
        
        -- Extract all trend periods with both price_change and percent_change
        IF NEW.raw_pricing->'trends'->'days_1' IS NOT NULL THEN
            NEW.raw_trend_1d_percent := (NEW.raw_pricing->'trends'->'days_1'->>'percent_change')::DECIMAL(10,2);
            NEW.raw_trend_1d_price := (NEW.raw_pricing->'trends'->'days_1'->>'price_change')::DECIMAL(10,2);
        END IF;
        IF NEW.raw_pricing->'trends'->'days_7' IS NOT NULL THEN
            NEW.raw_trend_7d_percent := (NEW.raw_pricing->'trends'->'days_7'->>'percent_change')::DECIMAL(10,2);
            NEW.raw_trend_7d_price := (NEW.raw_pricing->'trends'->'days_7'->>'price_change')::DECIMAL(10,2);
        END IF;
        IF NEW.raw_pricing->'trends'->'days_14' IS NOT NULL THEN
            NEW.raw_trend_14d_percent := (NEW.raw_pricing->'trends'->'days_14'->>'percent_change')::DECIMAL(10,2);
            NEW.raw_trend_14d_price := (NEW.raw_pricing->'trends'->'days_14'->>'price_change')::DECIMAL(10,2);
        END IF;
        IF NEW.raw_pricing->'trends'->'days_30' IS NOT NULL THEN
            NEW.raw_trend_30d_percent := (NEW.raw_pricing->'trends'->'days_30'->>'percent_change')::DECIMAL(10,2);
            NEW.raw_trend_30d_price := (NEW.raw_pricing->'trends'->'days_30'->>'price_change')::DECIMAL(10,2);
        END IF;
        IF NEW.raw_pricing->'trends'->'days_90' IS NOT NULL THEN
            NEW.raw_trend_90d_percent := (NEW.raw_pricing->'trends'->'days_90'->>'percent_change')::DECIMAL(10,2);
            NEW.raw_trend_90d_price := (NEW.raw_pricing->'trends'->'days_90'->>'price_change')::DECIMAL(10,2);
        END IF;
        IF NEW.raw_pricing->'trends'->'days_180' IS NOT NULL THEN
            NEW.raw_trend_180d_percent := (NEW.raw_pricing->'trends'->'days_180'->>'percent_change')::DECIMAL(10,2);
            NEW.raw_trend_180d_price := (NEW.raw_pricing->'trends'->'days_180'->>'price_change')::DECIMAL(10,2);
        END IF;
    END IF;
    
    -- Extract graded pricing data from JSONB
    IF NEW.graded_pricing IS NOT NULL THEN
        NEW.graded_grade := NEW.graded_pricing->>'grade';
        NEW.graded_company := NEW.graded_pricing->>'company';
        NEW.graded_is_perfect := (NEW.graded_pricing->>'is_perfect')::BOOLEAN;
        NEW.graded_is_signed := (NEW.graded_pricing->>'is_signed')::BOOLEAN;
        NEW.graded_is_error := (NEW.graded_pricing->>'is_error')::BOOLEAN;
        NEW.graded_type := NEW.graded_pricing->>'type';
        NEW.graded_low := (NEW.graded_pricing->>'low')::DECIMAL(10,2);
        NEW.graded_mid := (NEW.graded_pricing->>'mid')::DECIMAL(10,2);
        NEW.graded_high := (NEW.graded_pricing->>'high')::DECIMAL(10,2);
        NEW.graded_market := (NEW.graded_pricing->>'market')::DECIMAL(10,2);
        NEW.graded_currency := NEW.graded_pricing->>'currency';
        
        -- Extract all trend periods with both price_change and percent_change
        IF NEW.graded_pricing->'trends'->'days_1' IS NOT NULL THEN
            NEW.graded_trend_1d_percent := (NEW.graded_pricing->'trends'->'days_1'->>'percent_change')::DECIMAL(10,2);
            NEW.graded_trend_1d_price := (NEW.graded_pricing->'trends'->'days_1'->>'price_change')::DECIMAL(10,2);
        END IF;
        IF NEW.graded_pricing->'trends'->'days_7' IS NOT NULL THEN
            NEW.graded_trend_7d_percent := (NEW.graded_pricing->'trends'->'days_7'->>'percent_change')::DECIMAL(10,2);
            NEW.graded_trend_7d_price := (NEW.graded_pricing->'trends'->'days_7'->>'price_change')::DECIMAL(10,2);
        END IF;
        IF NEW.graded_pricing->'trends'->'days_14' IS NOT NULL THEN
            NEW.graded_trend_14d_percent := (NEW.graded_pricing->'trends'->'days_14'->>'percent_change')::DECIMAL(10,2);
            NEW.graded_trend_14d_price := (NEW.graded_pricing->'trends'->'days_14'->>'price_change')::DECIMAL(10,2);
        END IF;
        IF NEW.graded_pricing->'trends'->'days_30' IS NOT NULL THEN
            NEW.graded_trend_30d_percent := (NEW.graded_pricing->'trends'->'days_30'->>'percent_change')::DECIMAL(10,2);
            NEW.graded_trend_30d_price := (NEW.graded_pricing->'trends'->'days_30'->>'price_change')::DECIMAL(10,2);
        END IF;
        IF NEW.graded_pricing->'trends'->'days_90' IS NOT NULL THEN
            NEW.graded_trend_90d_percent := (NEW.graded_pricing->'trends'->'days_90'->>'percent_change')::DECIMAL(10,2);
            NEW.graded_trend_90d_price := (NEW.graded_pricing->'trends'->'days_90'->>'price_change')::DECIMAL(10,2);
        END IF;
        IF NEW.graded_pricing->'trends'->'days_180' IS NOT NULL THEN
            NEW.graded_trend_180d_percent := (NEW.graded_pricing->'trends'->'days_180'->>'percent_change')::DECIMAL(10,2);
            NEW.graded_trend_180d_price := (NEW.graded_pricing->'trends'->'days_180'->>'price_change')::DECIMAL(10,2);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically extract pricing data for cached cards
CREATE TRIGGER extract_cached_card_actual_pricing_trigger
    BEFORE INSERT OR UPDATE ON cached_cards
    FOR EACH ROW
    EXECUTE FUNCTION extract_cached_card_actual_pricing();

-- Create function to store complete API response in search cache
CREATE OR REPLACE FUNCTION store_search_cache_actual(
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
COMMENT ON TABLE cached_cards IS 'Stores individual cards from API responses with actual Scrydex pricing structure';
COMMENT ON TABLE cached_sealed_products IS 'Stores sealed products from API responses for detailed caching';
COMMENT ON COLUMN search_cache.api_response IS 'Complete API response as received from Scrydex';
COMMENT ON COLUMN search_cache.results IS 'Extracted results array from API response';
COMMENT ON COLUMN cached_cards.raw_pricing IS 'Complete raw pricing object from Scrydex API as JSONB';
COMMENT ON COLUMN cached_cards.graded_pricing IS 'Complete graded pricing object from Scrydex API as JSONB';
COMMENT ON COLUMN cached_cards.raw_trend_1d_percent IS 'Raw pricing 1-day percent change trend';
COMMENT ON COLUMN cached_cards.raw_trend_1d_price IS 'Raw pricing 1-day price change trend';
COMMENT ON COLUMN cached_cards.graded_trend_1d_percent IS 'Graded pricing 1-day percent change trend';
COMMENT ON COLUMN cached_cards.graded_trend_1d_price IS 'Graded pricing 1-day price change trend';
