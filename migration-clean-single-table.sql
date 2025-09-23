-- Clean Single Table Solution
-- This removes all the confusing multiple tables and uses ONE clean orders table

-- =============================================
-- BACKUP EXISTING DATA
-- =============================================
-- Create backup of current orders table
CREATE TABLE IF NOT EXISTS orders_backup_clean AS 
SELECT * FROM orders;

-- =============================================
-- DROP CONFUSING TABLES AND VIEWS
-- =============================================

-- Drop the confusing multiple tables
DROP TABLE IF EXISTS buy_orders CASCADE;
DROP TABLE IF EXISTS sell_orders CASCADE;
DROP TABLE IF EXISTS order_links CASCADE;

-- Drop confusing views
DROP VIEW IF EXISTS individual_orders CASCADE;
DROP VIEW IF EXISTS collection_summary CASCADE;
DROP VIEW IF EXISTS current_inventory CASCADE;
DROP VIEW IF EXISTS sold_items_with_profit CASCADE;

-- =============================================
-- CLEAN UP ORDERS TABLE
-- =============================================

-- Remove confusing columns that link to deleted tables
ALTER TABLE orders DROP COLUMN IF EXISTS buy_order_id;
ALTER TABLE orders DROP COLUMN IF EXISTS sell_order_id;
ALTER TABLE orders DROP COLUMN IF EXISTS order_sequence;
ALTER TABLE orders DROP COLUMN IF EXISTS is_individual_order;
ALTER TABLE orders DROP COLUMN IF EXISTS parent_order_id;

-- Add clean order numbering column
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number INTEGER;

-- =============================================
-- CREATE CLEAN ORDERS TABLE STRUCTURE
-- =============================================

-- Add any missing columns to make it complete
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'delivered';

-- Add constraints (drop first if exists)
DO $$ 
BEGIN
    -- Drop constraint if it exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'valid_status' AND table_name = 'orders') THEN
        ALTER TABLE orders DROP CONSTRAINT valid_status;
    END IF;
    
    -- Add constraint
    ALTER TABLE orders ADD CONSTRAINT valid_status 
        CHECK (status IN ('ordered', 'shipped', 'delivered', 'sold', 'cancelled'));
END $$;

-- =============================================
-- CREATE CLEAN FUNCTIONS
-- =============================================

-- Function to get next order number for an item
CREATE OR REPLACE FUNCTION get_next_order_number(p_item_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_next_number INTEGER;
BEGIN
    SELECT COALESCE(MAX(order_number), 0) + 1 
    INTO v_next_number
    FROM orders 
    WHERE item_id = p_item_id;
    
    RETURN v_next_number;
END;
$$ LANGUAGE plpgsql;

-- Function to create a clean order
CREATE OR REPLACE FUNCTION create_clean_order(
    p_item_id UUID,
    p_buy_date DATE,
    p_buy_price_cents INTEGER,
    p_quantity INTEGER,
    p_buy_location TEXT DEFAULT NULL,
    p_buy_marketplace_id UUID DEFAULT NULL,
    p_buy_retailer_id UUID DEFAULT NULL,
    p_buy_notes TEXT DEFAULT NULL,
    p_sell_date DATE DEFAULT NULL,
    p_sell_price_cents INTEGER DEFAULT NULL,
    p_sell_quantity INTEGER DEFAULT NULL,
    p_sell_location TEXT DEFAULT NULL,
    p_sell_marketplace_id UUID DEFAULT NULL,
    p_sell_retailer_id UUID DEFAULT NULL,
    p_sell_fees_cents INTEGER DEFAULT 0,
    p_sell_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_order_id UUID;
    v_order_number INTEGER;
BEGIN
    -- Get next order number for this item
    v_order_number := get_next_order_number(p_item_id);
    
    -- Create order
    INSERT INTO orders (
        item_id, order_number, order_type, buy_date, buy_price_cents, buy_quantity,
        buy_location, buy_marketplace_id, buy_retailer_id, buy_notes,
        sell_date, sell_price_cents, sell_quantity, sell_location,
        sell_marketplace_id, sell_retailer_id, sell_fees_cents, sell_notes,
        status, is_sold
    ) VALUES (
        p_item_id, v_order_number, 'buy', p_buy_date, p_buy_price_cents, p_quantity,
        p_buy_location, p_buy_marketplace_id, p_buy_retailer_id, p_buy_notes,
        p_sell_date, p_sell_price_cents, p_sell_quantity, p_sell_location,
        p_sell_marketplace_id, p_sell_retailer_id, p_sell_fees_cents, p_sell_notes,
        CASE WHEN p_sell_date IS NOT NULL THEN 'sold' ELSE 'delivered' END,
        p_sell_date IS NOT NULL
    ) RETURNING id INTO v_order_id;
    
    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark order as sold
CREATE OR REPLACE FUNCTION mark_order_sold(
    p_order_id UUID,
    p_sell_date DATE,
    p_sell_price_cents INTEGER,
    p_sell_quantity INTEGER,
    p_sell_location TEXT DEFAULT NULL,
    p_sell_marketplace_id UUID DEFAULT NULL,
    p_sell_retailer_id UUID DEFAULT NULL,
    p_sell_fees_cents INTEGER DEFAULT 0,
    p_sell_notes TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE orders SET
        sell_date = p_sell_date,
        sell_price_cents = p_sell_price_cents,
        sell_quantity = p_sell_quantity,
        sell_location = p_sell_location,
        sell_marketplace_id = p_sell_marketplace_id,
        sell_retailer_id = p_sell_retailer_id,
        sell_fees_cents = p_sell_fees_cents,
        sell_notes = p_sell_notes,
        status = 'sold',
        is_sold = true,
        updated_at = NOW()
    WHERE id = p_order_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to delete order completely (simple!)
CREATE OR REPLACE FUNCTION delete_order_clean(p_order_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Just delete from orders table - that's it!
    DELETE FROM orders WHERE id = p_order_id;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- UPDATE EXISTING DATA
-- =============================================

-- Add order numbers to existing orders
DO $$
DECLARE
    order_record RECORD;
    v_order_number INTEGER;
    v_current_item_id UUID;
BEGIN
    v_current_item_id := NULL;
    v_order_number := 0;
    
    -- Loop through orders ordered by item and created_at
    FOR order_record IN 
        SELECT * FROM orders 
        ORDER BY item_id, created_at
    LOOP
        -- Reset order number for new item
        IF v_current_item_id IS DISTINCT FROM order_record.item_id THEN
            v_current_item_id := order_record.item_id;
            v_order_number := 1;
        ELSE
            v_order_number := v_order_number + 1;
        END IF;
        
        -- Update order with order number
        UPDATE orders 
        SET order_number = v_order_number
        WHERE id = order_record.id;
    END LOOP;
END $$;

-- =============================================
-- CREATE CLEAN VIEWS
-- =============================================

-- Simple view for individual orders
CREATE VIEW individual_orders_clean AS
SELECT 
    o.id,
    o.item_id,
    o.order_number,
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
    o.sell_fees_cents,
    o.sell_notes,
    o.status,
    o.is_sold,
    o.total_cost_cents,
    o.total_revenue_cents,
    o.net_profit_cents,
    o.profit_percentage,
    o.created_at,
    o.updated_at,
    -- Item details
    i.name as item_name,
    i.set_name,
    i.item_type,
    i.card_number,
    i.market_value_cents,
    i.image_url,
    -- Marketplace details
    m_buy.display_name as buy_marketplace_name,
    m_sell.display_name as sell_marketplace_name,
    -- Retailer details
    r_buy.name as buy_retailer_name,
    r_sell.name as sell_retailer_name
FROM orders o
JOIN items i ON o.item_id = i.id
LEFT JOIN marketplaces m_buy ON o.buy_marketplace_id = m_buy.id
LEFT JOIN marketplaces m_sell ON o.sell_marketplace_id = m_sell.id
LEFT JOIN retailers r_buy ON o.buy_retailer_id = r_buy.id
LEFT JOIN retailers r_sell ON o.sell_retailer_id = r_sell.id
ORDER BY o.item_id, o.order_number;

-- Simple view for collection summary
CREATE VIEW collection_summary_clean AS
SELECT 
    o.item_id,
    i.name as item_name,
    i.set_name,
    i.item_type,
    i.market_value_cents,
    i.image_url,
    COUNT(*) as total_orders,
    SUM(o.buy_quantity) as total_quantity,
    SUM(o.total_cost_cents) as total_invested_cents,
    SUM(CASE WHEN o.is_sold THEN o.total_revenue_cents ELSE 0 END) as total_revenue_cents,
    SUM(CASE WHEN o.is_sold THEN o.net_profit_cents ELSE 0 END) as total_profit_cents,
    AVG(CASE WHEN o.is_sold THEN o.profit_percentage ELSE NULL END) as avg_profit_percentage,
    SUM(CASE WHEN NOT o.is_sold THEN o.buy_quantity ELSE 0 END) as available_quantity,
    SUM(CASE WHEN NOT o.is_sold THEN o.total_cost_cents ELSE 0 END) as available_value_cents
FROM orders o
JOIN items i ON o.item_id = i.id
GROUP BY o.item_id, i.name, i.set_name, i.item_type, i.market_value_cents, i.image_url
ORDER BY i.name;

-- =============================================
-- CREATE INDEXES
-- =============================================

-- Clean up old indexes
DROP INDEX IF EXISTS idx_orders_buy_order_id;
DROP INDEX IF EXISTS idx_orders_sell_order_id;
DROP INDEX IF EXISTS idx_orders_order_sequence;
DROP INDEX IF EXISTS idx_orders_parent_order_id;

-- Create clean indexes
CREATE INDEX IF NOT EXISTS idx_orders_item_id ON orders(item_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_is_sold ON orders(is_sold);
CREATE INDEX IF NOT EXISTS idx_orders_buy_date ON orders(buy_date);
CREATE INDEX IF NOT EXISTS idx_orders_sell_date ON orders(sell_date);

-- =============================================
-- ADD COMMENTS
-- =============================================

COMMENT ON FUNCTION create_clean_order IS 'Creates a single order record with automatic order numbering';
COMMENT ON FUNCTION mark_order_sold IS 'Marks an existing order as sold by updating the same record';
COMMENT ON FUNCTION delete_order_clean IS 'Deletes an order completely - simple and clean';
COMMENT ON VIEW individual_orders_clean IS 'Individual orders with order numbers for easy management';
COMMENT ON VIEW collection_summary_clean IS 'Collection summary grouped by item';

-- =============================================
-- VERIFICATION
-- =============================================

-- Verify cleanup was successful
SELECT 'Cleanup completed successfully' as status
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name IN ('buy_orders', 'sell_orders', 'order_links')
);

-- Count orders with order numbers
SELECT 
    COUNT(*) as total_orders,
    COUNT(order_number) as orders_with_numbers
FROM orders;

-- =============================================
-- USAGE EXAMPLES
-- =============================================

-- Example: Create a new order
-- SELECT create_clean_order(
--     'item-uuid', '2024-01-01', 500, 10, 'Local Store', 'marketplace-uuid', 'retailer-uuid', 'Bought 10 cards'
-- );

-- Example: Mark an order as sold
-- SELECT mark_order_sold(
--     'order-uuid', '2024-02-01', 800, 3, 'TCGPlayer', 'marketplace-uuid', 'retailer-uuid', 50, 'Sold 3 cards'
-- );

-- Example: Delete an order completely
-- SELECT delete_order_clean('order-uuid');

-- =============================================
-- RESULT
-- =============================================

-- Now you have:
-- ✅ ONE orders table with all data
-- ✅ Order numbers (Order #1, #2, #3) for same item
-- ✅ Simple deletion - delete one record, everything is gone
-- ✅ No confusing multiple tables
-- ✅ Clean, simple system
