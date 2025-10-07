-- Updated database schema to exactly match Scrydex API response structure
-- This ensures we store exactly what the API returns, nothing more, nothing less

-- Drop existing tables to recreate with correct structure
DROP TABLE IF EXISTS pokemon_cards CASCADE;
DROP TABLE IF EXISTS pokemon_expansions CASCADE;

-- Create Pokemon Expansions table matching ScrydexExpansion interface
CREATE TABLE pokemon_expansions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    series TEXT,
    code TEXT,
    total INTEGER,
    printed_total INTEGER,
    language TEXT,
    language_code TEXT,
    release_date TEXT, -- API returns string, not date
    is_online_only BOOLEAN,
    logo TEXT, -- API field name
    symbol TEXT, -- API field name
    translation JSONB,
    -- Metadata fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Pokemon Cards table matching ScrydexCard interface
CREATE TABLE pokemon_cards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    supertype TEXT,
    types TEXT[],
    subtypes TEXT[],
    hp INTEGER,
    number TEXT,
    rarity TEXT,
    -- Expansion reference (flattened from API's nested structure)
    expansion_id TEXT,
    expansion_name TEXT,
    -- Images (flattened from API's nested structure)
    image_small TEXT,
    image_large TEXT,
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
    legalities JSONB, -- Missing field from original schema
    -- Pricing data (flattened from API's complex pricing structure)
    prices JSONB, -- Store complete pricing object from API
    -- Individual price fields for easy querying (extracted from prices object)
    market_price_usd DECIMAL(10,2),
    market_price_eur DECIMAL(10,2),
    market_price_gbp DECIMAL(10,2),
    tcgplayer_price_usd DECIMAL(10,2),
    tcgplayer_price_eur DECIMAL(10,2),
    tcgplayer_price_gbp DECIMAL(10,2),
    cardmarket_price_eur DECIMAL(10,2),
    cardmarket_price_usd DECIMAL(10,2),
    cardmarket_price_gbp DECIMAL(10,2),
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
CREATE INDEX idx_pokemon_cards_supertype ON pokemon_cards(supertype);
CREATE INDEX idx_pokemon_cards_language ON pokemon_cards(language_code);
CREATE INDEX idx_pokemon_cards_market_price_usd ON pokemon_cards(market_price_usd);

CREATE INDEX idx_pokemon_expansions_series ON pokemon_expansions(series);
CREATE INDEX idx_pokemon_expansions_language ON pokemon_expansions(language_code);
CREATE INDEX idx_pokemon_expansions_release_date ON pokemon_expansions(release_date);

-- Create function to extract pricing data from JSONB prices object
CREATE OR REPLACE FUNCTION extract_pricing_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Extract pricing data from the prices JSONB object
    IF NEW.prices IS NOT NULL THEN
        -- Market prices
        NEW.market_price_usd := (NEW.prices->'market'->>'usd')::DECIMAL(10,2);
        NEW.market_price_eur := (NEW.prices->'market'->>'eur')::DECIMAL(10,2);
        NEW.market_price_gbp := (NEW.prices->'market'->>'gbp')::DECIMAL(10,2);
        
        -- TCGPlayer prices
        NEW.tcgplayer_price_usd := (NEW.prices->'tcgplayer'->>'usd')::DECIMAL(10,2);
        NEW.tcgplayer_price_eur := (NEW.prices->'tcgplayer'->>'eur')::DECIMAL(10,2);
        NEW.tcgplayer_price_gbp := (NEW.prices->'tcgplayer'->>'gbp')::DECIMAL(10,2);
        
        -- Cardmarket prices
        NEW.cardmarket_price_eur := (NEW.prices->'cardmarket'->>'eur')::DECIMAL(10,2);
        NEW.cardmarket_price_usd := (NEW.prices->'cardmarket'->>'usd')::DECIMAL(10,2);
        NEW.cardmarket_price_gbp := (NEW.prices->'cardmarket'->>'gbp')::DECIMAL(10,2);
    END IF;
    
    -- Extract expansion data from nested structure
    IF NEW.prices IS NOT NULL AND NEW.prices ? 'expansion' THEN
        NEW.expansion_id := NEW.prices->'expansion'->>'id';
        NEW.expansion_name := NEW.prices->'expansion'->>'name';
    END IF;
    
    -- Extract image data from nested structure
    IF NEW.prices IS NOT NULL AND NEW.prices ? 'images' THEN
        NEW.image_small := NEW.prices->'images'->>'small';
        NEW.image_large := NEW.prices->'images'->>'large';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically extract pricing data
CREATE TRIGGER extract_pricing_trigger
    BEFORE INSERT OR UPDATE ON pokemon_cards
    FOR EACH ROW
    EXECUTE FUNCTION extract_pricing_data();

-- Create function to flatten API card data for storage
CREATE OR REPLACE FUNCTION store_scrydex_card(card_data JSONB)
RETURNS TEXT AS $$
DECLARE
    card_id TEXT;
BEGIN
    -- Extract the card ID
    card_id := card_data->>'id';
    
    -- Insert or update the card with flattened data
    INSERT INTO pokemon_cards (
        id, name, supertype, types, subtypes, hp, number, rarity,
        expansion_id, expansion_name, image_small, image_large,
        abilities, attacks, weaknesses, resistances, retreat_cost,
        converted_retreat_cost, artist, flavor_text, regulation_mark,
        language, language_code, national_pokedex_numbers, legalities,
        prices
    ) VALUES (
        card_data->>'id',
        card_data->>'name',
        card_data->>'supertype',
        ARRAY(SELECT jsonb_array_elements_text(card_data->'types')),
        ARRAY(SELECT jsonb_array_elements_text(card_data->'subtypes')),
        (card_data->>'hp')::INTEGER,
        card_data->>'number',
        card_data->>'rarity',
        card_data->'expansion'->>'id',
        card_data->'expansion'->>'name',
        card_data->'images'->>'small',
        card_data->'images'->>'large',
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
        card_data->'prices'
    )
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
        image_small = EXCLUDED.image_small,
        image_large = EXCLUDED.image_large,
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
        prices = EXCLUDED.prices,
        updated_at = NOW();
    
    RETURN card_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to store API expansion data
CREATE OR REPLACE FUNCTION store_scrydex_expansion(expansion_data JSONB)
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
COMMENT ON COLUMN pokemon_cards.prices IS 'Complete pricing object from Scrydex API as JSONB';
COMMENT ON COLUMN pokemon_cards.legalities IS 'Card legalities information from Scrydex API';
COMMENT ON COLUMN pokemon_cards.image_small IS 'Small image URL from API images.small';
COMMENT ON COLUMN pokemon_cards.image_large IS 'Large image URL from API images.large';
