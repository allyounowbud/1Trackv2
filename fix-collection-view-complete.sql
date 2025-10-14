-- Complete fix for collection view to use real market values from pokemon_cards table
-- This addresses both the missing links and market value issues

-- First, let's see what we're working with
SELECT 'Before fix - checking current state' as status;

-- Check orders with missing pokemon_card_id
SELECT 
    COUNT(*) as total_orders,
    COUNT(pokemon_card_id) as orders_with_pokemon_card_id,
    COUNT(item_id) as orders_with_item_id,
    COUNT(CASE WHEN pokemon_card_id IS NULL AND item_id IS NULL THEN 1 END) as orders_with_no_link
FROM orders 
WHERE user_id = auth.uid();

-- Drop and recreate the collection_summary_clean view with proper market value calculation
DROP VIEW IF EXISTS collection_summary_clean;

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
    
    -- FIXED: Market value calculation - use pokemon_cards.market_price converted to cents
    CASE 
        WHEN pc.market_price IS NOT NULL THEN ROUND(pc.market_price * 100)::bigint
        WHEN i.market_value_cents IS NOT NULL THEN i.market_value_cents
        ELSE 0
    END AS market_value_cents,
    
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
    o.user_id,
    -- Group by market value calculation
    pc.market_price,
    i.market_value_cents;

-- Test the fix
SELECT 'After fix - testing results' as status;

SELECT 
    item_name,
    item_type,
    market_value_cents,
    total_quantity,
    source,
    pokemon_card_id,
    item_id
FROM collection_summary_clean 
WHERE item_name LIKE '%3 Pack Blister%' OR item_name LIKE '%Phantasmal%'
LIMIT 5;
