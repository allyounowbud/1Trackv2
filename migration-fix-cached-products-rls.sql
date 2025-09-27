-- Fix RLS policies for cached_products table
-- This migration fixes the row-level security policies to allow service role to write data

-- Drop existing policies
DROP POLICY IF EXISTS "Service role can manage cached_products" ON cached_products;
DROP POLICY IF EXISTS "Authenticated users can read cached_products" ON cached_products;

-- Create new policies that allow service role to manage all operations
CREATE POLICY "Service role can manage cached_products" ON cached_products
    FOR ALL USING (auth.role() = 'service_role');

-- Create policy for authenticated users to read data
CREATE POLICY "Authenticated users can read cached_products" ON cached_products
    FOR SELECT USING (auth.role() = 'authenticated');

-- Also fix the other cache tables to ensure consistency
DROP POLICY IF EXISTS "Service role can manage cached_cards" ON cached_cards;
DROP POLICY IF EXISTS "Authenticated users can read cached_cards" ON cached_cards;

CREATE POLICY "Service role can manage cached_cards" ON cached_cards
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read cached_cards" ON cached_cards
    FOR SELECT USING (auth.role() = 'authenticated');

-- Fix cached_expansions
DROP POLICY IF EXISTS "Service role can manage cached_expansions" ON cached_expansions;
DROP POLICY IF EXISTS "Authenticated users can read cached_expansions" ON cached_expansions;

CREATE POLICY "Service role can manage cached_expansions" ON cached_expansions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read cached_expansions" ON cached_expansions
    FOR SELECT USING (auth.role() = 'authenticated');

-- Fix cached_market_data
DROP POLICY IF EXISTS "Service role can manage cached_market_data" ON cached_market_data;
DROP POLICY IF EXISTS "Authenticated users can read cached_market_data" ON cached_market_data;

CREATE POLICY "Service role can manage cached_market_data" ON cached_market_data
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read cached_market_data" ON cached_market_data
    FOR SELECT USING (auth.role() = 'authenticated');

-- Fix api_cache
DROP POLICY IF EXISTS "Service role can manage api_cache" ON api_cache;
DROP POLICY IF EXISTS "Authenticated users can read api_cache" ON api_cache;

CREATE POLICY "Service role can manage api_cache" ON api_cache
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read api_cache" ON api_cache
    FOR SELECT USING (auth.role() = 'authenticated');
