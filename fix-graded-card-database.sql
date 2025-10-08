-- Fix graded card database setup
-- This adds the missing columns and updates the views

-- Step 1: Add graded card columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS card_type TEXT DEFAULT 'raw';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS graded_company TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS graded_grade TEXT;

-- Add comments for documentation
COMMENT ON COLUMN orders.card_type IS 'Type of card: raw or graded';
COMMENT ON COLUMN orders.graded_company IS 'Grading company (PSA, BGS, CGC, SGC) for graded cards';
COMMENT ON COLUMN orders.graded_grade IS 'Grade (1-10) for graded cards';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_card_type ON orders(card_type);
CREATE INDEX IF NOT EXISTS idx_orders_graded_company ON orders(graded_company);
CREATE INDEX IF NOT EXISTS idx_orders_graded_grade ON orders(graded_grade);

-- Update existing orders to have default card_type
UPDATE orders SET card_type = 'raw' WHERE card_type IS NULL;

-- Step 2: Update individual_orders_clean view to include graded card columns
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
    -- New graded card columns
    o.card_type,
    o.graded_company,
    o.graded_grade,
    -- Item details from items table
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

-- Step 3: Grant permissions on the updated view
GRANT SELECT ON individual_orders_clean TO authenticated;

-- Step 4: Verify the view was created correctly
SELECT 
    schemaname,
    viewname,
    definition
FROM pg_views 
WHERE viewname = 'individual_orders_clean';
