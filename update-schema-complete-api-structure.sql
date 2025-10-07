-- Complete database schema update to match ACTUAL Scrydex API response structure
-- Based on complete API responses provided by user

-- Drop existing tables to recreate with correct structure
DROP TABLE IF EXISTS pokemon_cards CASCADE;
DROP TABLE IF EXISTS pokemon_expansions CASCADE;

-- Create Pokemon Expansions table (matches actual API response)
CREATE TABLE pokemon_expansions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    series TEXT,
    code TEXT,
    total INTEGER,
    printed_total INTEGER,
    language TEXT,
    language_code TEXT,
    release_date TEXT,
    is_online_only BOOLEAN,
    logo TEXT,
    symbol TEXT,
    translation JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Pokemon Cards table matching COMPLETE Scrydex API response
CREATE TABLE pokemon_cards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    supertype TEXT,
    types TEXT[],
    subtypes TEXT[],
    hp TEXT, -- ⚠️ CHANGED: HP is STRING in API, not INTEGER
    number TEXT,
    rarity TEXT,
    rarity_code TEXT, -- ⚠️ NEW: rarity_code field from API
    
    -- Expansion reference (complete object from API)
    expansion JSONB, -- Store complete expansion object
    expansion_id TEXT, -- Extracted for easy querying
    expansion_name TEXT, -- Extracted for easy querying
    expansion_series TEXT, -- Extracted for easy querying
    expansion_total INTEGER, -- Extracted for easy querying
    expansion_printed_total INTEGER, -- Extracted for easy querying
    expansion_language TEXT, -- Extracted for easy querying
    expansion_language_code TEXT, -- Extracted for easy querying
    expansion_release_date TEXT, -- Extracted for easy querying
    expansion_is_online_only BOOLEAN, -- Extracted for easy querying
    expansion_sort_order INTEGER, -- ⚠️ NEW: expansion_sort_order field from API
    
    -- Images (array structure from API)
    images JSONB, -- Store complete images array
    image_small TEXT, -- Extracted for easy querying
    image_medium TEXT, -- ⚠️ NEW: medium image size from API
    image_large TEXT, -- Extracted for easy querying
    
    -- Complex data stored as JSONB to preserve exact API structure
    abilities JSONB,
    attacks JSONB,
    weaknesses JSONB,
    resistances JSONB,
    retreat_cost TEXT[],
    converted_retreat_cost INTEGER,
    artist TEXT,
    flavor_text TEXT,
    regulation_mark TEXT,
    language TEXT,
    language_code TEXT,
    national_pokedex_numbers INTEGER[],
    legalities JSONB,
    
    -- Variants (array with pricing from API)
    variants JSONB, -- Store complete variants array with pricing
    
    -- RAW PRICING DATA (matching actual API response)
    raw_condition TEXT,
    raw_is_perfect BOOLEAN,
    raw_is_signed BOOLEAN,
    raw_is_error BOOLEAN,
    raw_type TEXT DEFAULT 'raw',
    raw_low DECIMAL(10,2),
    raw_market DECIMAL(10,2),
    raw_currency TEXT DEFAULT 'USD',
    -- Raw trends with ALL actual periods and both price_change and percent_change
    raw_trend_1d_percent DECIMAL(10,2),
    raw_trend_1d_price DECIMAL(10,2),
    raw_trend_7d_percent DECIMAL(10,2),
    raw_trend_7d_price DECIMAL(10,2),
    raw_trend_14d_percent DECIMAL(10,2),
    raw_trend_14d_price DECIMAL(10,2),
    raw_trend_30d_percent DECIMAL(10,2),
    raw_trend_30d_price DECIMAL(10,2),
    raw_trend_90d_percent DECIMAL(10,2),
    raw_trend_90d_price DECIMAL(10,2),
    raw_trend_180d_percent DECIMAL(10,2),
    raw_trend_180d_price DECIMAL(10,2),
    
    -- GRADED PRICING DATA (matching actual API response)
    graded_grade TEXT,
    graded_company TEXT,
    graded_is_perfect BOOLEAN,
    graded_is_signed BOOLEAN,
    graded_is_error BOOLEAN,
    graded_type TEXT DEFAULT 'graded',
    graded_low DECIMAL(10,2),
    graded_mid DECIMAL(10,2),
    graded_high DECIMAL(10,2),
    graded_market DECIMAL(10,2),
    graded_currency TEXT DEFAULT 'USD',
    -- Graded trends with ALL actual periods and both price_change and percent_change
    graded_trend_1d_percent DECIMAL(10,2),
    graded_trend_1d_price DECIMAL(10,2),
    graded_trend_7d_percent DECIMAL(10,2),
    graded_trend_7d_price DECIMAL(10,2),
    graded_trend_14d_percent DECIMAL(10,2),
    graded_trend_14d_price DECIMAL(10,2),
    graded_trend_30d_percent DECIMAL(10,2),
    graded_trend_30d_price DECIMAL(10,2),
    graded_trend_90d_percent DECIMAL(10,2),
    graded_trend_90d_price DECIMAL(10,2),
    graded_trend_180d_percent DECIMAL(10,2),
    graded_trend_180d_price DECIMAL(10,2),
    
    -- Complete pricing objects from API (JSONB)
    raw_pricing JSONB,
    graded_pricing JSONB,
    
    -- Metadata fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_pokemon_cards_name ON pokemon_cards(name);
CREATE INDEX idx_pokemon_cards_expansion_id ON pokemon_cards(expansion_id);
CREATE INDEX idx_pokemon_cards_types ON pokemon_cards USING GIN(types);
CREATE INDEX idx_pokemon_cards_subtypes ON pokemon_cards USING GIN(subtypes);
CREATE INDEX idx_pokemon_cards_rarity ON pokemon_cards(rarity);
CREATE INDEX idx_pokemon_cards_rarity_code ON pokemon_cards(rarity_code);
CREATE INDEX idx_pokemon_cards_supertype ON pokemon_cards(supertype);
CREATE INDEX idx_pokemon_cards_language ON pokemon_cards(language_code);
CREATE INDEX idx_pokemon_cards_raw_market ON pokemon_cards(raw_market);
CREATE INDEX idx_pokemon_cards_graded_market ON pokemon_cards(graded_market);
CREATE INDEX idx_pokemon_cards_graded_grade ON pokemon_cards(graded_grade);
CREATE INDEX idx_pokemon_cards_graded_company ON pokemon_cards(graded_company);
CREATE INDEX idx_pokemon_cards_expansion_series ON pokemon_cards(expansion_series);
CREATE INDEX idx_pokemon_cards_expansion_sort_order ON pokemon_cards(expansion_sort_order);

CREATE INDEX idx_pokemon_expansions_series ON pokemon_expansions(series);
CREATE INDEX idx_pokemon_expansions_language ON pokemon_expansions(language_code);
CREATE INDEX idx_pokemon_expansions_release_date ON pokemon_expansions(release_date);

-- Create function to extract data from complete API response
CREATE OR REPLACE FUNCTION extract_complete_api_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Extract expansion data from nested structure
    IF NEW.expansion IS NOT NULL THEN
        NEW.expansion_id := NEW.expansion->>'id';
        NEW.expansion_name := NEW.expansion->>'name';
        NEW.expansion_series := NEW.expansion->>'series';
        NEW.expansion_total := (NEW.expansion->>'total')::INTEGER;
        NEW.expansion_printed_total := (NEW.expansion->>'printed_total')::INTEGER;
        NEW.expansion_language := NEW.expansion->>'language';
        NEW.expansion_language_code := NEW.expansion->>'language_code';
        NEW.expansion_release_date := NEW.expansion->>'release_date';
        NEW.expansion_is_online_only := (NEW.expansion->>'is_online_only')::BOOLEAN;
    END IF;
    
    -- Extract image data from array structure
    IF NEW.images IS NOT NULL AND jsonb_array_length(NEW.images) > 0 THEN
        -- Get the first image (usually front)
        NEW.image_small := NEW.images->0->>'small';
        NEW.image_medium := NEW.images->0->>'medium';
        NEW.image_large := NEW.images->0->>'large';
    END IF;
    
    -- Extract raw pricing data from JSONB
    IF NEW.raw_pricing IS NOT NULL THEN
        NEW.raw_condition := NEW.raw_pricing->>'condition';
        NEW.raw_is_perfect := (NEW.raw_pricing->>'is_perfect')::BOOLEAN;
        NEW.raw_is_signed := (NEW.raw_pricing->>'is_signed')::BOOLEAN;
        NEW.raw_is_error := (NEW.raw_pricing->>'is_error')::BOOLEAN;
        NEW.raw_type := NEW.raw_pricing->>'type';
        NEW.raw_low := (NEW.raw_pricing->>'low')::DECIMAL(10,2);
        NEW.raw_market := (NEW.raw_pricing->>'market')::DECIMAL(10,2);
        NEW.raw_currency := NEW.raw_pricing->>'currency';
        
        -- Extract all trend periods with both price_change and percent_change
        IF NEW.raw_pricing->'trends'->'days_1' IS NOT NULL THEN
            NEW.raw_trend_1d_percent := (NEW.raw_pricing->'trends'->'days_1'->>'percent_change')::DECIMAL(10,2);
            NEW.raw_trend_1d_price := (NEW.raw_pricing->'trends'->'days_1'->>'price_change')::DECIMAL(10,2);
        END IF;
        IF NEW.raw_pricing->'trends'->'days_7' IS NOT NULL THEN
            NEW.raw_trend_7d_percent := (NEW.raw_pricing->'trends'->'days_7'->>'percent_change')::DECIMAL(10,2);
            NEW.raw_trend_7d_price := (NEW.raw_pricing->'trends'->'days_7'->>'price_change')::DECIMAL(10,2);
        END IF;
        IF NEW.raw_pricing->'trends'->'days_14' IS NOT NULL THEN
            NEW.raw_trend_14d_percent := (NEW.raw_pricing->'trends'->'days_14'->>'percent_change')::DECIMAL(10,2);
            NEW.raw_trend_14d_price := (NEW.raw_pricing->'trends'->'days_14'->>'price_change')::DECIMAL(10,2);
        END IF;
        IF NEW.raw_pricing->'trends'->'days_30' IS NOT NULL THEN
            NEW.raw_trend_30d_percent := (NEW.raw_pricing->'trends'->'days_30'->>'percent_change')::DECIMAL(10,2);
            NEW.raw_trend_30d_price := (NEW.raw_pricing->'trends'->'days_30'->>'price_change')::DECIMAL(10,2);
        END IF;
        IF NEW.raw_pricing->'trends'->'days_90' IS NOT NULL THEN
            NEW.raw_trend_90d_percent := (NEW.raw_pricing->'trends'->'days_90'->>'percent_change')::DECIMAL(10,2);
            NEW.raw_trend_90d_price := (NEW.raw_pricing->'trends'->'days_90'->>'price_change')::DECIMAL(10,2);
        END IF;
        IF NEW.raw_pricing->'trends'->'days_180' IS NOT NULL THEN
            NEW.raw_trend_180d_percent := (NEW.raw_pricing->'trends'->'days_180'->>'percent_change')::DECIMAL(10,2);
            NEW.raw_trend_180d_price := (NEW.raw_pricing->'trends'->'days_180'->>'price_change')::DECIMAL(10,2);
        END IF;
    END IF;
    
    -- Extract graded pricing data from JSONB
    IF NEW.graded_pricing IS NOT NULL THEN
        NEW.graded_grade := NEW.graded_pricing->>'grade';
        NEW.graded_company := NEW.graded_pricing->>'company';
        NEW.graded_is_perfect := (NEW.graded_pricing->>'is_perfect')::BOOLEAN;
        NEW.graded_is_signed := (NEW.graded_pricing->>'is_signed')::BOOLEAN;
        NEW.graded_is_error := (NEW.graded_pricing->>'is_error')::BOOLEAN;
        NEW.graded_type := NEW.graded_pricing->>'type';
        NEW.graded_low := (NEW.graded_pricing->>'low')::DECIMAL(10,2);
        NEW.graded_mid := (NEW.graded_pricing->>'mid')::DECIMAL(10,2);
        NEW.graded_high := (NEW.graded_pricing->>'high')::DECIMAL(10,2);
        NEW.graded_market := (NEW.graded_pricing->>'market')::DECIMAL(10,2);
        NEW.graded_currency := NEW.graded_pricing->>'currency';
        
        -- Extract all trend periods with both price_change and percent_change
        IF NEW.graded_pricing->'trends'->'days_1' IS NOT NULL THEN
            NEW.graded_trend_1d_percent := (NEW.graded_pricing->'trends'->'days_1'->>'percent_change')::DECIMAL(10,2);
            NEW.graded_trend_1d_price := (NEW.graded_pricing->'trends'->'days_1'->>'price_change')::DECIMAL(10,2);
        END IF;
        IF NEW.graded_pricing->'trends'->'days_7' IS NOT NULL THEN
            NEW.graded_trend_7d_percent := (NEW.graded_pricing->'trends'->'days_7'->>'percent_change')::DECIMAL(10,2);
            NEW.graded_trend_7d_price := (NEW.graded_pricing->'trends'->'days_7'->>'price_change')::DECIMAL(10,2);
        END IF;
        IF NEW.graded_pricing->'trends'->'days_14' IS NOT NULL THEN
            NEW.graded_trend_14d_percent := (NEW.graded_pricing->'trends'->'days_14'->>'percent_change')::DECIMAL(10,2);
            NEW.graded_trend_14d_price := (NEW.graded_pricing->'trends'->'days_14'->>'price_change')::DECIMAL(10,2);
        END IF;
        IF NEW.graded_pricing->'trends'->'days_30' IS NOT NULL THEN
            NEW.graded_trend_30d_percent := (NEW.graded_pricing->'trends'->'days_30'->>'percent_change')::DECIMAL(10,2);
            NEW.graded_trend_30d_price := (NEW.graded_pricing->'trends'->'days_30'->>'price_change')::DECIMAL(10,2);
        END IF;
        IF NEW.graded_pricing->'trends'->'days_90' IS NOT NULL THEN
            NEW.graded_trend_90d_percent := (NEW.graded_pricing->'trends'->'days_90'->>'percent_change')::DECIMAL(10,2);
            NEW.graded_trend_90d_price := (NEW.graded_pricing->'trends'->'days_90'->>'price_change')::DECIMAL(10,2);
        END IF;
        IF NEW.graded_pricing->'trends'->'days_180' IS NOT NULL THEN
            NEW.graded_trend_180d_percent := (NEW.graded_pricing->'trends'->'days_180'->>'percent_change')::DECIMAL(10,2);
            NEW.graded_trend_180d_price := (NEW.graded_pricing->'trends'->'days_180'->>'price_change')::DECIMAL(10,2);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically extract data
CREATE TRIGGER extract_complete_api_data_trigger
    BEFORE INSERT OR UPDATE ON pokemon_cards
    FOR EACH ROW
    EXECUTE FUNCTION extract_complete_api_data();

-- Create function to store complete API card data
CREATE OR REPLACE FUNCTION store_complete_scrydex_card(card_data JSONB)
RETURNS TEXT AS $$
DECLARE
    card_id TEXT;
BEGIN
    -- Extract the card ID
    card_id := card_data->>'id';
    
    -- Insert or update the card with complete API structure
    INSERT INTO pokemon_cards (
        id, name, supertype, types, subtypes, hp, number, rarity, rarity_code,
        expansion, expansion_sort_order, images, abilities, attacks, weaknesses, 
        resistances, retreat_cost, converted_retreat_cost, artist, flavor_text, 
        regulation_mark, language, language_code, national_pokedex_numbers, 
        legalities, variants, raw_pricing, graded_pricing
    ) VALUES (
        card_data->>'id',
        card_data->>'name',
        card_data->>'supertype',
        ARRAY(SELECT jsonb_array_elements_text(card_data->'types')),
        ARRAY(SELECT jsonb_array_elements_text(card_data->'subtypes')),
        card_data->>'hp', -- Store as TEXT
        card_data->>'number',
        card_data->>'rarity',
        card_data->>'rarity_code', -- New field
        card_data->'expansion', -- Store complete expansion object
        (card_data->>'expansion_sort_order')::INTEGER, -- New field
        card_data->'images', -- Store complete images array
        card_data->'abilities',
        card_data->'attacks',
        card_data->'weaknesses',
        card_data->'resistances',
        ARRAY(SELECT jsonb_array_elements_text(card_data->'retreat_cost')),
        (card_data->>'converted_retreat_cost')::INTEGER,
        card_data->>'artist',
        card_data->>'flavor_text',
        card_data->>'regulation_mark',
        card_data->>'language',
        card_data->>'language_code',
        ARRAY(SELECT jsonb_array_elements_text(card_data->'national_pokedex_numbers')::INTEGER),
        card_data->'legalities',
        card_data->'variants', -- Store complete variants array
        card_data->'raw_pricing',
        card_data->'graded_pricing'
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        supertype = EXCLUDED.supertype,
        types = EXCLUDED.types,
        subtypes = EXCLUDED.subtypes,
        hp = EXCLUDED.hp,
        number = EXCLUDED.number,
        rarity = EXCLUDED.rarity,
        rarity_code = EXCLUDED.rarity_code,
        expansion = EXCLUDED.expansion,
        expansion_sort_order = EXCLUDED.expansion_sort_order,
        images = EXCLUDED.images,
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
        legalities = EXCLUDED.legalities,
        variants = EXCLUDED.variants,
        raw_pricing = EXCLUDED.raw_pricing,
        graded_pricing = EXCLUDED.graded_pricing,
        updated_at = NOW();
    
    RETURN card_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to store complete API expansion data
CREATE OR REPLACE FUNCTION store_complete_scrydex_expansion(expansion_data JSONB)
RETURNS TEXT AS $$
DECLARE
    expansion_id TEXT;
BEGIN
    -- Extract the expansion ID
    expansion_id := expansion_data->>'id';
    
    -- Insert or update the expansion
    INSERT INTO pokemon_expansions (
        id, name, series, code, total, printed_total, language,
        language_code, release_date, is_online_only, logo, symbol, translation
    ) VALUES (
        expansion_data->>'id',
        expansion_data->>'name',
        expansion_data->>'series',
        expansion_data->>'code',
        (expansion_data->>'total')::INTEGER,
        (expansion_data->>'printed_total')::INTEGER,
        expansion_data->>'language',
        expansion_data->>'language_code',
        expansion_data->>'release_date',
        (expansion_data->>'is_online_only')::BOOLEAN,
        expansion_data->>'logo',
        expansion_data->>'symbol',
        expansion_data->'translation'
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        series = EXCLUDED.series,
        code = EXCLUDED.code,
        total = EXCLUDED.total,
        printed_total = EXCLUDED.printed_total,
        language = EXCLUDED.language,
        language_code = EXCLUDED.language_code,
        release_date = EXCLUDED.release_date,
        is_online_only = EXCLUDED.is_online_only,
        logo = EXCLUDED.logo,
        symbol = EXCLUDED.symbol,
        translation = EXCLUDED.translation,
        updated_at = NOW();
    
    RETURN expansion_id;
END;
$$ LANGUAGE plpgsql;

-- Add comments to document the schema
COMMENT ON TABLE pokemon_cards IS 'Stores Pokemon cards data exactly as returned by Scrydex API';
COMMENT ON TABLE pokemon_expansions IS 'Stores Pokemon expansions data exactly as returned by Scrydex API';
COMMENT ON COLUMN pokemon_cards.hp IS 'HP as TEXT (API returns string, not integer)';
COMMENT ON COLUMN pokemon_cards.rarity_code IS 'Rarity code from API (e.g., ★H)';
COMMENT ON COLUMN pokemon_cards.expansion IS 'Complete expansion object from API as JSONB';
COMMENT ON COLUMN pokemon_cards.images IS 'Complete images array from API as JSONB';
COMMENT ON COLUMN pokemon_cards.variants IS 'Complete variants array with pricing from API as JSONB';
COMMENT ON COLUMN pokemon_cards.raw_pricing IS 'Complete raw pricing object from Scrydex API as JSONB';
COMMENT ON COLUMN pokemon_cards.graded_pricing IS 'Complete graded pricing object from Scrydex API as JSONB';
COMMENT ON COLUMN pokemon_cards.image_medium IS 'Medium image size from API images array';
COMMENT ON COLUMN pokemon_cards.expansion_sort_order IS 'Expansion sort order from API';
