-- Fix orders table security by adding user authentication
-- This ensures users can only see and manage their own orders

-- 1. Add user_id column to orders table if it doesn't exist
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Create index for better performance on user_id queries
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);

-- 3. Enable Row Level Security on orders table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for orders table

-- Policy: Users can only see their own orders
CREATE POLICY "Users can view their own orders" ON orders
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can only insert orders for themselves
CREATE POLICY "Users can insert their own orders" ON orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own orders
CREATE POLICY "Users can update their own orders" ON orders
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can only delete their own orders
CREATE POLICY "Users can delete their own orders" ON orders
    FOR DELETE USING (auth.uid() = user_id);

-- 5. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON orders TO authenticated;

-- 6. Create a function to automatically set user_id on insert
CREATE OR REPLACE FUNCTION set_user_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Only set user_id if it's not already set
    IF NEW.user_id IS NULL THEN
        NEW.user_id = auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create trigger to automatically set user_id on insert
DROP TRIGGER IF EXISTS set_orders_user_id ON orders;
CREATE TRIGGER set_orders_user_id
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION set_user_id();

-- 8. Update existing orders to have user_id (if any exist without it)
-- Note: This will set user_id to NULL for existing orders without a user
-- You may want to handle this differently based on your data migration needs
UPDATE orders SET user_id = NULL WHERE user_id IS NULL;

-- 9. Make user_id NOT NULL after setting defaults
-- Comment this out if you have existing orders that need manual assignment
-- ALTER TABLE orders ALTER COLUMN user_id SET NOT NULL;

-- 10. Update views to include user filtering
-- Note: These views may need to be recreated to include user_id filtering
-- You'll need to check if these views exist and update them accordingly

-- Example view update (uncomment and modify as needed):
-- DROP VIEW IF EXISTS individual_orders_clean;
-- CREATE VIEW individual_orders_clean AS
-- SELECT 
--     o.*,
--     i.name as item_name,
--     i.set_name,
--     i.image_url,
--     i.market_value_cents,
--     i.item_type,
--     i.card_number
-- FROM orders o
-- JOIN items i ON o.item_id = i.id
-- WHERE o.user_id = auth.uid(); -- This ensures user can only see their own orders

-- DROP VIEW IF EXISTS collection_summary_clean;
-- CREATE VIEW collection_summary_clean AS
-- SELECT 
--     i.id as item_id,
--     i.name as item_name,
--     i.set_name,
--     i.image_url,
--     i.market_value_cents,
--     i.item_type,
--     i.card_number,
--     COUNT(o.id) as total_orders,
--     SUM(o.buy_quantity) as total_quantity,
--     AVG(o.buy_price_cents) as avg_buy_price_cents
-- FROM items i
-- JOIN orders o ON i.id = o.item_id
-- WHERE o.user_id = auth.uid() -- This ensures user can only see their own collection
-- GROUP BY i.id, i.name, i.set_name, i.image_url, i.market_value_cents, i.item_type, i.card_number;

-- 11. Verify the setup
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'orders';

-- Show the table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position;
