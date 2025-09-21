-- OneTrack v2 Database Schema
-- Clean, comprehensive schema for order book management

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- MARKETPLACES TABLE
-- =============================================
-- Stores marketplace information and fee structures
CREATE TABLE marketplaces (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE, -- e.g., "eBay", "TCGPlayer", "CardMarket", "Manual"
    display_name TEXT NOT NULL, -- e.g., "eBay", "TCG Player", "Card Market", "Manual Entry"
    fee_percentage DECIMAL(5,2) DEFAULT 0.00, -- e.g., 10.00 for 10%
    fixed_fee_cents INTEGER DEFAULT 0, -- Fixed fee in cents
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default marketplaces
INSERT INTO marketplaces (name, display_name, fee_percentage, fixed_fee_cents) VALUES
('ebay', 'eBay', 12.90, 0), -- eBay's typical fee
('tcgplayer', 'TCG Player', 8.00, 0), -- TCGPlayer's typical fee
('cardmarket', 'Card Market', 5.00, 0), -- CardMarket's typical fee
('manual', 'Manual Entry', 0.00, 0), -- For manually added items
('other', 'Other Marketplace', 0.00, 0); -- For other marketplaces

-- =============================================
-- ITEMS TABLE
-- =============================================
-- Stores all items (both API-sourced and manually added)
CREATE TABLE items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Basic item information
    name TEXT NOT NULL,
    set_name TEXT, -- e.g., "Prismatic Evolutions", "Scarlet & Violet 151"
    item_type TEXT, -- e.g., "Card", "Booster Box", "Elite Trainer Box", "Sealed Product"
    rarity TEXT, -- e.g., "Rare", "Holo Rare", "Secret Rare"
    card_number TEXT, -- e.g., "001/165", "SV151-001"
    
    -- Item source tracking
    source TEXT NOT NULL DEFAULT 'manual', -- 'api', 'manual'
    api_id TEXT, -- ID from external API (CardMarket, TCGPlayer, etc.)
    api_source TEXT, -- Which API: 'cardmarket', 'tcgplayer', 'pricecharting'
    
    -- Market data
    market_value_cents INTEGER, -- Current market value in cents
    market_value_source TEXT, -- 'api', 'manual', 'user_override'
    market_value_updated_at TIMESTAMP WITH TIME ZONE,
    
    -- Visual data
    image_url TEXT,
    image_source TEXT, -- 'api', 'manual'
    
    -- Additional metadata
    description TEXT,
    condition_notes TEXT, -- For graded items, condition details
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_source CHECK (source IN ('api', 'manual')),
    CONSTRAINT valid_api_source CHECK (api_source IN ('cardmarket', 'tcgplayer', 'pricecharting') OR api_source IS NULL),
    CONSTRAINT valid_market_value_source CHECK (market_value_source IN ('api', 'manual', 'user_override') OR market_value_source IS NULL)
);

-- =============================================
-- ORDERS TABLE (Order Book)
-- =============================================
-- Comprehensive order book with buy/sell tracking
CREATE TABLE orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Item reference
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    
    -- Order type
    order_type TEXT NOT NULL, -- 'buy', 'sell'
    
    -- Purchase information
    buy_date DATE,
    buy_price_cents INTEGER, -- Price paid in cents
    buy_quantity INTEGER DEFAULT 1,
    buy_location TEXT, -- Where purchased: "Local Store", "eBay", "TCGPlayer", etc.
    buy_marketplace_id UUID REFERENCES marketplaces(id),
    buy_notes TEXT,
    
    -- Sale information (if sold)
    sell_date DATE,
    sell_price_cents INTEGER, -- Price received in cents
    sell_quantity INTEGER, -- How many were sold (can be partial)
    sell_location TEXT, -- Where sold
    sell_marketplace_id UUID REFERENCES marketplaces(id),
    sell_fees_cents INTEGER DEFAULT 0, -- Marketplace fees paid
    sell_notes TEXT,
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'ordered', -- 'ordered', 'shipped', 'delivered', 'sold', 'cancelled'
    is_sold BOOLEAN DEFAULT false,
    
    -- Financial calculations (computed fields)
    total_cost_cents INTEGER, -- buy_price_cents * buy_quantity
    total_revenue_cents INTEGER, -- sell_price_cents * sell_quantity (if sold)
    net_profit_cents INTEGER, -- total_revenue_cents - total_cost_cents - sell_fees_cents
    profit_percentage DECIMAL(5,2), -- (net_profit_cents / total_cost_cents) * 100
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_order_type CHECK (order_type IN ('buy', 'sell')),
    CONSTRAINT valid_status CHECK (status IN ('ordered', 'shipped', 'delivered', 'sold', 'cancelled')),
    CONSTRAINT valid_quantities CHECK (buy_quantity > 0 AND (sell_quantity IS NULL OR sell_quantity > 0)),
    CONSTRAINT valid_dates CHECK (buy_date IS NOT NULL OR sell_date IS NOT NULL)
);

-- =============================================
-- USER PREFERENCES TABLE
-- =============================================
-- Store user-specific settings and preferences
CREATE TABLE user_preferences (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL, -- Supabase auth user ID
    
    -- Display preferences
    default_currency TEXT DEFAULT 'USD',
    date_format TEXT DEFAULT 'MM/DD/YYYY',
    number_format TEXT DEFAULT 'US', -- 'US', 'EU'
    
    -- Collection preferences
    default_marketplace_id UUID REFERENCES marketplaces(id),
    auto_update_market_values BOOLEAN DEFAULT true,
    market_value_update_frequency TEXT DEFAULT 'daily', -- 'daily', 'weekly', 'manual'
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Items indexes
CREATE INDEX idx_items_name ON items(name);
CREATE INDEX idx_items_set_name ON items(set_name);
CREATE INDEX idx_items_source ON items(source);
CREATE INDEX idx_items_api_source ON items(api_source);
CREATE INDEX idx_items_market_value_updated_at ON items(market_value_updated_at);

-- Orders indexes
CREATE INDEX idx_orders_item_id ON orders(item_id);
CREATE INDEX idx_orders_order_type ON orders(order_type);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_is_sold ON orders(is_sold);
CREATE INDEX idx_orders_buy_date ON orders(buy_date);
CREATE INDEX idx_orders_sell_date ON orders(sell_date);
CREATE INDEX idx_orders_buy_marketplace_id ON orders(buy_marketplace_id);
CREATE INDEX idx_orders_sell_marketplace_id ON orders(sell_marketplace_id);

-- =============================================
-- FUNCTIONS FOR AUTOMATIC CALCULATIONS
-- =============================================

-- Function to calculate order financials
CREATE OR REPLACE FUNCTION calculate_order_financials()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate total cost
    NEW.total_cost_cents = NEW.buy_price_cents * NEW.buy_quantity;
    
    -- Calculate total revenue if sold
    IF NEW.is_sold AND NEW.sell_price_cents IS NOT NULL AND NEW.sell_quantity IS NOT NULL THEN
        NEW.total_revenue_cents = NEW.sell_price_cents * NEW.sell_quantity;
        NEW.net_profit_cents = NEW.total_revenue_cents - NEW.total_cost_cents - COALESCE(NEW.sell_fees_cents, 0);
        
        -- Calculate profit percentage
        IF NEW.total_cost_cents > 0 THEN
            NEW.profit_percentage = (NEW.net_profit_cents::DECIMAL / NEW.total_cost_cents::DECIMAL) * 100;
        END IF;
    ELSE
        NEW.total_revenue_cents = NULL;
        NEW.net_profit_cents = NULL;
        NEW.profit_percentage = NULL;
    END IF;
    
    -- Update timestamp
    NEW.updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically calculate financials
CREATE TRIGGER trigger_calculate_order_financials
    BEFORE INSERT OR UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION calculate_order_financials();

-- Function to update item timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at timestamps
CREATE TRIGGER trigger_items_updated_at
    BEFORE UPDATE ON items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_marketplaces_updated_at
    BEFORE UPDATE ON marketplaces
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Items policies
CREATE POLICY "Users can view all items" ON items FOR SELECT USING (true);
CREATE POLICY "Users can insert items" ON items FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update items" ON items FOR UPDATE USING (true);
CREATE POLICY "Users can delete items" ON items FOR DELETE USING (true);

-- Orders policies
CREATE POLICY "Users can view all orders" ON orders FOR SELECT USING (true);
CREATE POLICY "Users can insert orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update orders" ON orders FOR UPDATE USING (true);
CREATE POLICY "Users can delete orders" ON orders FOR DELETE USING (true);

-- Marketplaces policies (read-only for users)
CREATE POLICY "Users can view marketplaces" ON marketplaces FOR SELECT USING (true);
CREATE POLICY "Users can insert marketplaces" ON marketplaces FOR INSERT WITH CHECK (false); -- Admin only
CREATE POLICY "Users can update marketplaces" ON marketplaces FOR UPDATE USING (false); -- Admin only
CREATE POLICY "Users can delete marketplaces" ON marketplaces FOR DELETE USING (false); -- Admin only

-- User preferences policies
CREATE POLICY "Users can view own preferences" ON user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own preferences" ON user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own preferences" ON user_preferences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own preferences" ON user_preferences FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- VIEWS FOR COMMON QUERIES
-- =============================================

-- View for current inventory (unsold items)
CREATE VIEW current_inventory AS
SELECT 
    o.id as order_id,
    o.item_id,
    i.name,
    i.set_name,
    i.item_type,
    i.rarity,
    i.market_value_cents,
    i.image_url,
    o.buy_date,
    o.buy_price_cents,
    o.buy_quantity,
    o.buy_location,
    o.buy_marketplace_id,
    mp_buy.display_name as buy_marketplace_name,
    o.status,
    o.total_cost_cents,
    o.created_at
FROM orders o
JOIN items i ON o.item_id = i.id
LEFT JOIN marketplaces mp_buy ON o.buy_marketplace_id = mp_buy.id
WHERE o.is_sold = false
ORDER BY o.buy_date DESC;

-- View for sold items with profit/loss
CREATE VIEW sold_items AS
SELECT 
    o.id as order_id,
    o.item_id,
    i.name,
    i.set_name,
    i.item_type,
    o.buy_date,
    o.buy_price_cents,
    o.buy_quantity,
    o.sell_date,
    o.sell_price_cents,
    o.sell_quantity,
    o.sell_location,
    o.sell_marketplace_id,
    mp_sell.display_name as sell_marketplace_name,
    o.sell_fees_cents,
    o.total_cost_cents,
    o.total_revenue_cents,
    o.net_profit_cents,
    o.profit_percentage,
    o.created_at
FROM orders o
JOIN items i ON o.item_id = i.id
LEFT JOIN marketplaces mp_sell ON o.sell_marketplace_id = mp_sell.id
WHERE o.is_sold = true
ORDER BY o.sell_date DESC;

-- View for collection summary
CREATE VIEW collection_summary AS
SELECT 
    COUNT(*) as total_items,
    SUM(buy_quantity) as total_quantity,
    SUM(total_cost_cents) as total_invested_cents,
    SUM(CASE WHEN market_value_cents IS NOT NULL THEN market_value_cents * buy_quantity ELSE 0 END) as total_market_value_cents,
    SUM(CASE WHEN is_sold THEN total_revenue_cents ELSE 0 END) as total_revenue_cents,
    SUM(CASE WHEN is_sold THEN net_profit_cents ELSE 0 END) as total_profit_cents,
    AVG(CASE WHEN is_sold THEN profit_percentage ELSE NULL END) as average_profit_percentage
FROM orders o
JOIN items i ON o.item_id = i.id
WHERE o.is_sold = false;

-- =============================================
-- SAMPLE DATA (Optional - for testing)
-- =============================================

-- Sample items
INSERT INTO items (name, set_name, item_type, rarity, source, market_value_cents, market_value_source, image_url) VALUES
('Charizard ex', 'Scarlet & Violet 151', 'Card', 'Ultra Rare', 'manual', 2500, 'manual', 'https://example.com/charizard.jpg'),
('Elite Trainer Box', 'Prismatic Evolutions', 'Sealed Product', 'N/A', 'manual', 12000, 'manual', 'https://example.com/etb.jpg');

-- Sample orders
INSERT INTO orders (item_id, order_type, buy_date, buy_price_cents, buy_quantity, buy_location, buy_marketplace_id, status) 
SELECT 
    i.id,
    'buy',
    '2024-01-15',
    2000,
    1,
    'Local Store',
    m.id,
    'delivered'
FROM items i, marketplaces m 
WHERE i.name = 'Charizard ex' AND m.name = 'manual';

COMMENT ON TABLE items IS 'Stores all items in the collection, both from APIs and manually added';
COMMENT ON TABLE orders IS 'Comprehensive order book tracking all buy/sell transactions';
COMMENT ON TABLE marketplaces IS 'Marketplace information and fee structures';
COMMENT ON TABLE user_preferences IS 'User-specific settings and preferences';
