-- Fix orders table to link directly to product tables instead of duplicating data
-- This will improve performance and data consistency

-- First, add new foreign key columns to link to product tables
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pokemon_card_id TEXT REFERENCES pokemon_cards(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cached_card_id UUID REFERENCES cached_cards(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cached_sealed_product_id UUID REFERENCES cached_sealed_products(id);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_pokemon_card_id ON orders(pokemon_card_id);
CREATE INDEX IF NOT EXISTS idx_orders_cached_card_id ON orders(cached_card_id);
CREATE INDEX IF NOT EXISTS idx_orders_cached_sealed_product_id ON orders(cached_sealed_product_id);

-- Create a function to determine the appropriate product table ID based on existing data
CREATE OR REPLACE FUNCTION migrate_orders_to_product_links()
RETURNS void AS $$
DECLARE
    order_record RECORD;
    product_id TEXT;
BEGIN
    -- Loop through all existing orders
    FOR order_record IN SELECT * FROM orders LOOP
        -- Try to find the product in pokemon_cards first
        IF order_record.api_card_id IS NOT NULL THEN
            -- Look for exact match in pokemon_cards
            SELECT id INTO product_id 
            FROM pokemon_cards 
            WHERE id = order_record.api_card_id;
            
            IF product_id IS NOT NULL THEN
                -- Update the order to link to pokemon_cards
                UPDATE orders 
                SET pokemon_card_id = product_id
                WHERE id = order_record.id;
                CONTINUE;
            END IF;
            
            -- If not found in pokemon_cards, try cached_cards
            SELECT id INTO product_id 
            FROM cached_cards 
            WHERE api_id = order_record.api_card_id;
            
            IF product_id IS NOT NULL THEN
                -- Update the order to link to cached_cards
                UPDATE orders 
                SET cached_card_id = product_id::UUID
                WHERE id = order_record.id;
                CONTINUE;
            END IF;
            
            -- If not found in cached_cards, try cached_sealed_products
            SELECT id INTO product_id 
            FROM cached_sealed_products 
            WHERE api_id = order_record.api_card_id;
            
            IF product_id IS NOT NULL THEN
                -- Update the order to link to cached_sealed_products
                UPDATE orders 
                SET cached_sealed_product_id = product_id::UUID
                WHERE id = order_record.id;
                CONTINUE;
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run the migration function
SELECT migrate_orders_to_product_links();

-- Drop the migration function as it's no longer needed
DROP FUNCTION migrate_orders_to_product_links();

-- Update the individual_orders_clean view to use the new product links
DROP VIEW IF EXISTS individual_orders_clean;

CREATE OR REPLACE VIEW individual_orders_clean AS
SELECT
    o.id,
    o.user_id,
    o.item_id,
    o.order_number,
    o.order_group_id,
    
    -- Product information from linked tables
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
        COALESCE(pc.market_price, pc.low_price, pc.mid_price, pc.high_price) * 100,
        COALESCE(cc.market_price, cc.low_price, cc.mid_price, cc.high_price) * 100,
        COALESCE(csp.market_price, csp.low_price, csp.mid_price, csp.high_price) * 100,
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

-- Update the collection_summary_clean view to use the new product links
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
            COALESCE(pc.market_price, pc.low_price, pc.mid_price, pc.high_price) * 100,
            COALESCE(cc.market_price, cc.low_price, cc.mid_price, cc.high_price) * 100,
            COALESCE(csp.market_price, csp.low_price, csp.mid_price, csp.high_price) * 100,
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
