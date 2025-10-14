-- Clean up orders table by removing redundant product data
-- Now that orders link directly to product tables, we don't need to duplicate product info

-- First, make sure all orders are properly linked
-- This will help identify any orders that still need the old data
SELECT 
    COUNT(*) as total_orders,
    COUNT(pokemon_card_id) as linked_to_pokemon,
    COUNT(item_id) as linked_to_custom_items,
    COUNT(CASE WHEN pokemon_card_id IS NULL AND item_id IS NULL THEN 1 END) as unlinked_orders
FROM orders;

-- Step 1: Drop the views first (they depend on the columns we want to remove)
DROP VIEW IF EXISTS individual_orders_clean;
DROP VIEW IF EXISTS collection_summary_clean;

-- Step 2: Drop the redundant API card data columns
-- These are no longer needed since we're linking directly to product tables
ALTER TABLE orders DROP COLUMN IF EXISTS api_card_id;
ALTER TABLE orders DROP COLUMN IF EXISTS api_card_name;
ALTER TABLE orders DROP COLUMN IF EXISTS api_card_set;
ALTER TABLE orders DROP COLUMN IF EXISTS api_card_image_url;
ALTER TABLE orders DROP COLUMN IF EXISTS api_card_market_value_cents;

-- Step 3: Recreate the individual_orders_clean view (clean, without duplicate data)
-- Market value should be fetched in real-time from the product tables when needed
CREATE OR REPLACE VIEW individual_orders_clean AS
SELECT
    o.id,
    o.user_id,
    o.order_group_id,
    o.order_number,
    o.item_id, -- For custom items
    o.pokemon_card_id, -- Link to pokemon_cards
    o.product_source, -- Source of the product (e.g., 'pokemon', 'custom')

    -- Item identification (from linked tables only)
    COALESCE(pc.name, i.item_name, 'Unknown Item') AS item_name,
    COALESCE(pc.expansion_name, i.set_name, 'Unknown Set') AS set_name,
    COALESCE(pc.image_url, i.image_url, '/icons/other.png') AS image_url,

    -- Market value (fetched from linked product tables in real-time)
    COALESCE(
        pc.market_price * 100, -- Convert to cents
        i.market_value_cents,
        0
    ) AS market_value_cents,
    
    -- Order details (purchase information)
    o.purchase_date,
    o.price_per_item_cents,
    o.quantity,
    o.total_cost_cents,
    o.retailer_id,
    o.marketplace_id,
    o.retailer_name,
    o.notes,
    
    -- Sale information
    o.is_sold,
    o.sale_date,
    o.quantity_sold,
    o.sale_retailer_id,
    o.sale_marketplace_id,
    o.sale_retailer_name,
    o.sale_price_per_item_cents,
    o.sale_total_cents,
    o.sale_fees_cents,
    o.sale_shipping_cents,
    o.sale_net_cents,
    
    -- Timestamps
    o.created_at,
    o.updated_at,
    
    -- Item classification
    o.item_type,
    o.card_condition,
    o.grading_company,
    o.grading_grade,

    -- Source of the item (for filtering/display)
    CASE
        WHEN o.item_id IS NOT NULL THEN 'manual'
        WHEN o.pokemon_card_id IS NOT NULL THEN 'pokemon'
        ELSE 'unknown'
    END AS source

FROM orders o
LEFT JOIN items i ON o.item_id = i.id
LEFT JOIN pokemon_cards pc ON o.pokemon_card_id = pc.id;

-- Step 4: Recreate the collection_summary_clean view
CREATE OR REPLACE VIEW collection_summary_clean AS
SELECT
    o.user_id,
    
    -- Item identification (from linked tables only)
    COALESCE(pc.name, i.item_name, 'Unknown Item') AS item_name,
    COALESCE(pc.expansion_name, i.set_name, 'Unknown Set') AS set_name,
    COALESCE(pc.image_url, i.image_url, '/icons/other.png') AS image_url,
    
    -- Item classification
    o.item_type,
    o.card_condition,
    o.grading_company,
    o.grading_grade,

    -- Collection data
    o.order_group_id,
    o.item_id,
    o.pokemon_card_id,
    SUM(o.quantity) AS total_quantity,
    AVG(o.price_per_item_cents) AS avg_price_cents,
    
    -- Market value (fetched from linked product tables in real-time)
    COALESCE(
        MAX(pc.market_price) * 100, -- Convert to cents
        MAX(i.market_value_cents),
        0
    ) AS market_value_cents,
    
    MAX(o.purchase_date) AS latest_order_date,
    COUNT(*) AS order_count,
    
    -- Source of the item (for filtering/display)
    CASE
        WHEN o.item_id IS NOT NULL THEN 'manual'
        WHEN o.pokemon_card_id IS NOT NULL THEN 'pokemon'
        ELSE 'unknown'
    END AS source

FROM orders o
LEFT JOIN items i ON o.item_id = i.id
LEFT JOIN pokemon_cards pc ON o.pokemon_card_id = pc.id
WHERE o.user_id = auth.uid()
GROUP BY
    -- Group by item identification
    COALESCE(pc.name, i.item_name, 'Unknown Item'),
    COALESCE(pc.expansion_name, i.set_name, 'Unknown Set'),
    COALESCE(pc.image_url, i.image_url, '/icons/other.png'),
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

-- Add helpful comments
COMMENT ON TABLE orders IS 'Order tracking table - stores only order-specific data, links to product tables for item details';
COMMENT ON COLUMN orders.pokemon_card_id IS 'Foreign key to pokemon_cards table - fetch real-time market data from there';
COMMENT ON COLUMN orders.item_id IS 'Foreign key to items table for custom items - fetch market data from there';

-- Summary of changes
SELECT 
    'Cleanup completed! Orders table now only stores order-specific data.' as status,
    'Product details and market values are fetched in real-time from linked tables.' as note;

