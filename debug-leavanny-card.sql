-- Debug query to find Leavanny card in pokemon_cards table
-- This will help us understand why the JOIN isn't working

-- 1. Search for any Leavanny cards in pokemon_cards table (various name formats)
SELECT 
    id,
    name,
    expansion_name,
    raw_market,
    graded_market,
    number
FROM pokemon_cards 
WHERE name ILIKE '%leavanny%'
   OR name ILIKE '%Leavanny%'
   OR name LIKE '%89%'  -- Search by card number
   OR expansion_name ILIKE '%white%flare%'
   OR expansion_name ILIKE '%white flare%';

-- 2. Search for cards from "White Flare" expansion
SELECT 
    id,
    name,
    expansion_name,
    raw_market,
    graded_market,
    number
FROM pokemon_cards 
WHERE expansion_name ILIKE '%white%flare%'
   OR expansion_name ILIKE '%white flare%'
ORDER BY number;

-- 3. Search for any cards with number "89"
SELECT 
    id,
    name,
    expansion_name,
    raw_market,
    graded_market,
    number
FROM pokemon_cards 
WHERE number = '89'
ORDER BY name;

-- 4. Check if there are any cards with similar names
SELECT 
    id,
    name,
    expansion_name,
    raw_market,
    graded_market,
    number
FROM pokemon_cards 
WHERE name ILIKE '%89%'
ORDER BY name;

-- 5. Count total cards in pokemon_cards table
SELECT COUNT(*) as total_cards FROM pokemon_cards;

-- 6. Check if the pokemon_cards table has any data at all
SELECT 
    COUNT(*) as total_cards,
    COUNT(CASE WHEN raw_market IS NOT NULL THEN 1 END) as cards_with_raw_market,
    COUNT(CASE WHEN graded_market IS NOT NULL THEN 1 END) as cards_with_graded_market
FROM pokemon_cards;
