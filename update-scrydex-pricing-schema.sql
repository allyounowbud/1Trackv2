-- Update cached_cards table to store comprehensive Scrydex pricing data
-- This includes raw pricing, graded pricing, trends, and condition data

-- Add Scrydex pricing fields to cached_cards table
ALTER TABLE cached_cards ADD COLUMN IF NOT EXISTS raw_condition TEXT;
ALTER TABLE cached_cards ADD COLUMN IF NOT EXISTS raw_is_perfect BOOLEAN;
ALTER TABLE cached_cards ADD COLUMN IF NOT EXISTS raw_is_signed BOOLEAN;
ALTER TABLE cached_cards ADD COLUMN IF NOT EXISTS raw_is_error BOOLEAN;
ALTER TABLE cached_cards ADD COLUMN IF NOT EXISTS raw_low DECIMAL(10,2);
ALTER TABLE cached_cards ADD COLUMN IF NOT EXISTS raw_market DECIMAL(10,2);
ALTER TABLE cached_cards ADD COLUMN IF NOT EXISTS raw_currency TEXT DEFAULT 'USD';
ALTER TABLE cached_cards ADD COLUMN IF NOT EXISTS raw_trends JSONB;

-- Add graded pricing fields
ALTER TABLE cached_cards ADD COLUMN IF NOT EXISTS graded_grade TEXT;
ALTER TABLE cached_cards ADD COLUMN IF NOT EXISTS graded_company TEXT;
ALTER TABLE cached_cards ADD COLUMN IF NOT EXISTS graded_is_perfect BOOLEAN;
ALTER TABLE cached_cards ADD COLUMN IF NOT EXISTS graded_is_signed BOOLEAN;
ALTER TABLE cached_cards ADD COLUMN IF NOT EXISTS graded_is_error BOOLEAN;
ALTER TABLE cached_cards ADD COLUMN IF NOT EXISTS graded_low DECIMAL(10,2);
ALTER TABLE cached_cards ADD COLUMN IF NOT EXISTS graded_mid DECIMAL(10,2);
ALTER TABLE cached_cards ADD COLUMN IF NOT EXISTS graded_high DECIMAL(10,2);
ALTER TABLE cached_cards ADD COLUMN IF NOT EXISTS graded_market DECIMAL(10,2);
ALTER TABLE cached_cards ADD COLUMN IF NOT EXISTS graded_currency TEXT DEFAULT 'USD';
ALTER TABLE cached_cards ADD COLUMN IF NOT EXISTS graded_trends JSONB;

-- Add indexes for the new pricing fields
CREATE INDEX IF NOT EXISTS idx_cached_cards_raw_market ON cached_cards(raw_market);
CREATE INDEX IF NOT EXISTS idx_cached_cards_raw_low ON cached_cards(raw_low);
CREATE INDEX IF NOT EXISTS idx_cached_cards_graded_market ON cached_cards(graded_market);
CREATE INDEX IF NOT EXISTS idx_cached_cards_graded_grade ON cached_cards(graded_grade);
CREATE INDEX IF NOT EXISTS idx_cached_cards_graded_company ON cached_cards(graded_company);

-- Verify the new columns were added
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'cached_cards'
    AND (column_name LIKE 'raw_%' OR column_name LIKE 'graded_%')
ORDER BY column_name;
