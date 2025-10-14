-- Fix RLS policies for orders table
-- The current policies might be too restrictive or missing

-- Drop existing policies to ensure clean recreation
DROP POLICY IF EXISTS "Users can manage their own orders" ON orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
DROP POLICY IF EXISTS "Users can insert their own orders" ON orders;
DROP POLICY IF EXISTS "Users can update their own orders" ON orders;
DROP POLICY IF EXISTS "Users can delete their own orders" ON orders;

-- Create comprehensive RLS policies for orders table
CREATE POLICY "Users can view their own orders" ON orders 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own orders" ON orders 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own orders" ON orders 
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own orders" ON orders 
FOR DELETE USING (auth.uid() = user_id);

-- Also ensure the orders table has RLS enabled
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Verify the policies are working by checking if user_id is properly set
-- The error suggests the user_id might not be matching auth.uid()
