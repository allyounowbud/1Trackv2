-- Add graded card tracking columns to orders table
-- This allows tracking whether an order is for raw or graded cards and their grading details

-- Add the new columns
ALTER TABLE orders ADD COLUMN IF NOT EXISTS card_type TEXT DEFAULT 'raw';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS graded_company TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS graded_grade TEXT;

-- Add comments for documentation
COMMENT ON COLUMN orders.card_type IS 'Type of card: raw or graded';
COMMENT ON COLUMN orders.graded_company IS 'Grading company (PSA, BGS, CGC, SGC) for graded cards';
COMMENT ON COLUMN orders.graded_grade IS 'Grade (1-10) for graded cards';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_card_type ON orders(card_type);
CREATE INDEX IF NOT EXISTS idx_orders_graded_company ON orders(graded_company);
CREATE INDEX IF NOT EXISTS idx_orders_graded_grade ON orders(graded_grade);

-- Update existing orders to have default card_type
UPDATE orders SET card_type = 'raw' WHERE card_type IS NULL;
