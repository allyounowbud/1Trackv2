-- Fix for alphanumeric card numbers (e.g., "SV030", "1a", "25b")
-- This handles mixed text/number card identifiers properly

-- Drop the problematic integer index if it exists
DROP INDEX IF EXISTS idx_pokemon_cards_number_numeric;

-- Create a robust index that handles alphanumeric card numbers
-- This extracts only the numeric part and pads it for sorting
CREATE INDEX IF NOT EXISTS idx_pokemon_cards_number_alphanumeric 
ON pokemon_cards(LPAD(REGEXP_REPLACE(number, '[^0-9]', '', 'g'), 10, '0'));

-- Composite index for expansion + alphanumeric number sorting
CREATE INDEX IF NOT EXISTS idx_pokemon_cards_expansion_number_alphanumeric 
ON pokemon_cards(expansion_id, LPAD(REGEXP_REPLACE(number, '[^0-9]', '', 'g'), 10, '0'));

-- Test the sorting function
SELECT 
    number as original_number,
    REGEXP_REPLACE(number, '[^0-9]', '', 'g') as numeric_part,
    LPAD(REGEXP_REPLACE(number, '[^0-9]', '', 'g'), 10, '0') as padded_sort
FROM pokemon_cards 
WHERE expansion_id = 'sv1' 
ORDER BY LPAD(REGEXP_REPLACE(number, '[^0-9]', '', 'g'), 10, '0')
LIMIT 10;
