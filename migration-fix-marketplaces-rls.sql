-- Migration to fix marketplaces RLS policy
-- Allow users to insert new marketplaces when they add new retailers

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can insert marketplaces" ON marketplaces;

-- Create a new policy that allows users to insert marketplaces
CREATE POLICY "Users can insert marketplaces" ON marketplaces FOR INSERT WITH CHECK (true);

-- Also allow users to update marketplaces (in case they want to modify fee percentages)
DROP POLICY IF EXISTS "Users can update marketplaces" ON marketplaces;
CREATE POLICY "Users can update marketplaces" ON marketplaces FOR UPDATE USING (true);
