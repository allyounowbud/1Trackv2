-- Fix card_condition column to allow NULL values for sealed products
-- This removes the NOT NULL constraint from the card_condition column

-- Alter the orders table to allow NULL values in card_condition column
ALTER TABLE orders ALTER COLUMN card_condition DROP NOT NULL;

-- Verify the change
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name = 'card_condition';
