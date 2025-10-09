-- Debug query for Mega Gardevoir ex to see why it's showing $10 instead of $327.76
-- This will show us exactly what values are being used in the collection view

-- 1. Check the items table for Mega Gardevoir ex
SELECT 
    id,
    name,
    set_name,
    market_value_cents,
    item_type
FROM items 
WHERE name ILIKE '%Mega Gardevoir ex%' 
   OR name ILIKE '%Gardevoir%';

-- 2. Check the pokemon_cards table for Mega Gardevoir ex
SELECT 
    id,
    name,
    expansion_name,
    raw_market,
    graded_market,
    number
FROM pokemon_cards 
WHERE name ILIKE '%Mega Gardevoir ex%' 
   OR name ILIKE '%Gardevoir%';

-- 3. Test the JOIN manually with the exact logic from our view
SELECT 
    i.id as item_id,
    i.name as item_name,
    i.set_name as item_set,
    i.market_value_cents as item_market_value_cents,
    pc.id as pokemon_card_id,
    pc.name as pokemon_card_name,
    pc.expansion_name as pokemon_card_set,
    pc.raw_market,
    pc.graded_market,
    -- Test each JOIN condition
    CASE 
        WHEN i.name = pc.name THEN 'Exact match'
        WHEN i.name LIKE pc.name || ' #%' THEN 'Name with # match'
        WHEN pc.name = SPLIT_PART(i.name, ' #', 1) THEN 'Split match'
        ELSE 'No match'
    END as join_type,
    -- This is the COALESCE logic from our view
    COALESCE(
        pc.raw_market * 100, 
        pc.graded_market * 100, 
        i.market_value_cents, 
        0
    ) as calculated_market_value_cents
FROM items i
LEFT JOIN pokemon_cards pc ON (
    -- Handle name differences: "Mega Gardevoir ex #178" vs "Mega Gardevoir ex"
    (i.name = pc.name) OR 
    (i.name LIKE pc.name || ' #%') OR
    (pc.name = SPLIT_PART(i.name, ' #', 1))
) AND i.set_name = pc.expansion_name
WHERE i.name ILIKE '%Mega Gardevoir ex%' 
   OR i.name ILIKE '%Gardevoir%';

-- 4. Check what the current collection view is returning
SELECT 
    item_name,
    set_name,
    market_value_cents,
    total_cost_cents,
    buy_quantity
FROM individual_orders_clean 
WHERE item_name ILIKE '%Mega Gardevoir ex%' 
   OR item_name ILIKE '%Gardevoir%';

-- 5. Check if there are multiple orders for this item
SELECT 
    item_name,
    set_name,
    market_value_cents,
    buy_quantity,
    total_cost_cents,
    order_number
FROM individual_orders_clean 
WHERE item_name ILIKE '%Mega Gardevoir ex%' 
   OR item_name ILIKE '%Gardevoir%'
ORDER BY order_number;
