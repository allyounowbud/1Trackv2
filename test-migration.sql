-- Simple test to verify the migration works
-- Run this after the main migration to check everything is working

-- Test 1: Check that confusing tables are gone
SELECT 'Confusing tables removed' as test_result
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name IN ('buy_orders', 'sell_orders', 'order_links')
);

-- Test 2: Check that orders table has the right columns
SELECT 'Orders table has correct columns' as test_result
WHERE EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'order_number'
) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'status'
);

-- Test 3: Check that functions exist
SELECT 'Functions created successfully' as test_result
WHERE EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'create_clean_order'
) AND EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'mark_order_sold'
) AND EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'delete_order_clean'
);

-- Test 4: Check that views exist
SELECT 'Views created successfully' as test_result
WHERE EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_name = 'individual_orders_clean'
) AND EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_name = 'collection_summary_clean'
);

-- Test 5: Check that orders have order numbers
SELECT 
    COUNT(*) as total_orders,
    COUNT(order_number) as orders_with_numbers
FROM orders;

-- Test 6: Test creating a new order (if you have items)
-- Uncomment this if you want to test creating an order
/*
SELECT create_clean_order(
    (SELECT id FROM items LIMIT 1), -- Use first item
    '2024-01-01', 
    500, -- $5.00
    1, 
    'Test Store', 
    NULL, 
    NULL, 
    'Test order'
);
*/
