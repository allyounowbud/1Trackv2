-- Fix for view dependency error when running migrations
-- Run this if you get: "cannot drop view individual_orders_clean because other objects depend on it"

-- Drop all views with CASCADE to remove dependencies
DROP VIEW IF EXISTS orders_fully_sold CASCADE;
DROP VIEW IF EXISTS orders_partially_sold CASCADE;
DROP VIEW IF EXISTS orders_sold CASCADE;
DROP VIEW IF EXISTS orders_on_hand CASCADE;
DROP VIEW IF EXISTS individual_orders_clean CASCADE;
DROP VIEW IF EXISTS collection_summary_clean CASCADE;

-- Now you can run your migration scripts without errors!
-- Next steps:
-- 1. Run: migrate-to-quantity-based-sales.sql
-- 2. Run: create-mark-order-sold-function.sql
-- 3. Run: cleanup-orders-table.sql (optional)

SELECT 'Views dropped successfully! You can now run your migration scripts.' as status;

