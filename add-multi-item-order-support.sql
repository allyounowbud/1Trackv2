-- Add multi-item order support to the database
-- This allows orders to be grouped together when they were purchased together

-- 1. Add order grouping columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_group_id UUID DEFAULT gen_random_uuid();
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_group_name TEXT; -- e.g., "Amazon Order #12345"
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_group_notes TEXT; -- e.g., "Booster box with 36 packs"

-- 2. Create index for better performance on order groups
CREATE INDEX IF NOT EXISTS idx_orders_order_group_id ON orders(order_group_id);

-- 3. Update the individual_orders_clean view to include order group information
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

-- 4. Create a new view for order groups (for order book display)
CREATE OR REPLACE VIEW order_groups_clean AS
SELECT 
    o.order_group_id,
    o.order_group_name,
    o.order_group_notes,
    o.buy_date,
    o.buy_location,
    o.buy_notes,
    o.user_id,
    COUNT(*) as item_count,
    SUM(o.buy_quantity) as total_quantity,
    SUM(o.total_cost_cents) as total_order_cost_cents,
    ARRAY_AGG(
        JSON_BUILD_OBJECT(
            'order_id', o.id,
            'item_name', i.name,
            'set_name', i.set_name,
            'quantity', o.buy_quantity,
            'price_per_item_cents', o.buy_price_cents,
            'total_cost_cents', o.total_cost_cents,
            'image_url', i.image_url
        ) ORDER BY i.name
    ) as items,
    MIN(o.created_at) as created_at,
    MAX(o.updated_at) as updated_at
FROM orders o
JOIN items i ON o.item_id = i.id
WHERE o.user_id = auth.uid()
GROUP BY o.order_group_id, o.order_group_name, o.order_group_notes, 
         o.buy_date, o.buy_location, o.buy_notes, o.user_id;

-- 5. Grant permissions on the new view
GRANT SELECT ON order_groups_clean TO authenticated;

-- 6. Update collection_summary_clean view to include order group information
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

-- 7. Grant permissions on updated views
GRANT SELECT ON individual_orders_clean TO authenticated;
GRANT SELECT ON collection_summary_clean TO authenticated;
