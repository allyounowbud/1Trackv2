-- Copy and paste this SQL into your Supabase dashboard SQL editor
-- This will fix the collection view to include the new item_type and card_condition fields
-- and allow NULL values for card_condition column

-- First, fix the card_condition column to allow NULL values for sealed products
ALTER TABLE orders ALTER COLUMN card_condition DROP NOT NULL;

-- Drop the existing view
DROP VIEW IF EXISTS collection_summary_clean;

-- Create the updated view with new fields
CREATE VIEW collection_summary_clean AS
SELECT 
  -- Item identification
  COALESCE(
    CASE 
      WHEN o.item_id IS NULL THEN o.api_card_name
      ELSE i.item_name 
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
  
  -- NEW: Item classification fields (these were missing!)
  o.item_type,
  o.card_condition,
  o.grading_company,
  o.grading_grade,
  
  -- Collection data
  o.order_group_id,
  o.item_id, -- Add item_id to GROUP BY
  SUM(o.quantity) as total_quantity,
  AVG(o.price_per_item_cents) as avg_price_cents,
  COALESCE(
    CASE 
      WHEN o.item_id IS NULL THEN MAX(o.api_card_market_value_cents)
      ELSE MAX(i.market_value_cents) 
    END,
    0
  ) as market_value_cents,
  MAX(o.purchase_date) as latest_order_date,
  COUNT(*) as order_count
  
FROM orders o
LEFT JOIN items i ON o.item_id = i.id
WHERE o.user_id = auth.uid()
GROUP BY 
  -- Group by item identification
  COALESCE(
    CASE 
      WHEN o.item_id IS NULL THEN o.api_card_name
      ELSE i.item_name 
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
  
  -- Group by NEW classification fields (these were missing!)
  o.item_type,
  o.card_condition,
  o.grading_company,
  o.grading_grade,
  
  -- Group by order group and item_id
  o.order_group_id,
  o.item_id;

-- Test the view
SELECT item_name, item_type, card_condition 
FROM collection_summary_clean 
LIMIT 5;
