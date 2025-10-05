-- Update card_prices table to match Scrydex API pricing structure
-- This will store both raw and graded pricing data with all the details

-- First, let's backup the existing data
CREATE TABLE IF NOT EXISTS card_prices_backup AS SELECT * FROM card_prices;

-- Drop the existing card_prices table
DROP TABLE IF EXISTS card_prices CASCADE;

-- Create new card_prices table with proper Scrydex structure
CREATE TABLE card_prices (
    id SERIAL PRIMARY KEY,
    card_id TEXT NOT NULL,
    
    -- Pricing type (raw or graded)
    price_type TEXT NOT NULL CHECK (price_type IN ('raw', 'graded')),
    
    -- Raw pricing fields
    raw_condition TEXT, -- NM, LP, MP, HP, DM, etc.
    
    -- Graded pricing fields
    grade TEXT, -- 1, 2, 3, ..., 10, etc.
    company TEXT, -- PSA, BGS, CGC, SGC, etc.
    
    -- Common pricing fields
    low DECIMAL(10,2),
    mid DECIMAL(10,2), -- Only for graded
    high DECIMAL(10,2), -- Only for graded
    market DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    
    -- Flags
    is_perfect BOOLEAN DEFAULT FALSE,
    is_signed BOOLEAN DEFAULT FALSE,
    is_error BOOLEAN DEFAULT FALSE,
    
    -- Trends data (stored as JSONB for flexibility)
    trends JSONB,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_card_prices_card_id ON card_prices(card_id);
CREATE INDEX idx_card_prices_type ON card_prices(price_type);
CREATE INDEX idx_card_prices_condition ON card_prices(raw_condition);
CREATE INDEX idx_card_prices_grade ON card_prices(grade);
CREATE INDEX idx_card_prices_company ON card_prices(company);
CREATE INDEX idx_card_prices_market ON card_prices(market);

-- Create unique constraint to prevent duplicate pricing entries
CREATE UNIQUE INDEX idx_card_prices_unique ON card_prices(
    card_id, 
    price_type, 
    COALESCE(raw_condition, ''), 
    COALESCE(grade, ''), 
    COALESCE(company, '')
);

-- Add RLS policies
ALTER TABLE card_prices ENABLE ROW LEVEL SECURITY;

-- Allow service role to do everything
CREATE POLICY "Service role can do everything on card_prices" ON card_prices
    FOR ALL USING (auth.role() = 'service_role');

-- Allow authenticated users to read
CREATE POLICY "Authenticated users can read card_prices" ON card_prices
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow anon users to read (for public access)
CREATE POLICY "Anon users can read card_prices" ON card_prices
    FOR SELECT USING (auth.role() = 'anon');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_card_prices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_card_prices_updated_at
    BEFORE UPDATE ON card_prices
    FOR EACH ROW
    EXECUTE FUNCTION update_card_prices_updated_at();

-- Add comments for documentation
COMMENT ON TABLE card_prices IS 'Stores detailed pricing data from Scrydex API including raw and graded prices with trends';
COMMENT ON COLUMN card_prices.price_type IS 'Type of pricing: raw or graded';
COMMENT ON COLUMN card_prices.raw_condition IS 'Condition for raw cards: NM, LP, MP, HP, DM, etc.';
COMMENT ON COLUMN card_prices.grade IS 'Grade for graded cards: 1-10, etc.';
COMMENT ON COLUMN card_prices.company IS 'Grading company: PSA, BGS, CGC, SGC, etc.';
COMMENT ON COLUMN card_prices.low IS 'Low price from Scrydex';
COMMENT ON COLUMN card_prices.mid IS 'Mid price from Scrydex (graded only)';
COMMENT ON COLUMN card_prices.high IS 'High price from Scrydex (graded only)';
COMMENT ON COLUMN card_prices.market IS 'Market price from Scrydex';
COMMENT ON COLUMN card_prices.trends IS 'Price trends data from Scrydex as JSONB';
