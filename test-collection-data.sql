-- Test query to check if the collection views are working with pokemon_cards data
-- Run this in Supabase SQL Editor to debug the issue

-- 1. Check if the views exist and their structure
SELECT 
    schemaname,
    viewname,
    definition
FROM pg_views 
WHERE viewname IN ('individual_orders_clean', 'collection_summary_clean');

-- 2. Check what data exists in the items table for Leavanny
SELECT 
    id,
    name,
    set_name,
    market_value_cents,
    item_type
FROM items 
WHERE name ILIKE '%leavanny%' 
   OR name ILIKE '%Leavanny%';

-- 3. Check what data exists in the pokemon_cards table for Leavanny
SELECT 
    id,
    name,
    expansion_name,
    raw_market,
    graded_market
FROM pokemon_cards 
WHERE name ILIKE '%leavanny%' 
   OR name ILIKE '%Leavanny%';

-- 4. Test the join manually to see if it works
SELECT 
    i.id as item_id,
    i.name as item_name,
    i.set_name as item_set,
    i.market_value_cents as item_market_value,
    pc.id as pokemon_card_id,
    pc.name as pokemon_card_name,
    pc.expansion_name as pokemon_card_set,
    pc.raw_market,
    pc.graded_market,
    COALESCE(
        pc.raw_market * 100, 
        pc.graded_market * 100, 
        i.market_value_cents, 
        0
    ) as calculated_market_value_cents
FROM items i
LEFT JOIN pokemon_cards pc ON (
    i.name = pc.name AND i.set_name = pc.expansion_name
)
WHERE i.name ILIKE '%leavanny%' 
   OR i.name ILIKE '%Leavanny%';

-- 5. Check the current collection data from the view
SELECT 
    item_name,
    set_name,
    market_value_cents,
    total_cost_cents
FROM individual_orders_clean 
WHERE item_name ILIKE '%leavanny%' 
   OR item_name ILIKE '%Leavanny%';
