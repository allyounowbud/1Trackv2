-- Import TCGCSV Pokemon data
-- This will populate the pokemon_cards and pokemon_expansions tables

-- First, let's create a temporary table to hold the TCGCSV data
CREATE TEMP TABLE tcgcsv_import (
    id TEXT,
    name TEXT,
    supertype TEXT,
    types TEXT,
    subtypes TEXT,
    hp INTEGER,
    number TEXT,
    rarity TEXT,
    expansion_id TEXT,
    expansion_name TEXT,
    image_url TEXT,
    abilities TEXT,
    attacks TEXT,
    weaknesses TEXT,
    resistances TEXT,
    retreat_cost TEXT,
    converted_retreat_cost INTEGER,
    artist TEXT,
    flavor_text TEXT,
    regulation_mark TEXT,
    language TEXT,
    language_code TEXT,
    national_pokedex_numbers TEXT,
    market_price DECIMAL(10,2),
    low_price DECIMAL(10,2),
    mid_price DECIMAL(10,2),
    high_price DECIMAL(10,2)
);

-- Sample data insertion (you'll replace this with actual TCGCSV data)
-- This is just a sample to show the structure
INSERT INTO tcgcsv_import VALUES
('base1-4', 'Charizard', 'Pokémon', 'Fire', 'Stage 2', 120, '4', 'Rare Holo', 'base1', 'Base Set', 'https://images.pokemontcg.io/base1/4_hires.png', '[]', '[{"name":"Flame Thrower","cost":["Fire","Fire","Fire","Colorless"],"convertedEnergyCost":5,"damage":"100","text":"Discard 1 Energy card attached to Charizard in order to use this attack."}]', '[]', '[]', '["Fire","Fire","Fire","Colorless"]', 4, 'Mitsuhiro Arita', 'Spits fire that is hot enough to melt boulders. Known to unintentionally cause forest fires.', '', 'en', 'en', '[6]', 250.00, 200.00, 225.00, 300.00),
('base1-25', 'Pikachu', 'Pokémon', 'Lightning', 'Basic', 40, '25', 'Common', 'base1', 'Base Set', 'https://images.pokemontcg.io/base1/25_hires.png', '[]', '[{"name":"Spark","cost":["Lightning","Lightning"],"convertedEnergyCost":3,"damage":"20","text":"If your opponent has any Benched Pokémon, choose 1 of them and this attack does 10 damage to it. (Don''t apply Weakness and Resistance for Benched Pokémon.)"}]', '[]', '[]', '["Colorless"]', 1, 'Atsuko Nishida', 'When several of these Pokémon gather, their electricity could build and cause lightning storms.', '', 'en', 'en', '[25]', 5.00, 2.00, 3.50, 8.00);

-- Insert into pokemon_expansions (extract unique expansions)
INSERT INTO pokemon_expansions (id, name, series, code, total, printed_total, language, language_code, release_date, is_online_only, logo_url, symbol_url)
SELECT DISTINCT
    expansion_id,
    expansion_name,
    CASE 
        WHEN expansion_name = 'Base Set' THEN 'Base'
        WHEN expansion_name LIKE '%Gym%' THEN 'Gym'
        WHEN expansion_name LIKE '%Neo%' THEN 'Neo'
        WHEN expansion_name LIKE '%Expedition%' THEN 'e-Card'
        WHEN expansion_name LIKE '%Aquapolis%' THEN 'e-Card'
        WHEN expansion_name LIKE '%Skyridge%' THEN 'e-Card'
        ELSE 'Other'
    END as series,
    UPPER(REPLACE(expansion_name, ' ', '')) as code,
    NULL as total,
    NULL as printed_total,
    COALESCE(language, 'en'),
    COALESCE(language_code, 'en'),
    NULL as release_date,
    FALSE as is_online_only,
    NULL as logo_url,
    NULL as symbol_url
FROM tcgcsv_import
WHERE expansion_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- Insert into pokemon_cards
INSERT INTO pokemon_cards (
    id, name, supertype, types, subtypes, hp, number, rarity,
    expansion_id, expansion_name, image_url, abilities, attacks,
    weaknesses, resistances, retreat_cost, converted_retreat_cost,
    artist, flavor_text, regulation_mark, language, language_code,
    national_pokedex_numbers, market_price, low_price, mid_price, high_price
)
SELECT 
    id,
    name,
    supertype,
    CASE 
        WHEN types IS NOT NULL AND types != '' THEN string_to_array(types, ',')
        ELSE NULL
    END as types,
    CASE 
        WHEN subtypes IS NOT NULL AND subtypes != '' THEN string_to_array(subtypes, ',')
        ELSE NULL
    END as subtypes,
    hp,
    number,
    rarity,
    expansion_id,
    expansion_name,
    image_url,
    CASE 
        WHEN abilities IS NOT NULL AND abilities != '' AND abilities != '[]' THEN abilities::jsonb
        ELSE NULL
    END as abilities,
    CASE 
        WHEN attacks IS NOT NULL AND attacks != '' AND attacks != '[]' THEN attacks::jsonb
        ELSE NULL
    END as attacks,
    CASE 
        WHEN weaknesses IS NOT NULL AND weaknesses != '' AND weaknesses != '[]' THEN weaknesses::jsonb
        ELSE NULL
    END as weaknesses,
    CASE 
        WHEN resistances IS NOT NULL AND resistances != '' AND resistances != '[]' THEN resistances::jsonb
        ELSE NULL
    END as resistances,
    CASE 
        WHEN retreat_cost IS NOT NULL AND retreat_cost != '' THEN string_to_array(retreat_cost, ',')
        ELSE NULL
    END as retreat_cost,
    converted_retreat_cost,
    artist,
    flavor_text,
    regulation_mark,
    COALESCE(language, 'en'),
    COALESCE(language_code, 'en'),
    CASE 
        WHEN national_pokedex_numbers IS NOT NULL AND national_pokedex_numbers != '' AND national_pokedex_numbers != '[]' THEN 
            string_to_array(national_pokedex_numbers, ',')::integer[]
        ELSE NULL
    END as national_pokedex_numbers,
    market_price,
    low_price,
    mid_price,
    high_price
FROM tcgcsv_import
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    supertype = EXCLUDED.supertype,
    types = EXCLUDED.types,
    subtypes = EXCLUDED.subtypes,
    hp = EXCLUDED.hp,
    number = EXCLUDED.number,
    rarity = EXCLUDED.rarity,
    expansion_id = EXCLUDED.expansion_id,
    expansion_name = EXCLUDED.expansion_name,
    image_url = EXCLUDED.image_url,
    abilities = EXCLUDED.abilities,
    attacks = EXCLUDED.attacks,
    weaknesses = EXCLUDED.weaknesses,
    resistances = EXCLUDED.resistances,
    retreat_cost = EXCLUDED.retreat_cost,
    converted_retreat_cost = EXCLUDED.converted_retreat_cost,
    artist = EXCLUDED.artist,
    flavor_text = EXCLUDED.flavor_text,
    regulation_mark = EXCLUDED.regulation_mark,
    language = EXCLUDED.language,
    language_code = EXCLUDED.language_code,
    national_pokedex_numbers = EXCLUDED.national_pokedex_numbers,
    market_price = EXCLUDED.market_price,
    low_price = EXCLUDED.low_price,
    mid_price = EXCLUDED.mid_price,
    high_price = EXCLUDED.high_price,
    updated_at = NOW();

-- Clean up temporary table
DROP TABLE tcgcsv_import;

-- Update sync status
INSERT INTO sync_status (id, cards, expansions, updated_at)
VALUES (1, NOW(), NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    cards = NOW(),
    expansions = NOW(),
    updated_at = NOW();
