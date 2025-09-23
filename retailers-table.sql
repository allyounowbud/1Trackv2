-- =============================================
-- RETAILERS TABLE
-- =============================================
-- Stores retailer information (user-built database)
CREATE TABLE retailers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE, -- e.g., "Target", "Walmart", "Local Card Shop"
    display_name TEXT NOT NULL, -- e.g., "Target", "Walmart", "Local Card Shop"
    location TEXT, -- e.g., "Target 3244", "Downtown Location"
    website TEXT, -- Optional website URL
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX idx_retailers_name ON retailers(name);
CREATE INDEX idx_retailers_display_name ON retailers(display_name);

-- =============================================
-- UPDATE ORDERS TABLE TO USE RETAILERS
-- =============================================
-- Add retailer_id column to orders table
ALTER TABLE orders ADD COLUMN buy_retailer_id UUID REFERENCES retailers(id);
ALTER TABLE orders ADD COLUMN sell_retailer_id UUID REFERENCES retailers(id);

-- Create indexes for the new retailer references
CREATE INDEX idx_orders_buy_retailer_id ON orders(buy_retailer_id);
CREATE INDEX idx_orders_sell_retailer_id ON orders(sell_retailer_id);

-- =============================================
-- FUNCTIONS FOR RETAILER MANAGEMENT
-- =============================================

-- Function to get or create a retailer
CREATE OR REPLACE FUNCTION get_or_create_retailer(
    retailer_name TEXT,
    retailer_location TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    retailer_id UUID;
BEGIN
    -- Try to find existing retailer
    SELECT id INTO retailer_id 
    FROM retailers 
    WHERE LOWER(name) = LOWER(retailer_name);
    
    -- If not found, create new retailer
    IF retailer_id IS NULL THEN
        INSERT INTO retailers (name, display_name, location)
        VALUES (retailer_name, retailer_name, retailer_location)
        RETURNING id INTO retailer_id;
    END IF;
    
    RETURN retailer_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- UPDATE MARKETPLACES WITH MORE OPTIONS
-- =============================================
-- Add more common marketplaces
INSERT INTO marketplaces (name, display_name, fee_percentage, fixed_fee_cents) VALUES
('amazon', 'Amazon', 15.00, 0),
('facebook_marketplace', 'Facebook Marketplace', 0.00, 0),
('mercari', 'Mercari', 10.00, 0),
('poshmark', 'Poshmark', 20.00, 0),
('depop', 'Depop', 10.00, 0),
('grailed', 'Grailed', 9.00, 0),
('stockx', 'StockX', 9.50, 0),
('goat', 'GOAT', 9.50, 0),
('whatnot', 'Whatnot', 8.00, 0),
('tiktok_shop', 'TikTok Shop', 5.00, 0)
ON CONFLICT (name) DO NOTHING;
