-- Add proper order numbering logic to the orders table
-- This ensures each user has sequential order numbers starting from 1

-- 1. Add order_number column to orders table if it doesn't exist
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number INTEGER;

-- 2. Create index for better performance on order_number queries
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(user_id, order_number);

-- 3. Create a function to automatically assign order numbers
CREATE OR REPLACE FUNCTION assign_order_number()
RETURNS TRIGGER AS $$
DECLARE
    next_order_number INTEGER;
BEGIN
    -- Only assign order number if it's not already set
    IF NEW.order_number IS NULL THEN
        -- Get the next order number for this user
        SELECT COALESCE(MAX(order_number), 0) + 1
        INTO next_order_number
        FROM orders
        WHERE user_id = NEW.user_id;
        
        NEW.order_number = next_order_number;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create trigger to automatically assign order numbers
DROP TRIGGER IF EXISTS assign_order_number_trigger ON orders;
CREATE TRIGGER assign_order_number_trigger
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION assign_order_number();

-- 5. Update existing orders to have order numbers
-- This will assign sequential order numbers to existing orders for each user
WITH numbered_orders AS (
    SELECT 
        id,
        user_id,
        ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) as new_order_number
    FROM orders
    WHERE order_number IS NULL
)
UPDATE orders 
SET order_number = numbered_orders.new_order_number
FROM numbered_orders
WHERE orders.id = numbered_orders.id;

-- 6. Update the individual_orders_clean view to use the actual order_number column
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

-- 7. Grant permissions on the updated view
GRANT SELECT ON individual_orders_clean TO authenticated;
