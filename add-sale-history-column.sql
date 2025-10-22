-- Add sale_history column to orders table for tracking individual sales
-- This allows detailed sale tracking without duplicating records
-- Storage-efficient approach using JSON field

-- Add the sale_history column
ALTER TABLE orders ADD COLUMN IF NOT EXISTS sale_history JSONB;

-- Add index for better performance on sale_history queries
CREATE INDEX IF NOT EXISTS idx_orders_sale_history ON orders USING GIN (sale_history);

-- Add comment for documentation
COMMENT ON COLUMN orders.sale_history IS 'JSON array of individual sale records with details like quantity, price, date, location, and notes';

-- Update the individual_orders_clean view to include sale_history
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
    -- Order group information
    o.order_group_id,
    o.order_group_name,
    o.order_group_notes,
    -- Order number (now from the actual column)
    o.order_number,
    -- Graded card columns
    o.card_type,
    o.graded_company,
    o.graded_grade,
    -- Sale history for detailed tracking
    o.sale_history,
    o.quantity_sold,
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
    (o.buy_price_cents * o.buy_quantity) as total_cost_cents
FROM orders o
JOIN items i ON o.item_id = i.id
LEFT JOIN pokemon_cards pc ON (
    -- Handle name differences AND card number matching
    (
        (i.name = pc.name) OR 
        (i.name LIKE pc.name || ' #%') OR
        (pc.name = SPLIT_PART(i.name, ' #', 1))
    ) AND (
        i.set_name = pc.expansion_name
    ) AND (
        -- Match card number if available
        i.card_number = pc.number OR
        (i.card_number IS NULL AND pc.number IS NULL) OR
        -- Extract card number from item name if not stored separately
        SPLIT_PART(i.name, ' #', 2) = pc.number OR
        -- Fallback: if no card number, match by name and set only
        (i.card_number IS NULL AND pc.number IS NULL AND i.name = pc.name)
    )
)
WHERE o.user_id = auth.uid();

-- Grant permissions on the updated view
GRANT SELECT ON individual_orders_clean TO authenticated;

-- Update collection_summary_clean view to include sale_history information
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
    SUM(CASE WHEN o.is_sold = true THEN o.buy_quantity ELSE 0 END) as sold_quantity,
    -- Enhanced sale tracking
    SUM(COALESCE(o.quantity_sold, 0)) as total_quantity_sold,
    COUNT(CASE WHEN o.sale_history IS NOT NULL THEN 1 END) as orders_with_sale_history
FROM items i
JOIN orders o ON i.id = o.item_id
LEFT JOIN pokemon_cards pc ON (
    -- Handle name differences AND card number matching
    (
        (i.name = pc.name) OR 
        (i.name LIKE pc.name || ' #%') OR
        (pc.name = SPLIT_PART(i.name, ' #', 1))
    ) AND (
        i.set_name = pc.expansion_name
    ) AND (
        -- Match card number if available
        i.card_number = pc.number OR
        (i.card_number IS NULL AND pc.number IS NULL) OR
        -- Extract card number from item name if not stored separately
        SPLIT_PART(i.name, ' #', 2) = pc.number OR
        -- Fallback: if no card number, match by name and set only
        (i.card_number IS NULL AND pc.number IS NULL AND i.name = pc.name)
    )
)
WHERE o.user_id = auth.uid()
GROUP BY i.id, i.name, i.set_name, i.image_url, i.item_type, i.card_number, 
         COALESCE(pc.raw_market * 100, pc.graded_market * 100, i.market_value_cents, 0);

-- Grant permissions on the updated view
GRANT SELECT ON collection_summary_clean TO authenticated;



