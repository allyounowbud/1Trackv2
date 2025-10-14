-- Add missing columns to orders table for proper functionality

-- Add buy_location column (for retailer dropdown)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS buy_location TEXT;

-- Add status column (to track if order has been sold or not)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ordered';

-- Add card_type column (to track if card is ungraded or graded)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS card_type TEXT DEFAULT 'ungraded';

-- Add graded_company column (to store grading company if card is graded)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS graded_company TEXT;

-- Add graded_grade column (to store grade if card is graded)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS graded_grade TEXT;

-- Create indexes for better performance on new columns
CREATE INDEX IF NOT EXISTS idx_orders_buy_location ON orders(buy_location);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_card_type ON orders(card_type);
CREATE INDEX IF NOT EXISTS idx_orders_graded_company ON orders(graded_company);
CREATE INDEX IF NOT EXISTS idx_orders_graded_grade ON orders(graded_grade);
