-- Optimized migration for orders table to link directly to existing product tables
-- This works with your current table structure

-- Add foreign key columns to orders table to link to pokemon_cards
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pokemon_card_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_source TEXT DEFAULT 'unknown';

-- Add foreign key constraint to pokemon_cards (with error handling)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pokemon_cards') THEN
        BEGIN
            ALTER TABLE orders ADD CONSTRAINT fk_orders_pokemon_card_id 
            FOREIGN KEY (pokemon_card_id) REFERENCES pokemon_cards(id);
        EXCEPTION
            WHEN duplicate_object THEN
                -- Constraint already exists, ignore the error
                NULL;
        END;
    END IF;
END $$;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_pokemon_card_id ON orders(pokemon_card_id);
CREATE INDEX IF NOT EXISTS idx_orders_product_source ON orders(product_source);

-- Update existing orders to link to pokemon_cards table where possible
UPDATE orders 
SET 
    pokemon_card_id = api_card_id,
    product_source = 'pokemon_cards'
WHERE api_card_id IS NOT NULL 
  AND pokemon_card_id IS NULL
  AND EXISTS (SELECT 1 FROM pokemon_cards WHERE id = api_card_id);

-- Update orders that don't have pokemon_card matches to use custom items
UPDATE orders 
SET product_source = 'custom'
WHERE pokemon_card_id IS NULL 
  AND item_id IS NOT NULL;

-- Update orders that still have api_card_id but no pokemon_card match
UPDATE orders 
SET product_source = 'api_legacy'
WHERE pokemon_card_id IS NULL 
  AND api_card_id IS NOT NULL 
  AND item_id IS NULL;

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
        o.api_card_name,
        i.item_name,
        'Unknown Item'
    ) AS item_name,
    
    COALESCE(
        pc.expansion_name,
        o.api_card_set,
        i.set_name,
        'Unknown Set'
    ) AS set_name,
    
    COALESCE(
        pc.image_url,
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
           o.sale_date,
           o.sale_price_per_item_cents,
           o.quantity_sold,
           o.sale_fees_cents,
           o.sale_net_cents,
    o.created_at,
    o.updated_at,
    
    -- Item classification
    o.item_type,
    o.card_condition,
    o.grading_company,
    o.grading_grade,
    
    -- Product linking information
    o.pokemon_card_id,
    o.product_source,
    
    -- Source information (simplified)
    CASE 
        WHEN o.pokemon_card_id IS NOT NULL THEN 'pokemon_cards'
        WHEN o.item_id IS NOT NULL THEN 'custom'
        ELSE 'api_legacy'
    END AS source

FROM orders o
LEFT JOIN pokemon_cards pc ON o.pokemon_card_id = pc.id
LEFT JOIN items i ON o.item_id = i.id;

-- Update the collection_summary_clean view
DROP VIEW IF EXISTS collection_summary_clean;

CREATE OR REPLACE VIEW collection_summary_clean AS
SELECT
    o.user_id,
    
    -- Item identification
    COALESCE(
        pc.name,
        o.api_card_name,
        i.item_name,
        'Unknown Item'
    ) AS item_name,
    
    COALESCE(
        pc.expansion_name,
        o.api_card_set,
        i.set_name,
        'Unknown Set'
    ) AS set_name,
    
    COALESCE(
        pc.image_url,
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
    
    -- Aggregated data
    SUM(o.quantity) AS total_quantity,
    AVG(o.price_per_item_cents) AS avg_price_cents,
    MAX(
        COALESCE(
            CASE WHEN pc.market_price IS NOT NULL THEN (pc.market_price * 100)::INTEGER ELSE NULL END,
            CASE WHEN pc.low_price IS NOT NULL THEN (pc.low_price * 100)::INTEGER ELSE NULL END,
            CASE WHEN pc.mid_price IS NOT NULL THEN (pc.mid_price * 100)::INTEGER ELSE NULL END,
            CASE WHEN pc.high_price IS NOT NULL THEN (pc.high_price * 100)::INTEGER ELSE NULL END,
            o.api_card_market_value_cents,
            i.market_value_cents,
            0
        )
    ) AS market_value_cents,
    MAX(o.purchase_date) AS latest_order_date,
    COUNT(*) AS order_count

FROM orders o
LEFT JOIN pokemon_cards pc ON o.pokemon_card_id = pc.id
LEFT JOIN items i ON o.item_id = i.id
WHERE o.user_id = auth.uid()
GROUP BY
    -- Group by item identification
    COALESCE(
        pc.name,
        o.api_card_name,
        i.item_name,
        'Unknown Item'
    ),
    COALESCE(
        pc.expansion_name,
        o.api_card_set,
        i.set_name,
        'Unknown Set'
    ),
    COALESCE(
        pc.image_url,
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
    o.user_id;

-- Optional: Clean up old API card fields after migration (uncomment if you want to remove them)
-- ALTER TABLE orders DROP COLUMN IF EXISTS api_card_id;
-- ALTER TABLE orders DROP COLUMN IF EXISTS api_card_name;
-- ALTER TABLE orders DROP COLUMN IF EXISTS api_card_set;
-- ALTER TABLE orders DROP COLUMN IF EXISTS api_card_image_url;
-- ALTER TABLE orders DROP COLUMN IF EXISTS api_card_market_value_cents;

-- Add comments for documentation
COMMENT ON COLUMN orders.pokemon_card_id IS 'Foreign key to pokemon_cards table for direct product linking';
COMMENT ON COLUMN orders.product_source IS 'Indicates the source of the product data (pokemon_cards, custom, api_legacy)';
COMMENT ON VIEW individual_orders_clean IS 'Clean view of orders with product data from linked tables';
COMMENT ON VIEW collection_summary_clean IS 'Collection summary with real-time market data from pokemon_cards table';

-- Show summary of the migration
SELECT 
    'Migration completed successfully!' as status,
    COUNT(*) as total_orders,
    COUNT(pokemon_card_id) as linked_to_pokemon_cards,
    COUNT(item_id) as custom_items,
    COUNT(*) - COUNT(pokemon_card_id) - COUNT(item_id) as api_legacy_items
FROM orders;
