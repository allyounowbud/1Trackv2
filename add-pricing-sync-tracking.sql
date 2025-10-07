-- Add pricing sync tracking columns to sync_status table
-- This is optional - the system will work without these columns

-- Add pricing sync tracking columns
ALTER TABLE sync_status 
ADD COLUMN IF NOT EXISTS pricing_last_updated TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS pricing_sync_count INTEGER DEFAULT 0;

-- Create a function to update pricing sync status
CREATE OR REPLACE FUNCTION update_pricing_sync_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the pricing sync timestamp when cards are updated with pricing data
  IF NEW.raw_market IS DISTINCT FROM OLD.raw_market OR 
     NEW.graded_market IS DISTINCT FROM OLD.graded_market THEN
    
    UPDATE sync_status 
    SET 
      pricing_last_updated = NOW(),
      pricing_sync_count = pricing_sync_count + 1,
      updated_at = NOW()
    WHERE id = 1;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update pricing sync status
DROP TRIGGER IF EXISTS trigger_update_pricing_sync ON pokemon_cards;
CREATE TRIGGER trigger_update_pricing_sync
  AFTER UPDATE ON pokemon_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_pricing_sync_status();

-- Initialize pricing sync status if not exists
INSERT INTO sync_status (id, pricing_last_updated, pricing_sync_count)
VALUES (1, NULL, 0)
ON CONFLICT (id) DO NOTHING;
