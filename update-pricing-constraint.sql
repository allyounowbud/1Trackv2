-- Fix the pricing schema to allow multiple records per card
-- This allows storing all pricing variants (raw/graded, different conditions, etc.)

-- Drop the restrictive unique constraint
DROP INDEX IF EXISTS idx_card_prices_unique;

-- Create a more flexible unique constraint that allows multiple pricing records per card
-- but prevents exact duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_card_prices_unique_flexible ON card_prices(
  card_id, 
  price_type, 
  COALESCE(raw_condition, ''), 
  COALESCE(grade, ''), 
  COALESCE(company, ''),
  COALESCE(market::text, '')
);

-- Verify the constraint was created
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'card_prices'::regclass 
AND conname LIKE '%unique%';




