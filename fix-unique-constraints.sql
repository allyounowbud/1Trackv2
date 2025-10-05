-- Fix unique constraints for cached_cards and cached_sealed_products tables
-- This is needed for the ON CONFLICT clause to work properly

-- Add unique constraint to cached_cards table
ALTER TABLE cached_cards ADD CONSTRAINT cached_cards_api_id_unique UNIQUE (api_id);

-- Add unique constraint to cached_sealed_products table  
ALTER TABLE cached_sealed_products ADD CONSTRAINT cached_sealed_products_api_id_unique UNIQUE (api_id);

-- Verify the constraints were added
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_name IN ('cached_cards', 'cached_sealed_products')
    AND tc.constraint_type = 'UNIQUE'
ORDER BY tc.table_name, tc.constraint_name;
