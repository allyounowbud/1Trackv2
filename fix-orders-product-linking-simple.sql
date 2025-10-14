-- Simplified fix for orders table to link directly to product tables
-- This version handles missing tables gracefully and cleans up unused tables

-- First, let's check for and remove any unused tables that might exist
-- (These are commented out for safety - uncomment if you want to remove them)

-- Drop unused tables if they exist (uncomment the ones you want to remove)
-- DROP TABLE IF EXISTS cached_cards CASCADE;
-- DROP TABLE IF EXISTS cached_sealed_products CASCADE;
-- DROP TABLE IF EXISTS search_cache CASCADE;
-- DROP TABLE IF EXISTS sealed_products CASCADE;
-- DROP TABLE IF EXISTS pokemon_sealed_products CASCADE;

-- First, create the missing cached_cards table if it doesn't exist
CREATE TABLE IF NOT EXISTS cached_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_id TEXT NOT NULL UNIQUE,
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
    -- Price data
    market_price DECIMAL(10,2),
    low_price DECIMAL(10,2),
    mid_price DECIMAL(10,2),
    high_price DECIMAL(10,2),
    raw_price DECIMAL(10,2),
    graded_price DECIMAL(10,2),
    -- Metadata
    source TEXT NOT NULL DEFAULT 'api',
    game TEXT NOT NULL DEFAULT 'pokemon',
    search_queries TEXT[],
    last_searched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the missing cached_sealed_products table if it doesn't exist
CREATE TABLE IF NOT EXISTS cached_sealed_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    set_name TEXT,
    expansion_name TEXT,
    expansion_id TEXT,
    product_type TEXT,
    image_url TEXT,
    image_url_large TEXT,
    image_source TEXT,
    -- Price data
    market_price DECIMAL(10,2),
    low_price DECIMAL(10,2),
    mid_price DECIMAL(10,2),
    high_price DECIMAL(10,2),
    -- Metadata
    source TEXT NOT NULL DEFAULT 'api',
    game TEXT NOT NULL DEFAULT 'pokemon',
    search_queries TEXT[],
    last_searched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for the new tables
CREATE INDEX IF NOT EXISTS idx_cached_cards_api_id ON cached_cards(api_id);
CREATE INDEX IF NOT EXISTS idx_cached_cards_name ON cached_cards(name);
CREATE INDEX IF NOT EXISTS idx_cached_cards_expansion_id ON cached_cards(expansion_id);
CREATE INDEX IF NOT EXISTS idx_cached_cards_source ON cached_cards(source);
CREATE INDEX IF NOT EXISTS idx_cached_cards_game ON cached_cards(game);
CREATE INDEX IF NOT EXISTS idx_cached_cards_market_price ON cached_cards(market_price);

CREATE INDEX IF NOT EXISTS idx_cached_sealed_products_api_id ON cached_sealed_products(api_id);
CREATE INDEX IF NOT EXISTS idx_cached_sealed_products_name ON cached_sealed_products(name);
CREATE INDEX IF NOT EXISTS idx_cached_sealed_products_expansion_id ON cached_sealed_products(expansion_id);
CREATE INDEX IF NOT EXISTS idx_cached_sealed_products_source ON cached_sealed_products(source);
CREATE INDEX IF NOT EXISTS idx_cached_sealed_products_game ON cached_sealed_products(game);
CREATE INDEX IF NOT EXISTS idx_cached_sealed_products_market_price ON cached_sealed_products(market_price);

-- Now add the foreign key columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pokemon_card_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cached_card_id UUID;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cached_sealed_product_id UUID;

-- Add foreign key constraints (only if the referenced tables exist)
DO $$
BEGIN
    -- Add foreign key to pokemon_cards if the table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pokemon_cards') THEN
        ALTER TABLE orders ADD CONSTRAINT IF NOT EXISTS fk_orders_pokemon_card_id 
        FOREIGN KEY (pokemon_card_id) REFERENCES pokemon_cards(id);
    END IF;
    
    -- Add foreign key to cached_cards
    ALTER TABLE orders ADD CONSTRAINT IF NOT EXISTS fk_orders_cached_card_id 
    FOREIGN KEY (cached_card_id) REFERENCES cached_cards(id);
    
    -- Add foreign key to cached_sealed_products
    ALTER TABLE orders ADD CONSTRAINT IF NOT EXISTS fk_orders_cached_sealed_product_id 
    FOREIGN KEY (cached_sealed_product_id) REFERENCES cached_sealed_products(id);
END $$;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_pokemon_card_id ON orders(pokemon_card_id);
CREATE INDEX IF NOT EXISTS idx_orders_cached_card_id ON orders(cached_card_id);
CREATE INDEX IF NOT EXISTS idx_orders_cached_sealed_product_id ON orders(cached_sealed_product_id);

-- Update existing orders to link to pokemon_cards table where possible
UPDATE orders 
SET pokemon_card_id = api_card_id 
WHERE api_card_id IS NOT NULL 
  AND pokemon_card_id IS NULL
  AND EXISTS (SELECT 1 FROM pokemon_cards WHERE id = api_card_id);

-- Update the individual_orders_clean view to use the new product links
DROP VIEW IF EXISTS individual_orders_clean;

CREATE OR REPLACE VIEW individual_orders_clean AS
SELECT
    o.id,
    o.user_id,
    o.item_id,
    o.order_number,
    o.order_group_id,
    
    -- Product information from linked tables (with fallbacks)
    COALESCE(
        pc.name,
        cc.name,
        csp.name,
        o.api_card_name,
        i.item_name,
        'Unknown Item'
    ) AS item_name,
    
    COALESCE(
        pc.expansion_name,
        cc.expansion_name,
        csp.expansion_name,
        o.api_card_set,
        i.set_name,
        'Unknown Set'
    ) AS set_name,
    
    COALESCE(
        pc.image_url,
        cc.image_url,
        csp.image_url,
        o.api_card_image_url,
        i.image_url,
        '/icons/other.png'
    ) AS image_url,
    
    -- Market value from linked product tables (prioritize current market data)
    COALESCE(
        CASE WHEN pc.market_price IS NOT NULL THEN (pc.market_price * 100)::INTEGER ELSE NULL END,
        CASE WHEN pc.low_price IS NOT NULL THEN (pc.low_price * 100)::INTEGER ELSE NULL END,
        CASE WHEN pc.mid_price IS NOT NULL THEN (pc.mid_price * 100)::INTEGER ELSE NULL END,
        CASE WHEN pc.high_price IS NOT NULL THEN (pc.high_price * 100)::INTEGER ELSE NULL END,
        CASE WHEN cc.market_price IS NOT NULL THEN (cc.market_price * 100)::INTEGER ELSE NULL END,
        CASE WHEN cc.low_price IS NOT NULL THEN (cc.low_price * 100)::INTEGER ELSE NULL END,
        CASE WHEN cc.mid_price IS NOT NULL THEN (cc.mid_price * 100)::INTEGER ELSE NULL END,
        CASE WHEN cc.high_price IS NOT NULL THEN (cc.high_price * 100)::INTEGER ELSE NULL END,
        CASE WHEN csp.market_price IS NOT NULL THEN (csp.market_price * 100)::INTEGER ELSE NULL END,
        CASE WHEN csp.low_price IS NOT NULL THEN (csp.low_price * 100)::INTEGER ELSE NULL END,
        CASE WHEN csp.mid_price IS NOT NULL THEN (csp.mid_price * 100)::INTEGER ELSE NULL END,
        CASE WHEN csp.high_price IS NOT NULL THEN (csp.high_price * 100)::INTEGER ELSE NULL END,
        o.api_card_market_value_cents,
        i.market_value_cents,
        0
    ) AS market_value_cents,
    
    -- Order details
    o.purchase_date,
    o.price_per_item_cents,
    o.quantity,
    o.total_cost_cents,
    o.retailer_name,
    o.notes,
    o.is_sold,
    o.sell_date,
    o.sell_price_cents,
    o.sell_quantity,
    o.sell_fees_cents,
    o.net_profit_cents,
    o.created_at,
    o.updated_at,
    
    -- Item classification
    o.item_type,
    o.card_condition,
    o.grading_company,
    o.grading_grade,
    
    -- Source information
    CASE 
        WHEN o.pokemon_card_id IS NOT NULL THEN 'pokemon_cards'
        WHEN o.cached_card_id IS NOT NULL THEN 'cached_cards'
        WHEN o.cached_sealed_product_id IS NOT NULL THEN 'cached_sealed_products'
        WHEN o.item_id IS NOT NULL THEN 'manual'
        ELSE 'unknown'
    END AS source

FROM orders o
LEFT JOIN pokemon_cards pc ON o.pokemon_card_id = pc.id
LEFT JOIN cached_cards cc ON o.cached_card_id = cc.id
LEFT JOIN cached_sealed_products csp ON o.cached_sealed_product_id = csp.id
LEFT JOIN items i ON o.item_id = i.id;

-- Update the collection_summary_clean view
DROP VIEW IF EXISTS collection_summary_clean;

CREATE OR REPLACE VIEW collection_summary_clean AS
SELECT
    user_id,
    
    -- Item identification
    COALESCE(
        pc.name,
        cc.name,
        csp.name,
        o.api_card_name,
        i.item_name,
        'Unknown Item'
    ) AS item_name,
    
    COALESCE(
        pc.expansion_name,
        cc.expansion_name,
        csp.expansion_name,
        o.api_card_set,
        i.set_name,
        'Unknown Set'
    ) AS set_name,
    
    COALESCE(
        pc.image_url,
        cc.image_url,
        csp.image_url,
        o.api_card_image_url,
        i.image_url,
        '/icons/other.png'
    ) AS image_url,
    
    -- Item classification
    o.item_type,
    o.card_condition,
    o.grading_company,
    o.grading_grade,
    
    -- Collection data
    o.order_group_id,
    o.item_id,
    o.pokemon_card_id,
    o.cached_card_id,
    o.cached_sealed_product_id,
    
    -- Aggregated data
    SUM(o.quantity) AS total_quantity,
    AVG(o.price_per_item_cents) AS avg_price_cents,
    MAX(
        COALESCE(
            CASE WHEN pc.market_price IS NOT NULL THEN (pc.market_price * 100)::INTEGER ELSE NULL END,
            CASE WHEN pc.low_price IS NOT NULL THEN (pc.low_price * 100)::INTEGER ELSE NULL END,
            CASE WHEN pc.mid_price IS NOT NULL THEN (pc.mid_price * 100)::INTEGER ELSE NULL END,
            CASE WHEN pc.high_price IS NOT NULL THEN (pc.high_price * 100)::INTEGER ELSE NULL END,
            CASE WHEN cc.market_price IS NOT NULL THEN (cc.market_price * 100)::INTEGER ELSE NULL END,
            CASE WHEN cc.low_price IS NOT NULL THEN (cc.low_price * 100)::INTEGER ELSE NULL END,
            CASE WHEN cc.mid_price IS NOT NULL THEN (cc.mid_price * 100)::INTEGER ELSE NULL END,
            CASE WHEN cc.high_price IS NOT NULL THEN (cc.high_price * 100)::INTEGER ELSE NULL END,
            CASE WHEN csp.market_price IS NOT NULL THEN (csp.market_price * 100)::INTEGER ELSE NULL END,
            CASE WHEN csp.low_price IS NOT NULL THEN (csp.low_price * 100)::INTEGER ELSE NULL END,
            CASE WHEN csp.mid_price IS NOT NULL THEN (csp.mid_price * 100)::INTEGER ELSE NULL END,
            CASE WHEN csp.high_price IS NOT NULL THEN (csp.high_price * 100)::INTEGER ELSE NULL END,
            o.api_card_market_value_cents,
            i.market_value_cents,
            0
        )
    ) AS market_value_cents,
    MAX(o.purchase_date) AS latest_order_date,
    COUNT(*) AS order_count

FROM orders o
LEFT JOIN pokemon_cards pc ON o.pokemon_card_id = pc.id
LEFT JOIN cached_cards cc ON o.cached_card_id = cc.id
LEFT JOIN cached_sealed_products csp ON o.cached_sealed_product_id = csp.id
LEFT JOIN items i ON o.item_id = i.id
WHERE o.user_id = auth.uid()
GROUP BY
    -- Group by item identification
    COALESCE(
        pc.name,
        cc.name,
        csp.name,
        o.api_card_name,
        i.item_name,
        'Unknown Item'
    ),
    COALESCE(
        pc.expansion_name,
        cc.expansion_name,
        csp.expansion_name,
        o.api_card_set,
        i.set_name,
        'Unknown Set'
    ),
    COALESCE(
        pc.image_url,
        cc.image_url,
        csp.image_url,
        o.api_card_image_url,
        i.image_url,
        '/icons/other.png'
    ),
    -- Group by classification fields
    o.item_type,
    o.card_condition,
    o.grading_company,
    o.grading_grade,
    -- Group by order group and item references
    o.order_group_id,
    o.item_id,
    o.pokemon_card_id,
    o.cached_card_id,
    o.cached_sealed_product_id,
    user_id;

-- Add comments for documentation
COMMENT ON COLUMN orders.pokemon_card_id IS 'Foreign key to pokemon_cards table for direct product linking';
COMMENT ON COLUMN orders.cached_card_id IS 'Foreign key to cached_cards table for API-sourced cards';
COMMENT ON COLUMN orders.cached_sealed_product_id IS 'Foreign key to cached_sealed_products table for sealed products';
COMMENT ON VIEW individual_orders_clean IS 'Clean view of orders with product data from linked tables';
COMMENT ON VIEW collection_summary_clean IS 'Collection summary with real-time market data from linked product tables';
