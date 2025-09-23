-- Orderbook Redesign: Separate Buy and Sell Orders
-- This provides clear tracking of individual transactions and inventory

-- =============================================
-- DROP OLD ORDERS TABLE (if exists)
-- =============================================
-- Note: This will remove existing data - backup first!
-- DROP TABLE IF EXISTS orders CASCADE;

-- =============================================
-- BUY ORDERS TABLE
-- =============================================
-- Individual purchase transactions
CREATE TABLE buy_orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    
    -- Purchase details
    buy_date DATE NOT NULL,
    buy_price_cents INTEGER NOT NULL, -- Price per item in cents
    quantity INTEGER NOT NULL DEFAULT 1,
    buy_location TEXT,
    buy_marketplace_id UUID REFERENCES marketplaces(id),
    buy_retailer_id UUID REFERENCES retailers(id),
    buy_notes TEXT,
    
    -- Status and inventory tracking
    status TEXT DEFAULT 'delivered', -- 'ordered', 'shipped', 'delivered', 'cancelled'
    is_available_for_sale BOOLEAN DEFAULT true,
    quantity_remaining INTEGER, -- Will be calculated by trigger
    
    -- Financial calculations
    total_cost_cents INTEGER, -- buy_price_cents * quantity
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_buy_status CHECK (status IN ('ordered', 'shipped', 'delivered', 'cancelled')),
    CONSTRAINT valid_buy_quantity CHECK (quantity > 0),
    CONSTRAINT valid_buy_price CHECK (buy_price_cents > 0)
);

-- =============================================
-- SELL ORDERS TABLE
-- =============================================
-- Individual sale transactions
CREATE TABLE sell_orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    
    -- Sale details
    sell_date DATE NOT NULL,
    sell_price_cents INTEGER NOT NULL, -- Price per item in cents
    quantity INTEGER NOT NULL DEFAULT 1,
    sell_location TEXT,
    sell_marketplace_id UUID REFERENCES marketplaces(id),
    sell_retailer_id UUID REFERENCES retailers(id),
    sell_fees_cents INTEGER DEFAULT 0, -- Marketplace fees in cents
    sell_notes TEXT,
    
    -- Financial calculations
    total_revenue_cents INTEGER, -- sell_price_cents * quantity
    net_revenue_cents INTEGER, -- total_revenue_cents - sell_fees_cents
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_sell_quantity CHECK (quantity > 0),
    CONSTRAINT valid_sell_price CHECK (sell_price_cents > 0)
);

-- =============================================
-- ORDER LINKS TABLE
-- =============================================
-- Links specific buy orders to sell orders (FIFO/LIFO tracking)
CREATE TABLE order_links (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sell_order_id UUID NOT NULL REFERENCES sell_orders(id) ON DELETE CASCADE,
    buy_order_id UUID NOT NULL REFERENCES buy_orders(id),
    
    -- Link details
    quantity_linked INTEGER NOT NULL, -- How many from this buy order were sold
    cost_basis_cents INTEGER NOT NULL, -- Cost basis for this specific quantity
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_linked_quantity CHECK (quantity_linked > 0),
    CONSTRAINT valid_cost_basis CHECK (cost_basis_cents > 0)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Buy orders indexes
CREATE INDEX idx_buy_orders_item_id ON buy_orders(item_id);
CREATE INDEX idx_buy_orders_buy_date ON buy_orders(buy_date);
CREATE INDEX idx_buy_orders_status ON buy_orders(status);
CREATE INDEX idx_buy_orders_available ON buy_orders(is_available_for_sale);
CREATE INDEX idx_buy_orders_quantity_remaining ON buy_orders(quantity_remaining);

-- Sell orders indexes
CREATE INDEX idx_sell_orders_item_id ON sell_orders(item_id);
CREATE INDEX idx_sell_orders_sell_date ON sell_orders(sell_date);
CREATE INDEX idx_sell_orders_marketplace ON sell_orders(sell_marketplace_id);

-- Order links indexes
CREATE INDEX idx_order_links_sell_order ON order_links(sell_order_id);
CREATE INDEX idx_order_links_buy_order ON order_links(buy_order_id);

-- =============================================
-- FUNCTIONS FOR AUTOMATIC CALCULATIONS
-- =============================================

-- Function to calculate buy order financials
CREATE OR REPLACE FUNCTION calculate_buy_order_financials()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate total cost
    NEW.total_cost_cents = NEW.buy_price_cents * NEW.quantity;
    
    -- Set quantity remaining to full quantity initially
    IF NEW.quantity_remaining IS NULL THEN
        NEW.quantity_remaining = NEW.quantity;
    END IF;
    
    -- Update timestamp
    NEW.updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate sell order financials
CREATE OR REPLACE FUNCTION calculate_sell_order_financials()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate total revenue
    NEW.total_revenue_cents = NEW.sell_price_cents * NEW.quantity;
    
    -- Calculate net revenue
    NEW.net_revenue_cents = NEW.total_revenue_cents - COALESCE(NEW.sell_fees_cents, 0);
    
    -- Update timestamp
    NEW.updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update buy order quantity remaining when linked
CREATE OR REPLACE FUNCTION update_buy_order_quantity()
RETURNS TRIGGER AS $$
BEGIN
    -- Update quantity remaining in buy order
    UPDATE buy_orders 
    SET quantity_remaining = quantity_remaining - NEW.quantity_linked,
        updated_at = NOW()
    WHERE id = NEW.buy_order_id;
    
    -- Mark as unavailable if quantity remaining is 0
    UPDATE buy_orders 
    SET is_available_for_sale = false,
        updated_at = NOW()
    WHERE id = NEW.buy_order_id AND quantity_remaining <= 0;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGERS
-- =============================================

-- Buy order triggers
CREATE TRIGGER trigger_calculate_buy_order_financials
    BEFORE INSERT OR UPDATE ON buy_orders
    FOR EACH ROW
    EXECUTE FUNCTION calculate_buy_order_financials();

-- Sell order triggers
CREATE TRIGGER trigger_calculate_sell_order_financials
    BEFORE INSERT OR UPDATE ON sell_orders
    FOR EACH ROW
    EXECUTE FUNCTION calculate_sell_order_financials();

-- Order link triggers
CREATE TRIGGER trigger_update_buy_order_quantity
    AFTER INSERT ON order_links
    FOR EACH ROW
    EXECUTE FUNCTION update_buy_order_quantity();

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE buy_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sell_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_links ENABLE ROW LEVEL SECURITY;

-- Buy orders policies
CREATE POLICY "Users can view all buy orders" ON buy_orders FOR SELECT USING (true);
CREATE POLICY "Users can insert buy orders" ON buy_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update buy orders" ON buy_orders FOR UPDATE USING (true);
CREATE POLICY "Users can delete buy orders" ON buy_orders FOR DELETE USING (true);

-- Sell orders policies
CREATE POLICY "Users can view all sell orders" ON sell_orders FOR SELECT USING (true);
CREATE POLICY "Users can insert sell orders" ON sell_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update sell orders" ON sell_orders FOR UPDATE USING (true);
CREATE POLICY "Users can delete sell orders" ON sell_orders FOR DELETE USING (true);

-- Order links policies
CREATE POLICY "Users can view all order links" ON order_links FOR SELECT USING (true);
CREATE POLICY "Users can insert order links" ON sell_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update order links" ON order_links FOR UPDATE USING (true);
CREATE POLICY "Users can delete order links" ON order_links FOR DELETE USING (true);

-- =============================================
-- HELPER VIEWS FOR EASY QUERYING
-- =============================================

-- View for current inventory (available buy orders)
CREATE VIEW current_inventory AS
SELECT 
    bo.id,
    bo.item_id,
    i.name as item_name,
    i.set_name,
    bo.buy_date,
    bo.buy_price_cents,
    bo.quantity_remaining,
    bo.total_cost_cents,
    bo.buy_location,
    bo.buy_notes,
    bo.created_at
FROM buy_orders bo
JOIN items i ON bo.item_id = i.id
WHERE bo.is_available_for_sale = true 
  AND bo.quantity_remaining > 0
  AND bo.status = 'delivered'
ORDER BY bo.buy_date ASC; -- FIFO order

-- View for sold items with profit calculation
CREATE VIEW sold_items_with_profit AS
SELECT 
    so.id as sell_order_id,
    so.item_id,
    i.name as item_name,
    i.set_name,
    so.sell_date,
    so.sell_price_cents,
    so.quantity,
    so.total_revenue_cents,
    so.net_revenue_cents,
    so.sell_fees_cents,
    so.sell_location,
    so.sell_notes,
    -- Calculate total cost basis from linked orders
    COALESCE(SUM(ol.cost_basis_cents), 0) as total_cost_basis_cents,
    -- Calculate profit
    so.net_revenue_cents - COALESCE(SUM(ol.cost_basis_cents), 0) as net_profit_cents,
    -- Calculate profit percentage
    CASE 
        WHEN COALESCE(SUM(ol.cost_basis_cents), 0) > 0 
        THEN ((so.net_revenue_cents - COALESCE(SUM(ol.cost_basis_cents), 0))::DECIMAL / SUM(ol.cost_basis_cents)::DECIMAL) * 100
        ELSE NULL
    END as profit_percentage
FROM sell_orders so
JOIN items i ON so.item_id = i.id
LEFT JOIN order_links ol ON so.id = ol.sell_order_id
GROUP BY so.id, so.item_id, i.name, i.set_name, so.sell_date, so.sell_price_cents, 
         so.quantity, so.total_revenue_cents, so.net_revenue_cents, so.sell_fees_cents,
         so.sell_location, so.sell_notes
ORDER BY so.sell_date DESC;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE buy_orders IS 'Individual purchase transactions with inventory tracking';
COMMENT ON TABLE sell_orders IS 'Individual sale transactions';
COMMENT ON TABLE order_links IS 'Links buy orders to sell orders for FIFO/LIFO cost basis tracking';
COMMENT ON VIEW current_inventory IS 'Available inventory from buy orders (FIFO ordered)';
COMMENT ON VIEW sold_items_with_profit IS 'Sold items with calculated profit/loss from order links';

-- =============================================
-- SAMPLE DATA INSERTION (for testing)
-- =============================================

-- Insert sample buy orders
-- INSERT INTO buy_orders (item_id, buy_date, buy_price_cents, quantity, buy_location, buy_notes)
-- VALUES 
--     ('item-uuid-1', '2024-01-01', 500, 10, 'Local Store', 'Bought 10 cards'),
--     ('item-uuid-1', '2024-01-15', 600, 5, 'eBay', 'Bought 5 more cards');

-- Insert sample sell order
-- INSERT INTO sell_orders (item_id, sell_date, sell_price_cents, quantity, sell_location, sell_fees_cents)
-- VALUES ('item-uuid-1', '2024-02-01', 800, 3, 'TCGPlayer', 50);

-- Link the orders (FIFO)
-- INSERT INTO order_links (sell_order_id, buy_order_id, quantity_linked, cost_basis_cents)
-- VALUES ('sell-order-uuid', 'buy-order-uuid-1', 3, 1500); -- 3 cards at $5 each
