-- Fix collection market values by updating views to join with pokemon_cards table
-- This version handles name differences between items and pokemon_cards tables

-- 1. Update individual_orders_clean view to include Pokemon cards market data
DROP VIEW IF EXISTS individual_orders_clean;
CREATE VIEW individual_orders_clean AS
SELECT 
    o.id,
    o.item_id,
    o.user_id,
    o.order_type,
    o.buy_date,
    o.buy_price_cents,
    o.buy_quantity,
    o.buy_location,
    o.buy_marketplace_id,
    o.buy_retailer_id,
    o.buy_notes,
    o.sell_date,
    o.sell_price_cents,
    o.sell_quantity,
    o.sell_location,
    o.sell_marketplace_id,
    o.sell_retailer_id,
    o.sell_notes,
    o.is_sold,
    o.net_profit_cents,
    o.status,
    o.created_at,
    o.updated_at,
    -- Graded card columns
    o.card_type,
    o.graded_company,
    o.graded_grade,
    -- Item details from items table
    i.name as item_name,
    i.set_name,
    i.image_url,
    i.item_type,
    i.card_number,
    -- Get market value from Pokemon cards table if linked, otherwise from items table
    -- Priority: raw_market -> graded_market -> items.market_value_cents -> 0
    COALESCE(
        pc.raw_market * 100, 
        pc.graded_market * 100, 
        i.market_value_cents, 
        0
    ) as market_value_cents,
    ROW_NUMBER() OVER (PARTITION BY o.item_id ORDER BY o.created_at) as order_number,
    (o.buy_price_cents * o.buy_quantity) as total_cost_cents
FROM orders o
JOIN items i ON o.item_id = i.id
LEFT JOIN pokemon_cards pc ON (
    -- Handle name differences: "Leavanny #89" vs "Leavanny"
    (i.name = pc.name) OR 
    (i.name LIKE pc.name || ' #%') OR
    (pc.name = SPLIT_PART(i.name, ' #', 1))
) AND i.set_name = pc.expansion_name
WHERE o.user_id = auth.uid();

-- 2. Update collection_summary_clean view to include Pokemon cards market data
DROP VIEW IF EXISTS collection_summary_clean;
CREATE VIEW collection_summary_clean AS
SELECT 
    i.id as item_id,
    i.name as item_name,
    i.set_name,
    i.image_url,
    i.item_type,
    i.card_number,
    -- Get market value from Pokemon cards table if linked, otherwise from items table
    COALESCE(
        pc.raw_market * 100, 
        pc.graded_market * 100, 
        i.market_value_cents, 
        0
    ) as market_value_cents,
    COUNT(o.id) as total_orders,
    SUM(o.buy_quantity) as total_quantity,
    AVG(o.buy_price_cents) as avg_buy_price_cents,
    SUM(o.buy_price_cents * o.buy_quantity) as total_cost_cents,
    SUM(CASE WHEN o.is_sold = false THEN o.buy_quantity ELSE 0 END) as on_hand_quantity,
    SUM(CASE WHEN o.is_sold = true THEN o.buy_quantity ELSE 0 END) as sold_quantity
FROM items i
JOIN orders o ON i.id = o.item_id
LEFT JOIN pokemon_cards pc ON (
    -- Handle name differences: "Leavanny #89" vs "Leavanny"
    (i.name = pc.name) OR 
    (i.name LIKE pc.name || ' #%') OR
    (pc.name = SPLIT_PART(i.name, ' #', 1))
) AND i.set_name = pc.expansion_name
WHERE o.user_id = auth.uid()
GROUP BY i.id, i.name, i.set_name, i.image_url, i.item_type, i.card_number, 
         COALESCE(pc.raw_market * 100, pc.graded_market * 100, i.market_value_cents, 0);

-- 3. Grant permissions on the views
GRANT SELECT ON individual_orders_clean TO authenticated;
GRANT SELECT ON collection_summary_clean TO authenticated;

-- 4. Test the fix with Leavanny card
SELECT 
    i.id as item_id,
    i.name as item_name,
    i.set_name as item_set,
    pc.name as pokemon_card_name,
    pc.expansion_name as pokemon_card_set,
    pc.raw_market,
    pc.graded_market,
    COALESCE(
        pc.raw_market * 100, 
        pc.graded_market * 100, 
        i.market_value_cents, 
        0
    ) as calculated_market_value_cents
FROM items i
LEFT JOIN pokemon_cards pc ON (
    -- Handle name differences: "Leavanny #89" vs "Leavanny"
    (i.name = pc.name) OR 
    (i.name LIKE pc.name || ' #%') OR
    (pc.name = SPLIT_PART(i.name, ' #', 1))
) AND i.set_name = pc.expansion_name
WHERE i.name ILIKE '%leavanny%' 
   OR i.name ILIKE '%Leavanny%';
