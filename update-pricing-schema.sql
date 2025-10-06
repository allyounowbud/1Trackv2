-- Update cached_cards and cached_sealed_products tables to store comprehensive pricing data
-- This includes all the detailed pricing fields from PriceCharting API

-- Add comprehensive pricing fields to cached_cards table
ALTER TABLE cached_cards ADD COLUMN IF NOT EXISTS bgs_10_price DECIMAL(10,2);
ALTER TABLE cached_cards ADD COLUMN IF NOT EXISTS condition_17_price DECIMAL(10,2);
ALTER TABLE cached_cards ADD COLUMN IF NOT EXISTS condition_18_price DECIMAL(10,2);
ALTER TABLE cached_cards ADD COLUMN IF NOT EXISTS box_only_price DECIMAL(10,2);
ALTER TABLE cached_cards ADD COLUMN IF NOT EXISTS cib_price DECIMAL(10,2);
ALTER TABLE cached_cards ADD COLUMN IF NOT EXISTS loose_price DECIMAL(10,2);
ALTER TABLE cached_cards ADD COLUMN IF NOT EXISTS new_price DECIMAL(10,2);
ALTER TABLE cached_cards ADD COLUMN IF NOT EXISTS retail_new_buy DECIMAL(10,2);
ALTER TABLE cached_cards ADD COLUMN IF NOT EXISTS retail_new_sell DECIMAL(10,2);
ALTER TABLE cached_cards ADD COLUMN IF NOT EXISTS retail_cib_buy DECIMAL(10,2);
ALTER TABLE cached_cards ADD COLUMN IF NOT EXISTS retail_cib_sell DECIMAL(10,2);
ALTER TABLE cached_cards ADD COLUMN IF NOT EXISTS retail_loose_buy DECIMAL(10,2);
ALTER TABLE cached_cards ADD COLUMN IF NOT EXISTS retail_loose_sell DECIMAL(10,2);
ALTER TABLE cached_cards ADD COLUMN IF NOT EXISTS gamestop_price DECIMAL(10,2);
ALTER TABLE cached_cards ADD COLUMN IF NOT EXISTS gamestop_trade_price DECIMAL(10,2);
ALTER TABLE cached_cards ADD COLUMN IF NOT EXISTS raw_pricing_data JSONB; -- Store complete raw pricing data

-- Add comprehensive pricing fields to cached_sealed_products table
ALTER TABLE cached_sealed_products ADD COLUMN IF NOT EXISTS bgs_10_price DECIMAL(10,2);
ALTER TABLE cached_sealed_products ADD COLUMN IF NOT EXISTS condition_17_price DECIMAL(10,2);
ALTER TABLE cached_sealed_products ADD COLUMN IF NOT EXISTS condition_18_price DECIMAL(10,2);
ALTER TABLE cached_sealed_products ADD COLUMN IF NOT EXISTS box_only_price DECIMAL(10,2);
ALTER TABLE cached_sealed_products ADD COLUMN IF NOT EXISTS cib_price DECIMAL(10,2);
ALTER TABLE cached_sealed_products ADD COLUMN IF NOT EXISTS loose_price DECIMAL(10,2);
ALTER TABLE cached_sealed_products ADD COLUMN IF NOT EXISTS new_price DECIMAL(10,2);
ALTER TABLE cached_sealed_products ADD COLUMN IF NOT EXISTS retail_new_buy DECIMAL(10,2);
ALTER TABLE cached_sealed_products ADD COLUMN IF NOT EXISTS retail_new_sell DECIMAL(10,2);
ALTER TABLE cached_sealed_products ADD COLUMN IF NOT EXISTS retail_cib_buy DECIMAL(10,2);
ALTER TABLE cached_sealed_products ADD COLUMN IF NOT EXISTS retail_cib_sell DECIMAL(10,2);
ALTER TABLE cached_sealed_products ADD COLUMN IF NOT EXISTS retail_loose_buy DECIMAL(10,2);
ALTER TABLE cached_sealed_products ADD COLUMN IF NOT EXISTS retail_loose_sell DECIMAL(10,2);
ALTER TABLE cached_sealed_products ADD COLUMN IF NOT EXISTS gamestop_price DECIMAL(10,2);
ALTER TABLE cached_sealed_products ADD COLUMN IF NOT EXISTS gamestop_trade_price DECIMAL(10,2);
ALTER TABLE cached_sealed_products ADD COLUMN IF NOT EXISTS raw_pricing_data JSONB; -- Store complete raw pricing data

-- Add indexes for the new pricing fields
CREATE INDEX IF NOT EXISTS idx_cached_cards_bgs_10_price ON cached_cards(bgs_10_price);
CREATE INDEX IF NOT EXISTS idx_cached_cards_condition_17_price ON cached_cards(condition_17_price);
CREATE INDEX IF NOT EXISTS idx_cached_cards_condition_18_price ON cached_cards(condition_18_price);
CREATE INDEX IF NOT EXISTS idx_cached_cards_cib_price ON cached_cards(cib_price);
CREATE INDEX IF NOT EXISTS idx_cached_cards_new_price ON cached_cards(new_price);

CREATE INDEX IF NOT EXISTS idx_cached_sealed_bgs_10_price ON cached_sealed_products(bgs_10_price);
CREATE INDEX IF NOT EXISTS idx_cached_sealed_condition_17_price ON cached_sealed_products(condition_17_price);
CREATE INDEX IF NOT EXISTS idx_cached_sealed_condition_18_price ON cached_sealed_products(condition_18_price);
CREATE INDEX IF NOT EXISTS idx_cached_sealed_cib_price ON cached_sealed_products(cib_price);
CREATE INDEX IF NOT EXISTS idx_cached_sealed_new_price ON cached_sealed_products(new_price);

-- Verify the new columns were added
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('cached_cards', 'cached_sealed_products')
    AND column_name LIKE '%price%'
ORDER BY table_name, column_name;

