-- Add missing columns to orders table

ALTER TABLE orders ADD COLUMN IF NOT EXISTS buy_location TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ordered';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS card_type TEXT DEFAULT 'ungraded';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS graded_company TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS graded_grade TEXT;
