-- Update collection_summary_clean view to include new item_type and card_condition fields
-- This fixes the "Unknown" display issue in the collection

-- Drop and recreate the collection_summary_clean view with new fields
DROP VIEW IF EXISTS collection_summary_clean;

-- Create updated collection summary view with new fields
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
  
  -- NEW: Item classification fields
  o.item_type,
  o.card_condition,
  o.grading_company,
  o.grading_grade,
  
  -- Collection data
  o.order_group_id,
  SUM(o.quantity) as total_quantity,
  AVG(o.price_per_item_cents) as avg_price_cents,
  COALESCE(
    CASE 
      WHEN o.item_id IS NULL THEN o.api_card_market_value_cents
      ELSE i.market_value_cents 
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
  
  -- Group by NEW classification fields
  o.item_type,
  o.card_condition,
  o.grading_company,
  o.grading_grade,
  
  -- Group by order group
  o.order_group_id;

-- Also update the individual_orders_clean view to include new fields
DROP VIEW IF EXISTS individual_orders_clean;

CREATE VIEW individual_orders_clean AS
SELECT 
  o.id,
  o.user_id,
  o.order_group_id,
  o.order_number,
  o.item_id,
  o.api_card_id,
  o.api_card_name,
  o.api_card_set,
  o.api_card_image_url,
  o.api_card_market_value_cents,
  
  -- NEW: Item classification fields
  o.item_type,
  o.card_condition,
  o.grading_company,
  o.grading_grade,
  
  -- Order details
  o.purchase_date,
  o.retailer_id,
  o.marketplace_id,
  o.retailer_name,
  o.quantity,
  o.price_per_item_cents,
  o.total_cost_cents,
  o.is_sold,
  o.sale_date,
  o.quantity_sold,
  o.sale_retailer_id,
  o.sale_marketplace_id,
  o.sale_retailer_name,
  o.sale_price_per_item_cents,
  o.sale_total_cents,
  o.sale_fees_cents,
  o.sale_shipping_cents,
  o.sale_net_cents,
  o.notes,
  o.created_at,
  o.updated_at,
  
  -- Item details (coalesce custom vs API data)
  COALESCE(i.item_name, o.api_card_name) AS item_name,
  COALESCE(i.set_name, o.api_card_set) AS set_name,
  COALESCE(i.image_url, o.api_card_image_url) AS image_url,
  COALESCE(i.market_value_cents, o.api_card_market_value_cents, 0) AS market_value_cents,
  
  -- Purchase location details
  r_purchase.display_name AS purchase_retailer_display,
  m_purchase.display_name AS purchase_marketplace_display,
  COALESCE(r_purchase.display_name, m_purchase.display_name, o.retailer_name) AS purchase_location_display,
  
  -- Sale location details
  r_sale.display_name AS sale_retailer_display,
  m_sale.display_name AS sale_marketplace_display,
  COALESCE(r_sale.display_name, m_sale.display_name, o.sale_retailer_name) AS sale_location_display
  
FROM orders o
LEFT JOIN items i ON o.item_id = i.id
LEFT JOIN retailers r_purchase ON o.retailer_id = r_purchase.id
LEFT JOIN marketplace m_purchase ON o.marketplace_id = m_purchase.id
LEFT JOIN retailers r_sale ON o.sale_retailer_id = r_sale.id
LEFT JOIN marketplace m_sale ON o.sale_marketplace_id = m_sale.id
WHERE o.user_id = auth.uid();
