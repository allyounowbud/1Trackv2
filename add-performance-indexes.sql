-- Performance Optimization: Add composite indexes for common query patterns
-- This dramatically improves query performance for expansion views and sorted results

-- Composite index for expansion queries with number sorting (most common)
CREATE INDEX IF NOT EXISTS idx_pokemon_cards_expansion_number 
ON pokemon_cards(expansion_id, number);

-- Composite index for expansion queries with raw price sorting
CREATE INDEX IF NOT EXISTS idx_pokemon_cards_expansion_raw_market 
ON pokemon_cards(expansion_id, raw_market) 
WHERE raw_market IS NOT NULL;

-- Composite index for expansion queries with graded price sorting
CREATE INDEX IF NOT EXISTS idx_pokemon_cards_expansion_graded_market 
ON pokemon_cards(expansion_id, graded_market) 
WHERE graded_market IS NOT NULL;

-- Composite index for expansion queries with name sorting
CREATE INDEX IF NOT EXISTS idx_pokemon_cards_expansion_name 
ON pokemon_cards(expansion_id, name);

-- Composite index for expansion queries with rarity filtering
CREATE INDEX IF NOT EXISTS idx_pokemon_cards_expansion_rarity 
ON pokemon_cards(expansion_id, rarity);

-- Index for natural sorting of card numbers (helps with proper numeric sorting)
-- This helps PostgreSQL sort "1", "2", "10" correctly instead of "1", "10", "2"
CREATE INDEX IF NOT EXISTS idx_pokemon_cards_number_natural 
ON pokemon_cards(LPAD(number, 10, '0'));

-- Composite index for expansion + numeric number sorting
CREATE INDEX IF NOT EXISTS idx_pokemon_cards_expansion_number_numeric 
ON pokemon_cards(expansion_id, LPAD(number, 10, '0'));

-- Alternative: Index for alphanumeric card numbers (handles cases like "SV030")
-- This extracts numeric part and pads it for proper sorting
CREATE INDEX IF NOT EXISTS idx_pokemon_cards_number_alphanumeric 
ON pokemon_cards(LPAD(REGEXP_REPLACE(number, '[^0-9]', '', 'g'), 10, '0'));

-- Composite index for search queries with filters
CREATE INDEX IF NOT EXISTS idx_pokemon_cards_name_expansion 
ON pokemon_cards(name, expansion_id);

-- Index for artist searches (commonly filtered)
CREATE INDEX IF NOT EXISTS idx_pokemon_cards_artist 
ON pokemon_cards(artist) 
WHERE artist IS NOT NULL;

-- Index for supertype filtering in expansion views
CREATE INDEX IF NOT EXISTS idx_pokemon_cards_expansion_supertype 
ON pokemon_cards(expansion_id, supertype);

-- Composite index for sealed products by expansion and pricing
CREATE INDEX IF NOT EXISTS idx_sealed_products_expansion_price 
ON sealed_products(expansion_id, pricing_market) 
WHERE pricing_market IS NOT NULL;

-- Composite index for sealed products name search
CREATE INDEX IF NOT EXISTS idx_sealed_products_name_expansion 
ON sealed_products(name, expansion_id);

-- Note: ANALYZE is run automatically by PostgreSQL after index creation
-- If you want to manually update statistics, run these separately (outside transaction):
-- ANALYZE pokemon_cards;
-- ANALYZE pokemon_expansions;
-- ANALYZE sealed_products;

