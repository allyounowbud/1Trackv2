-- Add API card fields to orders table to support API-sourced cards without creating items
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS api_card_id TEXT,
ADD COLUMN IF NOT EXISTS api_card_name TEXT,
ADD COLUMN IF NOT EXISTS api_card_set TEXT,
ADD COLUMN IF NOT EXISTS api_card_image_url TEXT,
ADD COLUMN IF NOT EXISTS api_card_market_value_cents INTEGER;

-- Make item_id nullable to support API-sourced cards
ALTER TABLE orders ALTER COLUMN item_id DROP NOT NULL;

-- Drop the foreign key constraint temporarily
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_item_id_fkey;

-- Re-add the foreign key constraint with ON DELETE SET NULL
ALTER TABLE orders ADD CONSTRAINT orders_item_id_fkey 
FOREIGN KEY (item_id) REFERENCES items (id) ON DELETE SET NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_api_card_id ON orders(api_card_id);
CREATE INDEX IF NOT EXISTS idx_orders_api_card_name ON orders(api_card_name);
