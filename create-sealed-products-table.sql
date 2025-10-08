-- Create sealed_products table to store TCGGo sealed product data
CREATE TABLE IF NOT EXISTS sealed_products (
  id SERIAL PRIMARY KEY,
  tcggo_id TEXT, -- TCGGo product ID
  expansion_id TEXT NOT NULL, -- Our internal expansion ID (e.g., 'me1', 'blk')
  name TEXT NOT NULL, -- Product name
  type TEXT DEFAULT 'sealed', -- Product type
  image TEXT, -- Product image URL
  
  -- Pricing data (CardMarket format)
  pricing_low DECIMAL(10,2),
  pricing_mid DECIMAL(10,2),
  pricing_high DECIMAL(10,2),
  pricing_market DECIMAL(10,2),
  pricing_currency TEXT DEFAULT 'EUR',
  pricing_sources TEXT[], -- Array of sources like ['cardmarket']
  
  -- Source information
  pricing_source TEXT DEFAULT 'cardmarket',
  source TEXT DEFAULT 'cardmarket',
  
  -- Episode information (CardMarket)
  episode_id INTEGER,
  episode_name TEXT,
  
  -- URLs
  tcggo_url TEXT,
  cardmarket_url TEXT,
  
  -- Raw data from API (JSONB for flexibility)
  raw_data JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sealed_products_expansion_id ON sealed_products(expansion_id);
CREATE INDEX IF NOT EXISTS idx_sealed_products_tcggo_id ON sealed_products(tcggo_id);
CREATE INDEX IF NOT EXISTS idx_sealed_products_name ON sealed_products(name);
CREATE INDEX IF NOT EXISTS idx_sealed_products_pricing_market ON sealed_products(pricing_market);

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_sealed_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_sealed_products_updated_at
  BEFORE UPDATE ON sealed_products
  FOR EACH ROW
  EXECUTE FUNCTION update_sealed_products_updated_at();

-- Add comments for documentation
COMMENT ON TABLE sealed_products IS 'Stores sealed product data from TCGGo/CardMarket API';
COMMENT ON COLUMN sealed_products.expansion_id IS 'Internal expansion ID that matches pokemon_expansions.id';
COMMENT ON COLUMN sealed_products.tcggo_id IS 'TCGGo product ID from the API';
COMMENT ON COLUMN sealed_products.raw_data IS 'Complete raw response from TCGGo API for reference';
