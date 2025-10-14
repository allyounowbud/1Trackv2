-- Migrate from is_sold boolean to quantity-based sales tracking
-- This enables partial sale support and eliminates data sync issues

-- Step 1: Ensure quantity_sold is properly set for existing orders
-- Set quantity_sold based on current is_sold flag (backward compatibility)
UPDATE orders 
SET quantity_sold = CASE 
    WHEN is_sold = true THEN quantity 
    WHEN is_sold = false OR is_sold IS NULL THEN 0
    ELSE quantity_sold
END
WHERE quantity_sold IS NULL;

-- Step 2: Add performance indexes on quantity fields
-- These make filtering by sold status extremely fast even with millions of orders
CREATE INDEX IF NOT EXISTS idx_orders_quantity ON orders(quantity);
CREATE INDEX IF NOT EXISTS idx_orders_quantity_sold ON orders(quantity_sold);

-- Composite index for common query pattern (checking if items remain)
CREATE INDEX IF NOT EXISTS idx_orders_quantity_status ON orders(quantity, quantity_sold) 
WHERE user_id IS NOT NULL;

-- Step 3: Add a computed column for backward compatibility (optional)
-- This creates a virtual column that's always in sync with quantity fields
-- Useful for existing queries that check is_sold
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_fully_sold BOOLEAN 
GENERATED ALWAYS AS (quantity_sold >= quantity) STORED;

-- Add index on the generated column for fast filtering
CREATE INDEX IF NOT EXISTS idx_orders_is_fully_sold ON orders(is_fully_sold);

-- Step 4: Update views to use quantity-based logic
-- Drop dependent views first, then recreate them after individual_orders_clean
DROP VIEW IF EXISTS orders_fully_sold CASCADE;
DROP VIEW IF EXISTS orders_partially_sold CASCADE;
DROP VIEW IF EXISTS orders_sold CASCADE;
DROP VIEW IF EXISTS orders_on_hand CASCADE;
DROP VIEW IF EXISTS individual_orders_clean CASCADE;

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
    o.retailer_id,
    o.marketplace_id,
    o.retailer_name,
    o.notes,
    
    -- Sale information with quantity-based tracking
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

-- Step 5: Create convenience views for common queries
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

-- Step 6: Add helpful comments
COMMENT ON COLUMN orders.quantity IS 'Total quantity purchased in this order';
COMMENT ON COLUMN orders.quantity_sold IS 'Number of items sold from this order (enables partial sales)';
COMMENT ON COLUMN orders.is_fully_sold IS 'Computed column: true when all items are sold (quantity_sold >= quantity)';

-- Step 7: Grant permissions on new views (need both authenticated and anon for REST API)
GRANT SELECT ON individual_orders_clean TO authenticated, anon;
GRANT SELECT ON orders_on_hand TO authenticated, anon;
GRANT SELECT ON orders_sold TO authenticated, anon;
GRANT SELECT ON orders_partially_sold TO authenticated, anon;
GRANT SELECT ON orders_fully_sold TO authenticated, anon;

-- Summary
SELECT 
    'Migration completed!' as status,
    'Orders now support partial sales using quantity-based tracking' as message,
    COUNT(*) as total_orders,
    COUNT(*) FILTER (WHERE quantity_sold = 0 OR quantity_sold IS NULL) as on_hand_orders,
    COUNT(*) FILTER (WHERE quantity_sold > 0 AND quantity_sold < quantity) as partially_sold_orders,
    COUNT(*) FILTER (WHERE quantity_sold >= quantity) as fully_sold_orders
FROM orders;

