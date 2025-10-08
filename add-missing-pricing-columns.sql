-- Add missing pricing columns to cached_sealed_products table
-- This fixes the "Could not find the 'loose_price' column" errors

-- Add PriceCharting pricing columns
ALTER TABLE cached_sealed_products 
ADD COLUMN IF NOT EXISTS bgs_10_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS condition_17_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS condition_18_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS box_only_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS cib_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS loose_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS new_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS retail_new_buy DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS retail_new_sell DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS retail_cib_buy DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS retail_cib_sell DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS retail_loose_buy DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS retail_loose_sell DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS gamestop_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS gamestop_trade_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS raw_pricing_data JSONB;

-- Add the same columns to cached_cards table for consistency
ALTER TABLE cached_cards 
ADD COLUMN IF NOT EXISTS bgs_10_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS condition_17_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS condition_18_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS box_only_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS cib_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS loose_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS new_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS retail_new_buy DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS retail_new_sell DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS retail_cib_buy DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS retail_cib_sell DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS retail_loose_buy DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS retail_loose_sell DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS gamestop_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS gamestop_trade_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS raw_pricing_data JSONB;

-- Add Scrydex pricing columns to cached_cards table
ALTER TABLE cached_cards 
ADD COLUMN IF NOT EXISTS raw_condition VARCHAR(50),
ADD COLUMN IF NOT EXISTS raw_is_perfect BOOLEAN,
ADD COLUMN IF NOT EXISTS raw_is_signed BOOLEAN,
ADD COLUMN IF NOT EXISTS raw_is_error BOOLEAN,
ADD COLUMN IF NOT EXISTS raw_low DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS raw_market DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS raw_currency VARCHAR(10),
ADD COLUMN IF NOT EXISTS raw_trends JSONB,
ADD COLUMN IF NOT EXISTS graded_grade VARCHAR(50),
ADD COLUMN IF NOT EXISTS graded_company VARCHAR(50),
ADD COLUMN IF NOT EXISTS graded_is_perfect BOOLEAN,
ADD COLUMN IF NOT EXISTS graded_is_signed BOOLEAN,
ADD COLUMN IF NOT EXISTS graded_is_error BOOLEAN,
ADD COLUMN IF NOT EXISTS graded_low DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS graded_mid DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS graded_high DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS graded_market DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS graded_currency VARCHAR(10),
ADD COLUMN IF NOT EXISTS graded_trends JSONB;



