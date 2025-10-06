-- Fix price display issue by updating the database views
-- Copy and paste this into your Supabase SQL Editor

-- 1. Update individual_orders_clean view to include total_cost_cents
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
    i.name as item_name,
    i.set_name,
    i.image_url,
    i.market_value_cents,
    i.item_type,
    i.card_number,
    ROW_NUMBER() OVER (PARTITION BY o.item_id ORDER BY o.created_at) as order_number,
    (o.buy_price_cents * o.buy_quantity) as total_cost_cents
FROM orders o
JOIN items i ON o.item_id = i.id
WHERE o.user_id = auth.uid();

-- 2. Update collection_summary_clean view to include total_cost_cents
DROP VIEW IF EXISTS collection_summary_clean;
CREATE VIEW collection_summary_clean AS
SELECT 
    i.id as item_id,
    i.name as item_name,
    i.set_name,
    i.image_url,
    i.market_value_cents,
    i.item_type,
    i.card_number,
    COUNT(o.id) as total_orders,
    SUM(o.buy_quantity) as total_quantity,
    AVG(o.buy_price_cents) as avg_buy_price_cents,
    SUM(o.buy_price_cents * o.buy_quantity) as total_cost_cents,
    SUM(CASE WHEN o.is_sold = false THEN o.buy_quantity ELSE 0 END) as on_hand_quantity,
    SUM(CASE WHEN o.is_sold = true THEN o.buy_quantity ELSE 0 END) as sold_quantity
FROM items i
JOIN orders o ON i.id = o.item_id
WHERE o.user_id = auth.uid()
GROUP BY i.id, i.name, i.set_name, i.image_url, i.market_value_cents, i.item_type, i.card_number;

-- 3. Grant permissions
GRANT SELECT ON individual_orders_clean TO authenticated;
GRANT SELECT ON collection_summary_clean TO authenticated;

-- 4. Test the fix - this should show your order with the correct total_cost_cents
SELECT 
    item_name,
    buy_price_cents,
    buy_quantity,
    total_cost_cents,
    (total_cost_cents / 100.0) as total_cost_dollars
FROM individual_orders_clean 
WHERE item_name LIKE '%Venusaur%'
ORDER BY created_at DESC
LIMIT 5;
