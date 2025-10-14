-- Fix RLS policies for Pokemon data tables
-- These tables should be publicly readable since they contain game data, not user data

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view pokemon cards" ON pokemon_cards;
DROP POLICY IF EXISTS "Anyone can view pokemon expansions" ON pokemon_expansions;
DROP POLICY IF EXISTS "Anyone can view sync status" ON sync_status;

-- Create new policies that allow public access
CREATE POLICY "Public read access to pokemon cards" ON pokemon_cards FOR SELECT USING (true);
CREATE POLICY "Public read access to pokemon expansions" ON pokemon_expansions FOR SELECT USING (true);
CREATE POLICY "Public read access to sync status" ON sync_status FOR SELECT USING (true);

-- Allow inserts for pokemon data (needed for import scripts)
CREATE POLICY "Allow pokemon cards inserts" ON pokemon_cards FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow pokemon expansions inserts" ON pokemon_expansions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow sync status updates" ON sync_status FOR ALL USING (true);

-- Update existing policies for upserts
CREATE POLICY "Allow pokemon cards upserts" ON pokemon_cards FOR UPDATE USING (true);
CREATE POLICY "Allow pokemon expansions upserts" ON pokemon_expansions FOR UPDATE USING (true);
