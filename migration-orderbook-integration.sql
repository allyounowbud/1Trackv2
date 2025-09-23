-- Migration script to integrate new orderbook with existing orders table
-- This creates a bridge between the old and new systems

-- =============================================
-- ENHANCE EXISTING ORDERS TABLE
-- =============================================

-- Add columns to link orders to new orderbook tables
ALTER TABLE orders ADD COLUMN IF NOT EXISTS buy_order_id UUID REFERENCES buy_orders(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS sell_order_id UUID REFERENCES sell_orders(id);

-- Add order management columns
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_sequence INTEGER; -- For ordering multiple orders of same item
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_individual_order BOOLEAN DEFAULT true;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS parent_order_id UUID REFERENCES orders(id); -- For grouping related orders

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_orders_buy_order_id ON orders(buy_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_sell_order_id ON orders(sell_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_sequence ON orders(order_sequence);
CREATE INDEX IF NOT EXISTS idx_orders_parent_order_id ON orders(parent_order_id);

-- =============================================
-- CREATE ORDER MANAGEMENT FUNCTIONS
-- =============================================

-- Function to create a complete order (orders + buy_orders)
CREATE OR REPLACE FUNCTION create_complete_order(
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
    v_buy_order_id UUID;
    v_sell_order_id UUID;
    v_order_sequence INTEGER;
BEGIN
    -- Get next sequence number for this item
    SELECT COALESCE(MAX(order_sequence), 0) + 1 
    INTO v_order_sequence
    FROM orders 
    WHERE item_id = p_item_id;
    
    -- Create buy order
    INSERT INTO buy_orders (
        item_id, buy_date, buy_price_cents, quantity,
        buy_location, buy_marketplace_id, buy_retailer_id, buy_notes,
        status, is_available_for_sale
    ) VALUES (
        p_item_id, p_buy_date, p_buy_price_cents, p_quantity,
        p_buy_location, p_buy_marketplace_id, p_buy_retailer_id, p_buy_notes,
        'delivered', true
    ) RETURNING id INTO v_buy_order_id;
    
    -- Create sell order if provided
    IF p_sell_date IS NOT NULL AND p_sell_price_cents IS NOT NULL THEN
        INSERT INTO sell_orders (
            item_id, sell_date, sell_price_cents, quantity,
            sell_location, sell_marketplace_id, sell_retailer_id,
            sell_fees_cents, sell_notes
        ) VALUES (
            p_item_id, p_sell_date, p_sell_price_cents, p_sell_quantity,
            p_sell_location, p_sell_marketplace_id, p_sell_retailer_id,
            p_sell_fees_cents, p_sell_notes
        ) RETURNING id INTO v_sell_order_id;
        
        -- Create order link
        INSERT INTO order_links (
            sell_order_id, buy_order_id, quantity_linked, cost_basis_cents
        ) VALUES (
            v_sell_order_id, v_buy_order_id, p_sell_quantity, p_sell_quantity * p_buy_price_cents
        );
    END IF;
    
    -- Create orders table record
    INSERT INTO orders (
        item_id, order_type, buy_date, buy_price_cents, buy_quantity,
        buy_location, buy_marketplace_id, buy_retailer_id, buy_notes,
        sell_date, sell_price_cents, sell_quantity, sell_location,
        sell_marketplace_id, sell_retailer_id, sell_fees_cents, sell_notes,
        status, is_sold, buy_order_id, sell_order_id, order_sequence,
        is_individual_order
    ) VALUES (
        p_item_id, 'buy', p_buy_date, p_buy_price_cents, p_quantity,
        p_buy_location, p_buy_marketplace_id, p_buy_retailer_id, p_buy_notes,
        p_sell_date, p_sell_price_cents, p_sell_quantity, p_sell_location,
        p_sell_marketplace_id, p_sell_retailer_id, p_sell_fees_cents, p_sell_notes,
        CASE WHEN p_sell_date IS NOT NULL THEN 'sold' ELSE 'delivered' END,
        p_sell_date IS NOT NULL, v_buy_order_id, v_sell_order_id, v_order_sequence,
        true
    ) RETURNING id INTO v_order_id;
    
    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark an order as sold
CREATE OR REPLACE FUNCTION mark_order_as_sold(
    p_order_id UUID,
    p_sell_date DATE,
    p_sell_price_cents INTEGER,
    p_sell_quantity INTEGER,
    p_sell_location TEXT DEFAULT NULL,
    p_sell_marketplace_id UUID DEFAULT NULL,
    p_sell_retailer_id UUID DEFAULT NULL,
    p_sell_fees_cents INTEGER DEFAULT 0,
    p_sell_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_sell_order_id UUID;
    v_buy_order_id UUID;
    v_item_id UUID;
    v_buy_price_cents INTEGER;
BEGIN
    -- Get order details
    SELECT buy_order_id, item_id, buy_price_cents
    INTO v_buy_order_id, v_item_id, v_buy_price_cents
    FROM orders
    WHERE id = p_order_id;
    
    IF v_buy_order_id IS NULL THEN
        RAISE EXCEPTION 'Order not found or not a buy order';
    END IF;
    
    -- Create sell order
    INSERT INTO sell_orders (
        item_id, sell_date, sell_price_cents, quantity,
        sell_location, sell_marketplace_id, sell_retailer_id,
        sell_fees_cents, sell_notes
    ) VALUES (
        v_item_id, p_sell_date, p_sell_price_cents, p_sell_quantity,
        p_sell_location, p_sell_marketplace_id, p_sell_retailer_id,
        p_sell_fees_cents, p_sell_notes
    ) RETURNING id INTO v_sell_order_id;
    
    -- Create order link
    INSERT INTO order_links (
        sell_order_id, buy_order_id, quantity_linked, cost_basis_cents
    ) VALUES (
        v_sell_order_id, v_buy_order_id, p_sell_quantity, p_sell_quantity * v_buy_price_cents
    );
    
    -- Update orders table
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
        sell_order_id = v_sell_order_id,
        updated_at = NOW()
    WHERE id = p_order_id;
    
    RETURN v_sell_order_id;
END;
$$ LANGUAGE plpgsql;

-- Function to delete an order completely (cascade delete)
CREATE OR REPLACE FUNCTION delete_order_completely(p_order_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_buy_order_id UUID;
    v_sell_order_id UUID;
BEGIN
    -- Get order details
    SELECT buy_order_id, sell_order_id
    INTO v_buy_order_id, v_sell_order_id
    FROM orders
    WHERE id = p_order_id;
    
    -- Delete order links first
    IF v_sell_order_id IS NOT NULL THEN
        DELETE FROM order_links WHERE sell_order_id = v_sell_order_id;
    END IF;
    
    -- Delete sell order
    IF v_sell_order_id IS NOT NULL THEN
        DELETE FROM sell_orders WHERE id = v_sell_order_id;
    END IF;
    
    -- Delete buy order
    IF v_buy_order_id IS NOT NULL THEN
        DELETE FROM buy_orders WHERE id = v_buy_order_id;
    END IF;
    
    -- Delete orders table record
    DELETE FROM orders WHERE id = p_order_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- CREATE ENHANCED VIEWS
-- =============================================

-- View for individual orders with full details
CREATE OR REPLACE VIEW individual_orders AS
SELECT 
    o.id,
    o.item_id,
    o.order_sequence,
    o.is_individual_order,
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
    o.buy_order_id,
    o.sell_order_id,
    o.created_at,
    o.updated_at,
    -- Item details
    i.name as item_name,
    i.set_name,
    i.item_type,
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
WHERE o.is_individual_order = true
ORDER BY o.item_id, o.order_sequence;

-- View for collection summary (grouped by item)
CREATE OR REPLACE VIEW collection_summary AS
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
WHERE o.is_individual_order = true
GROUP BY o.item_id, i.name, i.set_name, i.item_type, i.market_value_cents, i.image_url
ORDER BY i.name;

-- =============================================
-- MIGRATE EXISTING DATA
-- =============================================

-- Migrate existing orders to new structure
DO $$
DECLARE
    order_record RECORD;
    v_buy_order_id UUID;
    v_sell_order_id UUID;
    v_order_sequence INTEGER;
BEGIN
    -- Loop through existing orders
    FOR order_record IN 
        SELECT * FROM orders 
        WHERE buy_order_id IS NULL 
        ORDER BY item_id, created_at
    LOOP
        -- Get sequence number for this item
        SELECT COALESCE(MAX(order_sequence), 0) + 1 
        INTO v_order_sequence
        FROM orders 
        WHERE item_id = order_record.item_id;
        
        -- Create buy order
        INSERT INTO buy_orders (
            item_id, buy_date, buy_price_cents, quantity,
            buy_location, buy_marketplace_id, buy_retailer_id, buy_notes,
            status, is_available_for_sale, quantity_remaining
        ) VALUES (
            order_record.item_id, order_record.buy_date, order_record.buy_price_cents, order_record.buy_quantity,
            order_record.buy_location, order_record.buy_marketplace_id, order_record.buy_retailer_id, order_record.buy_notes,
            'delivered', NOT order_record.is_sold, 
            CASE WHEN order_record.is_sold THEN 0 ELSE order_record.buy_quantity END
        ) RETURNING id INTO v_buy_order_id;
        
        -- Create sell order if sold
        IF order_record.is_sold AND order_record.sell_date IS NOT NULL THEN
            INSERT INTO sell_orders (
                item_id, sell_date, sell_price_cents, quantity,
                sell_location, sell_marketplace_id, sell_retailer_id,
                sell_fees_cents, sell_notes
            ) VALUES (
                order_record.item_id, order_record.sell_date, order_record.sell_price_cents, order_record.sell_quantity,
                order_record.sell_location, order_record.sell_marketplace_id, order_record.sell_retailer_id,
                order_record.sell_fees_cents, order_record.sell_notes
            ) RETURNING id INTO v_sell_order_id;
            
            -- Create order link
            INSERT INTO order_links (
                sell_order_id, buy_order_id, quantity_linked, cost_basis_cents
            ) VALUES (
                v_sell_order_id, v_buy_order_id, order_record.sell_quantity, 
                order_record.sell_quantity * order_record.buy_price_cents
            );
        END IF;
        
        -- Update orders table with new IDs
        UPDATE orders SET
            buy_order_id = v_buy_order_id,
            sell_order_id = v_sell_order_id,
            order_sequence = v_order_sequence,
            is_individual_order = true
        WHERE id = order_record.id;
    END LOOP;
END $$;

-- =============================================
-- ADD COMMENTS
-- =============================================

COMMENT ON FUNCTION create_complete_order IS 'Creates a complete order with both orders and buy_orders records';
COMMENT ON FUNCTION mark_order_as_sold IS 'Marks an existing order as sold and creates sell_orders and order_links';
COMMENT ON FUNCTION delete_order_completely IS 'Deletes an order and all related records (cascade delete)';
COMMENT ON VIEW individual_orders IS 'Individual orders with full details for order management';
COMMENT ON VIEW collection_summary IS 'Collection summary grouped by item for overview display';

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Verify migration was successful
SELECT 'Migration completed successfully' as status
WHERE EXISTS (
    SELECT 1 FROM orders WHERE buy_order_id IS NOT NULL LIMIT 1
);

-- Count migrated orders
SELECT 
    COUNT(*) as total_orders,
    COUNT(buy_order_id) as orders_with_buy_orders,
    COUNT(sell_order_id) as orders_with_sell_orders
FROM orders;

-- =============================================
-- USAGE EXAMPLES
-- =============================================

-- Example: Create a new order
-- SELECT create_complete_order(
--     'item-uuid', '2024-01-01', 500, 10, 'Local Store', 'marketplace-uuid', 'retailer-uuid', 'Bought 10 cards'
-- );

-- Example: Mark an order as sold
-- SELECT mark_order_as_sold(
--     'order-uuid', '2024-02-01', 800, 3, 'TCGPlayer', 'marketplace-uuid', 'retailer-uuid', 50, 'Sold 3 cards'
-- );

-- Example: Delete an order completely
-- SELECT delete_order_completely('order-uuid');
