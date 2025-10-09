-- Update collection views to include Pokemon cards market data
-- This ensures that items linked to Pokemon cards get their market data from the pokemon_cards table

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
    o.buy_retailer_id,
    o.buy_marketplace_id,
    o.buy_notes,
    o.sell_date,
    o.sell_price_cents,
    o.sell_quantity,
    o.sell_location,
    o.sell_retailer_id,
    o.sell_marketplace_id,
    o.sell_fees_cents,
    o.sell_notes,
    o.is_sold,
    o.net_profit_cents,
    o.status,
    o.created_at,
    o.updated_at,
    i.name as item_name,
    i.set_name,
    i.image_url,
    i.item_type,
    i.card_number,
    -- Get market value from Pokemon cards table if linked, otherwise from items table
    COALESCE(pc.raw_market * 100, pc.graded_market * 100, i.market_value_cents, 0) as market_value_cents,
    ROW_NUMBER() OVER (PARTITION BY o.item_id ORDER BY o.created_at) as order_number,
    (o.buy_price_cents * o.buy_quantity) as total_cost_cents
FROM orders o
JOIN items i ON o.item_id = i.id
LEFT JOIN pokemon_cards pc ON i.pokemon_card_id = pc.id
WHERE o.user_id = auth.uid(); -- This ensures user can only see their own orders

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
    COALESCE(pc.raw_market * 100, pc.graded_market * 100, i.market_value_cents, 0) as market_value_cents,
    COUNT(o.id) as total_orders,
    SUM(o.buy_quantity) as total_quantity,
    AVG(o.buy_price_cents) as avg_buy_price_cents
FROM items i
LEFT JOIN pokemon_cards pc ON i.pokemon_card_id = pc.id
JOIN orders o ON i.id = o.item_id
WHERE o.user_id = auth.uid() -- This ensures user can only see their own collection
GROUP BY i.id, i.name, i.set_name, i.image_url, i.item_type, i.card_number, pc.raw_market, pc.graded_market, i.market_value_cents;
