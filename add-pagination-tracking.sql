-- Add pagination tracking to sync_status table
ALTER TABLE sync_status 
ADD COLUMN IF NOT EXISTS last_successful_page INTEGER DEFAULT 1;

-- Update existing record to have page 1
UPDATE sync_status 
SET last_successful_page = 1 
WHERE id = 1;


