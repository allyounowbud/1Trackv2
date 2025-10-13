-- Add TCGCSV group ID mapping to pokemon_expansions table
-- This allows us to link Scrydex expansion IDs to TCGCSV group IDs

-- Add the new column
ALTER TABLE pokemon_expansions 
ADD COLUMN IF NOT EXISTS tcgcsv_group_id INTEGER;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pokemon_expansions_tcgcsv_group_id 
ON pokemon_expansions(tcgcsv_group_id);

-- Add comment to explain the field
COMMENT ON COLUMN pokemon_expansions.tcgcsv_group_id IS 
'TCGCSV group ID for linking to tcgcsv.com sealed products data';

-- Update known mappings based on expansion codes/names
-- These are the most common recent expansions

-- Mega Evolution Era (2025)
UPDATE pokemon_expansions SET tcgcsv_group_id = 24380 WHERE id = 'me1' OR code = 'MEG';
UPDATE pokemon_expansions SET tcgcsv_group_id = 24448 WHERE id = 'me2' OR code = 'PFL';
UPDATE pokemon_expansions SET tcgcsv_group_id = 24451 WHERE code = 'MEP';
UPDATE pokemon_expansions SET tcgcsv_group_id = 24461 WHERE code = 'MEE';

-- Scarlet & Violet Era
UPDATE pokemon_expansions SET tcgcsv_group_id = 24269 WHERE code = 'DRI' OR name LIKE '%Destined Rivals%';
UPDATE pokemon_expansions SET tcgcsv_group_id = 24073 WHERE code = 'JTG' OR name LIKE '%Journey Together%';
UPDATE pokemon_expansions SET tcgcsv_group_id = 23651 WHERE code = 'SSP' OR name LIKE '%Surging Sparks%';
UPDATE pokemon_expansions SET tcgcsv_group_id = 23537 WHERE code = 'SCR' OR name LIKE '%Stellar Crown%';
UPDATE pokemon_expansions SET tcgcsv_group_id = 23473 WHERE code = 'TWM' OR name LIKE '%Twilight Masquerade%';
UPDATE pokemon_expansions SET tcgcsv_group_id = 23381 WHERE code = 'TEF' OR name LIKE '%Temporal Forces%';
UPDATE pokemon_expansions SET tcgcsv_group_id = 23286 WHERE code = 'PAR' OR name LIKE '%Paradox Rift%';
UPDATE pokemon_expansions SET tcgcsv_group_id = 23143 WHERE code = 'OBF' OR name LIKE '%Obsidian Flames%';
UPDATE pokemon_expansions SET tcgcsv_group_id = 23072 WHERE code = 'PAL' OR name LIKE '%Paldea Evolved%';
UPDATE pokemon_expansions SET tcgcsv_group_id = 23001 WHERE code = 'SVI' OR name LIKE '%Scarlet & Violet%' AND name NOT LIKE '%151%';
UPDATE pokemon_expansions SET tcgcsv_group_id = 23821 WHERE code = 'PRE' OR name LIKE '%Prismatic Evolutions%';
UPDATE pokemon_expansions SET tcgcsv_group_id = 23529 WHERE code = 'SFA' OR name LIKE '%Shrouded Fable%';
UPDATE pokemon_expansions SET tcgcsv_group_id = 23353 WHERE code = 'PAF' OR name LIKE '%Paldean Fates%';
UPDATE pokemon_expansions SET tcgcsv_group_id = 23237 WHERE code = 'MEW' OR name LIKE '%151%';
UPDATE pokemon_expansions SET tcgcsv_group_id = 24325 WHERE code = 'BLK' OR name LIKE '%Black Bolt%';
UPDATE pokemon_expansions SET tcgcsv_group_id = 24326 WHERE code = 'WHT' OR name LIKE '%White Flare%';

-- Sword & Shield Era
UPDATE pokemon_expansions SET tcgcsv_group_id = 22868 WHERE code = 'SWSH12' OR name LIKE '%Silver Tempest%';
UPDATE pokemon_expansions SET tcgcsv_group_id = 22811 WHERE code = 'SWSH11' OR name LIKE '%Lost Origin%';
UPDATE pokemon_expansions SET tcgcsv_group_id = 22732 WHERE code = 'SWSH10' OR name LIKE '%Astral Radiance%';
UPDATE pokemon_expansions SET tcgcsv_group_id = 22649 WHERE code = 'SWSH9' OR name LIKE '%Brilliant Stars%';
UPDATE pokemon_expansions SET tcgcsv_group_id = 22561 WHERE code = 'SWSH8' OR name LIKE '%Fusion Strike%';
UPDATE pokemon_expansions SET tcgcsv_group_id = 22462 WHERE code = 'SWSH7' OR name LIKE '%Evolving Skies%';
UPDATE pokemon_expansions SET tcgcsv_group_id = 22390 WHERE code = 'SWSH6' OR name LIKE '%Chilling Reign%';
UPDATE pokemon_expansions SET tcgcsv_group_id = 22318 WHERE code = 'SWSH5' OR name LIKE '%Battle Styles%';
UPDATE pokemon_expansions SET tcgcsv_group_id = 22280 WHERE code = 'SWSH45' OR name LIKE '%Shining Fates%';
UPDATE pokemon_expansions SET tcgcsv_group_id = 22197 WHERE code = 'SWSH4' OR name LIKE '%Vivid Voltage%';
UPDATE pokemon_expansions SET tcgcsv_group_id = 22144 WHERE code = 'SWSH35' OR name LIKE '%Champion%';
UPDATE pokemon_expansions SET tcgcsv_group_id = 22066 WHERE code = 'SWSH3' OR name LIKE '%Darkness Ablaze%';
UPDATE pokemon_expansions SET tcgcsv_group_id = 21993 WHERE code = 'SWSH2' OR name LIKE '%Rebel Clash%';
UPDATE pokemon_expansions SET tcgcsv_group_id = 21901 WHERE code = 'SWSH1' OR (name LIKE '%Sword%' AND name LIKE '%Shield%' AND name NOT LIKE '%2%');

-- Sun & Moon Era
UPDATE pokemon_expansions SET tcgcsv_group_id = 21702 WHERE code = 'SM12' OR name LIKE '%Cosmic Eclipse%';
UPDATE pokemon_expansions SET tcgcsv_group_id = 21618 WHERE code = 'SM11' OR name LIKE '%Unified Minds%';
UPDATE pokemon_expansions SET tcgcsv_group_id = 21524 WHERE code = 'SM10' OR name LIKE '%Unbroken Bonds%';
UPDATE pokemon_expansions SET tcgcsv_group_id = 21441 WHERE code = 'SM9' OR name LIKE '%Team Up%';
UPDATE pokemon_expansions SET tcgcsv_group_id = 21376 WHERE code = 'SM8' OR name LIKE '%Lost Thunder%';
UPDATE pokemon_expansions SET tcgcsv_group_id = 21233 WHERE code = 'SM7' OR name LIKE '%Celestial Storm%';
UPDATE pokemon_expansions SET tcgcsv_group_id = 21148 WHERE code = 'SM6' OR name LIKE '%Forbidden Light%';
UPDATE pokemon_expansions SET tcgcsv_group_id = 21069 WHERE code = 'SM5' OR name LIKE '%Ultra Prism%';
UPDATE pokemon_expansions SET tcgcsv_group_id = 20984 WHERE code = 'SM4' OR name LIKE '%Crimson Invasion%';
UPDATE pokemon_expansions SET tcgcsv_group_id = 20914 WHERE code = 'SM35' OR name LIKE '%Shining Legends%';
UPDATE pokemon_expansions SET tcgcsv_group_id = 20858 WHERE code = 'SM3' OR name LIKE '%Burning Shadows%';
UPDATE pokemon_expansions SET tcgcsv_group_id = 20758 WHERE code = 'SM2' OR name LIKE '%Guardians Rising%';
UPDATE pokemon_expansions SET tcgcsv_group_id = 20671 WHERE code = 'SM1' OR (name LIKE '%Sun%' AND name LIKE '%Moon%' AND name NOT LIKE '%2%');

-- XY Era
UPDATE pokemon_expansions SET tcgcsv_group_id = 20535 WHERE code = 'XY12' OR name LIKE '%Evolutions%';
UPDATE pokemon_expansions SET tcgcsv_group_id = 20466 WHERE code = 'XY11' OR name LIKE '%Steam Siege%';
UPDATE pokemon_expansions SET tcgcsv_group_id = 20387 WHERE code = 'XY10' OR name LIKE '%Fates Collide%';
UPDATE pokemon_expansions SET tcgcsv_group_id = 20308 WHERE code = 'XY9' OR name LIKE '%BREAKpoint%';
UPDATE pokemon_expansions SET tcgcsv_group_id = 20218 WHERE code = 'XY8' OR name LIKE '%BREAKthrough%';
UPDATE pokemon_expansions SET tcgcsv_group_id = 20137 WHERE code = 'XY7' OR name LIKE '%Ancient Origins%';
UPDATE pokemon_expansions SET tcgcsv_group_id = 20057 WHERE code = 'XY6' OR name LIKE '%Roaring Skies%';
UPDATE pokemon_expansions SET tcgcsv_group_id = 19977 WHERE code = 'XY5' OR name LIKE '%Primal Clash%';
UPDATE pokemon_expansions SET tcgcsv_group_id = 19898 WHERE code = 'XY4' OR name LIKE '%Phantom Forces%';
UPDATE pokemon_expansions SET tcgcsv_group_id = 19812 WHERE code = 'XY3' OR name LIKE '%Furious Fists%';
UPDATE pokemon_expansions SET tcgcsv_group_id = 19723 WHERE code = 'XY2' OR name LIKE '%Flashfire%';
UPDATE pokemon_expansions SET tcgcsv_group_id = 19636 WHERE code = 'XY1' OR (name LIKE '%XY%' AND name NOT LIKE '%2%' AND name NOT LIKE '%Base%');

-- Classic Sets
UPDATE pokemon_expansions SET tcgcsv_group_id = 604 WHERE code = 'BS' OR code = 'BASE' OR name = 'Base Set';
UPDATE pokemon_expansions SET tcgcsv_group_id = 635 WHERE code = 'JU' OR name = 'Jungle';
UPDATE pokemon_expansions SET tcgcsv_group_id = 630 WHERE code = 'FO' OR name = 'Fossil';
UPDATE pokemon_expansions SET tcgcsv_group_id = 605 WHERE code = 'BS2' OR name = 'Base Set 2';
UPDATE pokemon_expansions SET tcgcsv_group_id = 1373 WHERE code = 'TR' OR name = 'Team Rocket';
UPDATE pokemon_expansions SET tcgcsv_group_id = 1441 WHERE code = 'G1' OR name = 'Gym Heroes';
UPDATE pokemon_expansions SET tcgcsv_group_id = 1440 WHERE code = 'G2' OR name = 'Gym Challenge';
UPDATE pokemon_expansions SET tcgcsv_group_id = 1396 WHERE code = 'N1' OR name = 'Neo Genesis';
UPDATE pokemon_expansions SET tcgcsv_group_id = 1434 WHERE code = 'N2' OR name = 'Neo Discovery';
UPDATE pokemon_expansions SET tcgcsv_group_id = 1397 WHERE code = 'N3' OR name = 'Neo Revelation';
UPDATE pokemon_expansions SET tcgcsv_group_id = 1395 WHERE code = 'N4' OR name = 'Neo Destiny';

-- Log the results
DO $$
DECLARE
    mapped_count INTEGER;
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO mapped_count FROM pokemon_expansions WHERE tcgcsv_group_id IS NOT NULL;
    SELECT COUNT(*) INTO total_count FROM pokemon_expansions;
    
    RAISE NOTICE '✅ TCGCSV Group ID mapping complete!';
    RAISE NOTICE '📊 Mapped % out of % expansions', mapped_count, total_count;
    RAISE NOTICE '📋 Unmapped expansions can be linked manually or via name matching';
END $$;
