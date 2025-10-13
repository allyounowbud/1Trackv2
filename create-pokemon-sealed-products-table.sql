-- Create dedicated table for Pokemon sealed products from TCGCSV
-- This replaces runtime API calls with a local database of sealed products

-- Drop existing table if it exists
DROP TABLE IF EXISTS pokemon_sealed_products CASCADE;

-- Create the sealed products table
CREATE TABLE pokemon_sealed_products (
    -- TCGCSV identifiers
    product_id BIGINT PRIMARY KEY,
    tcgcsv_group_id INTEGER NOT NULL,
    
    -- Product information
    name TEXT NOT NULL,
    clean_name TEXT,
    image_url TEXT,
    url TEXT,
    
    -- Product classification
    product_type TEXT, -- Will help us identify sealed products
    
    -- Pricing data
    market_price DECIMAL(10,2),
    low_price DECIMAL(10,2),
    mid_price DECIMAL(10,2),
    high_price DECIMAL(10,2),
    direct_low_price DECIMAL(10,2),
    sub_type_name TEXT, -- Normal, Foil, etc.
    
    -- Product metadata
    category_id INTEGER DEFAULT 3, -- Pokemon category
    image_count INTEGER DEFAULT 0,
    modified_on TIMESTAMP,
    
    -- Presale information
    is_presale BOOLEAN DEFAULT FALSE,
    released_on TIMESTAMP,
    presale_note TEXT,
    
    -- Extended data (card text, UPC, etc.)
    extended_data JSONB,
    card_text TEXT, -- Extracted from extended_data for search
    upc TEXT, -- Extracted from extended_data
    
    -- Link to our expansion system
    expansion_id TEXT, -- Our Scrydex expansion ID
    expansion_name TEXT, -- For display
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sealed_products_group_id ON pokemon_sealed_products(tcgcsv_group_id);
CREATE INDEX IF NOT EXISTS idx_sealed_products_expansion_id ON pokemon_sealed_products(expansion_id);
CREATE INDEX IF NOT EXISTS idx_sealed_products_name ON pokemon_sealed_products(name);
CREATE INDEX IF NOT EXISTS idx_sealed_products_market_price ON pokemon_sealed_products(market_price);
CREATE INDEX IF NOT EXISTS idx_sealed_products_modified_on ON pokemon_sealed_products(modified_on);

-- Create full-text search index for product names
CREATE INDEX IF NOT EXISTS idx_sealed_products_name_search ON pokemon_sealed_products USING GIN(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_sealed_products_card_text_search ON pokemon_sealed_products USING GIN(to_tsvector('english', card_text));

-- Add comments to table and columns
COMMENT ON TABLE pokemon_sealed_products IS 'Sealed Pokemon TCG products from TCGCSV - booster boxes, ETBs, tins, etc.';
COMMENT ON COLUMN pokemon_sealed_products.product_id IS 'TCGCSV product ID (primary key)';
COMMENT ON COLUMN pokemon_sealed_products.tcgcsv_group_id IS 'TCGCSV group ID (links to expansion via pokemon_expansions.tcgcsv_group_id)';
COMMENT ON COLUMN pokemon_sealed_products.expansion_id IS 'Our internal expansion ID from pokemon_expansions table';
COMMENT ON COLUMN pokemon_sealed_products.card_text IS 'Product description extracted from extended_data for searching';

-- Create a view that joins with expansions for easier querying
CREATE OR REPLACE VIEW pokemon_sealed_products_with_expansions AS
SELECT 
    psp.*,
    pe.name as expansion_full_name,
    pe.code as expansion_code,
    pe.series as expansion_series,
    pe.release_date as expansion_release_date,
    pe.logo as expansion_logo,
    pe.language_code as expansion_language
FROM pokemon_sealed_products psp
LEFT JOIN pokemon_expansions pe ON psp.expansion_id = pe.id;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pokemon_sealed_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER trigger_update_pokemon_sealed_products_updated_at
    BEFORE UPDATE ON pokemon_sealed_products
    FOR EACH ROW
    EXECUTE FUNCTION update_pokemon_sealed_products_updated_at();

-- Create sync tracking table
CREATE TABLE IF NOT EXISTS pokemon_sealed_products_sync_status (
    id INTEGER PRIMARY KEY DEFAULT 1,
    last_full_sync TIMESTAMP WITH TIME ZONE,
    last_incremental_sync TIMESTAMP WITH TIME ZONE,
    total_products INTEGER DEFAULT 0,
    total_groups_synced INTEGER DEFAULT 0,
    sync_status TEXT DEFAULT 'pending', -- pending, in_progress, completed, failed
    sync_error TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT single_row CHECK (id = 1)
);

-- Initialize sync status
INSERT INTO pokemon_sealed_products_sync_status (id, sync_status) 
VALUES (1, 'pending')
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE pokemon_sealed_products_sync_status IS 'Tracks the status of TCGCSV sealed products sync operations';

-- Log the table creation
DO $$
BEGIN
    RAISE NOTICE '✅ pokemon_sealed_products table created successfully!';
    RAISE NOTICE '📦 Ready to import sealed products from TCGCSV';
    RAISE NOTICE '🔗 Links to pokemon_expansions via tcgcsv_group_id';
END $$;
