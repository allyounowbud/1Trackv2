-- Create retailers and marketplace tables
-- These tables store information about where items were purchased/sold

-- Drop existing tables to ensure clean recreation
DROP TABLE IF EXISTS marketplace CASCADE;
DROP TABLE IF EXISTS retailers CASCADE;

-- Create retailers table
CREATE TABLE retailers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    website TEXT,
    logo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create marketplace table
CREATE TABLE marketplace (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    website TEXT,
    logo_url TEXT,
    -- Fee structure
    has_fees BOOLEAN DEFAULT FALSE,
    fee_type TEXT, -- 'percentage', 'flat', 'tiered'
    fee_percentage DECIMAL(5,2), -- e.g., 12.90 for 12.90%
    fee_flat_cents BIGINT, -- flat fee in cents
    fee_notes TEXT, -- additional fee information (e.g., "12.9% + $0.30 per transaction")
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default retailers
INSERT INTO retailers (name, display_name, website, is_active) VALUES
    ('tcgplayer', 'TCGPlayer', 'https://www.tcgplayer.com', true),
    ('cardmarket', 'CardMarket', 'https://www.cardmarket.com', true),
    ('ebay', 'eBay', 'https://www.ebay.com', true),
    ('facebook_marketplace', 'Facebook Marketplace', 'https://www.facebook.com/marketplace', true),
    ('local_store', 'Local Store', null, true),
    ('private_sale', 'Private Sale', null, true),
    ('trade', 'Trade', null, true),
    ('gift', 'Gift', null, true),
    ('other', 'Other', null, true);

-- Insert default marketplaces with fee information
INSERT INTO marketplace (name, display_name, website, has_fees, fee_type, fee_percentage, fee_flat_cents, fee_notes, is_active) VALUES
    ('tcgplayer', 'TCGPlayer', 'https://www.tcgplayer.com', true, 'tiered', 12.90, null, '12.9% + $0.30 per transaction (Direct)', true),
    ('cardmarket', 'CardMarket', 'https://www.cardmarket.com', true, 'percentage', 5.00, null, '5% commission on sales', true),
    ('ebay', 'eBay', 'https://www.ebay.com', true, 'tiered', 13.25, null, '13.25% final value fee + listing fees vary', true),
    ('facebook_marketplace', 'Facebook Marketplace', 'https://www.facebook.com/marketplace', true, 'percentage', 5.00, null, '5% selling fee for shipped items', true),
    ('local_store', 'Local Store', null, false, null, null, null, 'No marketplace fees', true),
    ('private_sale', 'Private Sale', null, false, null, null, null, 'No marketplace fees', true),
    ('trade', 'Trade', null, false, null, null, null, 'No marketplace fees', true),
    ('gift', 'Gift', null, false, null, null, null, 'No marketplace fees', true),
    ('other', 'Other', null, false, null, null, null, 'Custom marketplace - fees may vary', true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_retailers_name ON retailers(name);
CREATE INDEX IF NOT EXISTS idx_retailers_display_name ON retailers(display_name);
CREATE INDEX IF NOT EXISTS idx_retailers_is_active ON retailers(is_active);

CREATE INDEX IF NOT EXISTS idx_marketplace_name ON marketplace(name);
CREATE INDEX IF NOT EXISTS idx_marketplace_display_name ON marketplace(display_name);
CREATE INDEX IF NOT EXISTS idx_marketplace_is_active ON marketplace(is_active);

-- RLS Policies for retailers table (publicly readable)
ALTER TABLE retailers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access to retailers" ON retailers FOR SELECT USING (true);
CREATE POLICY "Allow retailers inserts" ON retailers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow retailers updates" ON retailers FOR UPDATE USING (true);

-- RLS Policies for marketplace table (publicly readable)
ALTER TABLE marketplace ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access to marketplace" ON marketplace FOR SELECT USING (true);
CREATE POLICY "Allow marketplace inserts" ON marketplace FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow marketplace updates" ON marketplace FOR UPDATE USING (true);
