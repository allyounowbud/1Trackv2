-- Migration to revert marketplaces RLS policy
-- Users should NOT be able to insert/update marketplaces - admin only

-- Drop the existing permissive policies
DROP POLICY IF EXISTS "Users can insert marketplaces" ON marketplaces;
DROP POLICY IF EXISTS "Users can update marketplaces" ON marketplaces;

-- Recreate the restrictive policies (admin only)
CREATE POLICY "Users can insert marketplaces" ON marketplaces FOR INSERT WITH CHECK (false); -- Admin only
CREATE POLICY "Users can update marketplaces" ON marketplaces FOR UPDATE USING (false); -- Admin only
