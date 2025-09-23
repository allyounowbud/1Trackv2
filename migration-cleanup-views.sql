-- Migration script to clean up unnecessary views and tables
-- Run this to remove summary views and keep only essential transactional data

-- =============================================
-- DROP UNNECESSARY VIEWS
-- =============================================

-- Drop collection summary view (calculations done on frontend)
DROP VIEW IF EXISTS collection_summary;

-- Drop current inventory view (calculations done on frontend)
DROP VIEW IF EXISTS current_inventory;

-- Drop sold items view (calculations done on frontend)
DROP VIEW IF EXISTS sold_items;

-- =============================================
-- ADD RETAILERS TABLE (if not exists)
-- =============================================

-- Create retailers table if it doesn't exist
CREATE TABLE IF NOT EXISTS retailers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL, -- Retailer name: "Target", "Walmart", "Local Store", etc.
    location TEXT, -- Physical location or website
    notes TEXT, -- Additional notes about the retailer
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add retailer columns to orders table if they don't exist
DO $$ 
BEGIN
    -- Add buy_retailer_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'buy_retailer_id') THEN
        ALTER TABLE orders ADD COLUMN buy_retailer_id UUID REFERENCES retailers(id);
    END IF;
    
    -- Add sell_retailer_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'sell_retailer_id') THEN
        ALTER TABLE orders ADD COLUMN sell_retailer_id UUID REFERENCES retailers(id);
    END IF;
END $$;

-- =============================================
-- ADD INDEXES FOR RETAILERS
-- =============================================

-- Create indexes for retailers table
CREATE INDEX IF NOT EXISTS idx_retailers_name ON retailers(name);

-- Create indexes for new retailer columns in orders
CREATE INDEX IF NOT EXISTS idx_orders_buy_retailer_id ON orders(buy_retailer_id);
CREATE INDEX IF NOT EXISTS idx_orders_sell_retailer_id ON orders(sell_retailer_id);

-- =============================================
-- ENABLE RLS FOR RETAILERS
-- =============================================

-- Enable RLS on retailers table
ALTER TABLE retailers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for retailers
DO $$ 
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view all retailers" ON retailers;
    DROP POLICY IF EXISTS "Users can insert retailers" ON retailers;
    DROP POLICY IF EXISTS "Users can update retailers" ON retailers;
    DROP POLICY IF EXISTS "Users can delete retailers" ON retailers;
    
    -- Create new policies (retailers are shared across users for now)
    CREATE POLICY "Users can view all retailers" ON retailers FOR SELECT USING (true);
    CREATE POLICY "Users can insert retailers" ON retailers FOR INSERT WITH CHECK (true);
    CREATE POLICY "Users can update retailers" ON retailers FOR UPDATE USING (true);
    CREATE POLICY "Users can delete retailers" ON retailers FOR DELETE USING (true);
END $$;

-- =============================================
-- ADD TRIGGER FOR RETAILERS
-- =============================================

-- Create trigger for retailers updated_at
CREATE TRIGGER trigger_retailers_updated_at
    BEFORE UPDATE ON retailers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ADD COMMENTS
-- =============================================

COMMENT ON TABLE retailers IS 'User-specific retailers that grow as orders are placed';

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Verify the cleanup was successful
SELECT 'Views dropped successfully' as status
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_name IN ('collection_summary', 'current_inventory', 'sold_items')
);

-- Verify retailers table exists
SELECT 'Retailers table created successfully' as status
WHERE EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'retailers'
);

-- Verify retailer columns added to orders
SELECT 'Retailer columns added to orders successfully' as status
WHERE EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'buy_retailer_id'
) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'sell_retailer_id'
);
