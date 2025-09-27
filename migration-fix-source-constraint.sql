-- Fix the valid_source constraint to allow 'custom' source
-- This allows users to add custom items that aren't from APIs

-- Drop the existing constraint
ALTER TABLE items DROP CONSTRAINT IF EXISTS valid_source;

-- Add the updated constraint that includes 'custom'
ALTER TABLE items ADD CONSTRAINT valid_source CHECK (source IN ('api', 'manual', 'custom'));
