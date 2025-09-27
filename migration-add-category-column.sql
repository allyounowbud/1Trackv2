-- Add category column to items table for custom items
-- This allows users to categorize their custom collectibles

ALTER TABLE items 
ADD COLUMN category TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN items.category IS 'Category for custom items (e.g., Collectible, Card, Sealed Product, Accessory, Other)';

-- Update existing items to have a default category based on item_type
UPDATE items 
SET category = CASE 
    WHEN item_type = 'Card' THEN 'Card'
    WHEN item_type = 'Sealed Product' THEN 'Sealed Product'
    WHEN item_type ILIKE '%graded%' THEN 'Card'
    ELSE 'Other'
END
WHERE category IS NULL;
