-- Fix view permissions for Supabase REST API access
-- Run this if you get 404 errors when trying to access views

-- Step 1: Check if views exist
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('individual_orders_clean', 'collection_summary_clean', 'orders_on_hand', 'orders_sold')
ORDER BY table_name;

-- Step 2: Grant permissions to authenticated users and anon (for REST API)
GRANT SELECT ON individual_orders_clean TO authenticated, anon;
GRANT SELECT ON collection_summary_clean TO authenticated, anon;
GRANT SELECT ON orders_on_hand TO authenticated, anon;
GRANT SELECT ON orders_sold TO authenticated, anon;
GRANT SELECT ON orders_partially_sold TO authenticated, anon;
GRANT SELECT ON orders_fully_sold TO authenticated, anon;

-- Step 3: Enable RLS on views (Supabase requires this)
-- Views inherit RLS from underlying tables, but we need to enable it
ALTER VIEW individual_orders_clean SET (security_barrier = true);
ALTER VIEW collection_summary_clean SET (security_barrier = true);

-- Step 4: Verify the schema is exposed in the API
-- This makes the views available through PostgREST (Supabase's REST API)
-- Note: You may also need to check your Supabase API settings

-- Check current permissions
SELECT 
    schemaname,
    tablename as viewname,
    'SELECT' as privilege,
    grantee
FROM pg_tables t
JOIN information_schema.role_table_grants g 
    ON g.table_name = t.tablename 
    AND g.table_schema = t.schemaname
WHERE schemaname = 'public' 
AND tablename IN ('individual_orders_clean', 'collection_summary_clean')
UNION ALL
SELECT 
    schemaname,
    viewname,
    'SELECT' as privilege,
    grantee
FROM pg_views v
JOIN information_schema.role_table_grants g 
    ON g.table_name = v.viewname 
    AND g.table_schema = v.schemaname
WHERE schemaname = 'public' 
AND viewname IN ('individual_orders_clean', 'collection_summary_clean', 'orders_on_hand', 'orders_sold')
ORDER BY viewname, grantee;

SELECT 'Permissions granted! If you still get 404 errors, check Supabase API Settings > Exposed schemas includes "public"' as status;

