-- Fix card_prices table to allow upsert operations
-- Run this in your Supabase SQL Editor

-- Add unique constraint on card_id for upsert operations
ALTER TABLE card_prices ADD CONSTRAINT card_prices_card_id_unique UNIQUE (card_id);

-- Verify the constraint was added
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'card_prices'::regclass 
AND conname = 'card_prices_card_id_unique';
