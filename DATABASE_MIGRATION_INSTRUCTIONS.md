# Database Migration Instructions

## Issue
The collection is showing "Unknown Set" for all items because:
1. The `card_number` field is missing from the `individual_orders_clean` view
2. The `set_name` field may not be populated correctly in the `items` table

## Solution
Run the following SQL in your Supabase dashboard:

### Step 1: Go to Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to SQL Editor

### Step 2: Run the Migration
Copy and paste this SQL:

```sql
-- Migration to add card_number to individual_orders_clean view
-- This ensures the card number from the API is available in the collection display

-- Drop and recreate the view with card_number field
DROP VIEW IF EXISTS individual_orders_clean;

CREATE VIEW individual_orders_clean AS
SELECT 
    o.id,
    o.item_id,
    o.order_number,
    o.buy_date,
    o.buy_price_cents,
    o.buy_quantity,
    o.buy_location,
    o.buy_marketplace_id,
    o.buy_retailer_id,
    o.buy_notes,
    o.sell_date,
    o.sell_price_cents,
    o.sell_quantity,
    o.sell_location,
    o.sell_marketplace_id,
    o.sell_retailer_id,
    o.sell_fees_cents,
    o.sell_notes,
    o.status,
    o.is_sold,
    o.total_cost_cents,
    o.total_revenue_cents,
    o.net_profit_cents,
    o.profit_percentage,
    o.created_at,
    o.updated_at,
    -- Item details
    i.name as item_name,
    i.set_name,
    i.item_type,
    i.card_number,
    i.market_value_cents,
    i.image_url,
    -- Marketplace details
    m_buy.display_name as buy_marketplace_name,
    m_sell.display_name as sell_marketplace_name,
    -- Retailer details
    r_buy.name as buy_retailer_name,
    r_sell.name as sell_retailer_name
FROM orders o
JOIN items i ON o.item_id = i.id
LEFT JOIN marketplaces m_buy ON o.buy_marketplace_id = m_buy.id
LEFT JOIN marketplaces m_sell ON o.sell_marketplace_id = m_sell.id
LEFT JOIN retailers r_buy ON o.buy_retailer_id = r_buy.id
LEFT JOIN retailers r_sell ON o.sell_retailer_id = r_sell.id
ORDER BY o.item_id, o.order_number;

-- Add comment
COMMENT ON VIEW individual_orders_clean IS 'Individual orders with order numbers and card numbers for easy management';
```

### Step 3: Verify the Migration
After running the migration, you can verify it worked by running this query:

```sql
SELECT 
    item_name,
    set_name,
    card_number,
    item_type
FROM individual_orders_clean 
LIMIT 5;
```

This should show the set names and card numbers for your items.

## Next Steps
1. Run the migration
2. Try adding a new item to your collection
3. Check the browser console for debug logs showing what data is being inserted
4. Verify that set names appear correctly in the collection view
