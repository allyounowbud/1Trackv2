-- SAFE version - Recreate all views with only columns that definitely exist
-- This version makes minimal assumptions about which columns exist

-- Step 1: Drop all views if they exist (CASCADE to handle dependencies)
DROP VIEW IF EXISTS orders_fully_sold CASCADE;
DROP VIEW IF EXISTS orders_partially_sold CASCADE;
DROP VIEW IF EXISTS orders_sold CASCADE;
DROP VIEW IF EXISTS orders_on_hand CASCADE;
DROP VIEW IF EXISTS individual_orders_clean CASCADE;
DROP VIEW IF EXISTS collection_summary_clean CASCADE;

-- Step 2: Create individual_orders_clean view (SAFE VERSION)
-- Only includes columns we're certain exist
CREATE OR REPLACE VIEW individual_orders_clean AS
SELECT
    o.id,
    o.user_id,
    o.order_group_id,
    o.order_number,
    o.item_id,
    o.pokemon_card_id,
    o.product_source,

    -- Item identification
    COALESCE(pc.name, i.item_name, 'Unknown Item') AS item_name,
    COALESCE(pc.expansion_name, i.set_name, 'Unknown Set') AS set_name,
    COALESCE(pc.image_url, i.image_url, '/icons/other.png') AS image_url,

    -- Market value
    COALESCE(
        pc.market_price * 100,
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
    
    -- Sale information (with safe defaults)
    o.sale_date,
    COALESCE(o.quantity_sold, 0) AS quantity_sold,
    o.sale_price_per_item_cents,
    o.sale_total_cents,
    o.sale_fees_cents,
    o.sale_net_cents,
    
    -- Calculate net profit on the fly
    CASE 
        WHEN COALESCE(o.quantity_sold, 0) > 0 AND o.sale_net_cents IS NOT NULL THEN
            o.sale_net_cents - (o.price_per_item_cents * COALESCE(o.quantity_sold, 0))
        ELSE 
            NULL
    END AS net_profit_cents,
    
    -- Computed sale status fields
    COALESCE(o.quantity_sold, 0) AS sold_count,
    o.quantity - COALESCE(o.quantity_sold, 0) AS remaining_count,
    
    -- Sale status indicators
    CASE 
        WHEN COALESCE(o.quantity_sold, 0) = 0 THEN 'on_hand'
        WHEN COALESCE(o.quantity_sold, 0) >= o.quantity THEN 'fully_sold'
        ELSE 'partially_sold'
    END AS sale_status,
    
    -- Timestamps
    o.created_at,
    o.updated_at,
    
    -- Item classification
    o.item_type,
    o.card_condition,
    o.grading_company,
    o.grading_grade,

    -- Source
    CASE
        WHEN o.item_id IS NOT NULL THEN 'manual'
        WHEN o.pokemon_card_id IS NOT NULL THEN 'pokemon'
        ELSE 'unknown'
    END AS source

FROM orders o
LEFT JOIN items i ON o.item_id = i.id
LEFT JOIN pokemon_cards pc ON o.pokemon_card_id = pc.id
WHERE o.user_id = auth.uid();

-- Step 3: Create collection_summary_clean view (SAFE VERSION)
CREATE OR REPLACE VIEW collection_summary_clean AS
SELECT
    o.user_id,
    
    -- Item identification
    COALESCE(pc.name, i.item_name, 'Unknown Item') AS item_name,
    COALESCE(pc.expansion_name, i.set_name, 'Unknown Set') AS set_name,
    COALESCE(pc.image_url, i.image_url, '/icons/other.png') AS image_url,
    
    -- Item classification
    o.item_type,
    o.card_condition,
    o.grading_company,
    o.grading_grade,

    -- Collection data (only count remaining items, not sold)
    o.order_group_id,
    o.item_id,
    o.pokemon_card_id,
    SUM(o.quantity - COALESCE(o.quantity_sold, 0)) AS total_quantity,
    AVG(o.price_per_item_cents) AS avg_price_cents,
    
    -- Market value
    COALESCE(
        MAX(pc.market_price) * 100,
        MAX(i.market_value_cents),
        0
    ) AS market_value_cents,
    
    MAX(o.purchase_date) AS latest_order_date,
    COUNT(*) AS order_count,
    
    -- Source
    CASE
        WHEN o.item_id IS NOT NULL THEN 'manual'
        WHEN o.pokemon_card_id IS NOT NULL THEN 'pokemon'
        ELSE 'unknown'
    END AS source

FROM orders o
LEFT JOIN items i ON o.item_id = i.id
LEFT JOIN pokemon_cards pc ON o.pokemon_card_id = pc.id
WHERE o.user_id = auth.uid()
AND (o.quantity - COALESCE(o.quantity_sold, 0)) > 0  -- Only include orders with remaining items
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

-- Step 4: Create convenience views
CREATE OR REPLACE VIEW orders_on_hand AS
SELECT * FROM individual_orders_clean
WHERE remaining_count > 0;

CREATE OR REPLACE VIEW orders_sold AS
SELECT * FROM individual_orders_clean
WHERE sold_count > 0;

CREATE OR REPLACE VIEW orders_partially_sold AS
SELECT * FROM individual_orders_clean
WHERE sold_count > 0 AND remaining_count > 0;

CREATE OR REPLACE VIEW orders_fully_sold AS
SELECT * FROM individual_orders_clean
WHERE remaining_count = 0 AND sold_count > 0;

-- Step 5: Grant permissions (CRITICAL for REST API access)
GRANT SELECT ON individual_orders_clean TO authenticated, anon;
GRANT SELECT ON collection_summary_clean TO authenticated, anon;
GRANT SELECT ON orders_on_hand TO authenticated, anon;
GRANT SELECT ON orders_sold TO authenticated, anon;
GRANT SELECT ON orders_partially_sold TO authenticated, anon;
GRANT SELECT ON orders_fully_sold TO authenticated, anon;

-- Step 6: Verify views were created
SELECT 
    'Views created successfully!' as status,
    COUNT(*) FILTER (WHERE table_name = 'individual_orders_clean') as individual_orders_clean,
    COUNT(*) FILTER (WHERE table_name = 'collection_summary_clean') as collection_summary_clean,
    COUNT(*) FILTER (WHERE table_name = 'orders_on_hand') as orders_on_hand,
    COUNT(*) FILTER (WHERE table_name = 'orders_sold') as orders_sold
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name IN ('individual_orders_clean', 'collection_summary_clean', 'orders_on_hand', 'orders_sold');

