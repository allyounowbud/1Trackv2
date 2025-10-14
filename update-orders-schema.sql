-- Add API card fields to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS api_card_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS api_card_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS api_card_set TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS api_card_image_url TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS api_card_market_value_cents INTEGER;

-- Make item_id nullable (since API cards won't have an item_id)
ALTER TABLE orders ALTER COLUMN item_id DROP NOT NULL;

-- Drop and recreate the foreign key constraint to allow NULL item_id
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_item_id_fkey;
ALTER TABLE orders ADD CONSTRAINT orders_item_id_fkey 
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL;

-- Add indexes for the new API card fields
CREATE INDEX IF NOT EXISTS idx_orders_api_card_id ON orders(api_card_id);
CREATE INDEX IF NOT EXISTS idx_orders_api_card_name ON orders(api_card_name);
CREATE INDEX IF NOT EXISTS idx_orders_api_card_set ON orders(api_card_set);

-- Update the individual_orders_clean view to handle API card data
CREATE OR REPLACE VIEW individual_orders_clean AS
SELECT 
  o.id,
  o.order_group_id,
  o.item_id,
  o.user_id,
  o.quantity,
  o.price_cents,
  o.market_value_cents,
  o.order_date,
  o.created_at,
  o.updated_at,
  o.order_number,
  o.order_source,
  o.notes,
  o.api_card_id,
  o.api_card_name,
  o.api_card_set,
  o.api_card_image_url,
  o.api_card_market_value_cents,
  -- Use API card data when item_id is null, otherwise use item data
  COALESCE(
    CASE 
      WHEN o.item_id IS NULL THEN o.api_card_name
      ELSE i.name 
    END,
    'Unknown Item'
  ) as item_name,
  COALESCE(
    CASE 
      WHEN o.item_id IS NULL THEN o.api_card_set
      ELSE i.set_name 
    END,
    'Unknown Set'
  ) as set_name,
  COALESCE(
    CASE 
      WHEN o.item_id IS NULL THEN o.api_card_image_url
      ELSE i.image_url 
    END,
    '/icons/other.png'
  ) as image_url,
  COALESCE(
    CASE 
      WHEN o.item_id IS NULL THEN o.api_card_market_value_cents
      ELSE o.market_value_cents 
    END,
    0
  ) as effective_market_value_cents
FROM orders o
LEFT JOIN items i ON o.item_id = i.id
WHERE o.user_id = auth.uid();

-- Update the collection_summary_clean view to handle API card data
CREATE OR REPLACE VIEW collection_summary_clean AS
SELECT 
  COALESCE(
    CASE 
      WHEN o.item_id IS NULL THEN o.api_card_name
      ELSE i.name 
    END,
    'Unknown Item'
  ) as item_name,
  COALESCE(
    CASE 
      WHEN o.item_id IS NULL THEN o.api_card_set
      ELSE i.set_name 
    END,
    'Unknown Set'
  ) as set_name,
  COALESCE(
    CASE 
      WHEN o.item_id IS NULL THEN o.api_card_image_url
      ELSE i.image_url 
    END,
    '/icons/other.png'
  ) as image_url,
  o.order_group_id,
  SUM(o.quantity) as total_quantity,
  AVG(o.price_cents) as avg_price_cents,
  COALESCE(
    CASE 
      WHEN o.item_id IS NULL THEN o.api_card_market_value_cents
      ELSE o.market_value_cents 
    END,
    0
  ) as market_value_cents,
  MAX(o.order_date) as latest_order_date,
  COUNT(*) as order_count
FROM orders o
LEFT JOIN items i ON o.item_id = i.id
WHERE o.user_id = auth.uid()
GROUP BY 
  COALESCE(
    CASE 
      WHEN o.item_id IS NULL THEN o.api_card_name
      ELSE i.name 
    END,
    'Unknown Item'
  ),
  COALESCE(
    CASE 
      WHEN o.item_id IS NULL THEN o.api_card_set
      ELSE i.set_name 
    END,
    'Unknown Set'
  ),
  COALESCE(
    CASE 
      WHEN o.item_id IS NULL THEN o.api_card_image_url
      ELSE i.image_url 
    END,
    '/icons/other.png'
  ),
  o.order_group_id,
  COALESCE(
    CASE 
      WHEN o.item_id IS NULL THEN o.api_card_market_value_cents
      ELSE o.market_value_cents 
    END,
    0
  );
