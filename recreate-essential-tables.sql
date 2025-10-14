-- Recreate essential tables for the 1Track app
-- This will restore the core functionality

-- 1. Create items table (for custom items only)
CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    set_name TEXT,
    item_type TEXT DEFAULT 'Other',
    image_url TEXT,
    market_value_cents INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create orders table (with API card fields)
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_group_id UUID NOT NULL DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES items(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    price_cents INTEGER NOT NULL,
    market_value_cents INTEGER,
    order_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    order_number TEXT,
    order_source TEXT DEFAULT 'manual',
    notes TEXT,
    
    -- API card fields (for Pokemon cards from API)
    api_card_id TEXT,
    api_card_name TEXT,
    api_card_set TEXT,
    api_card_image_url TEXT,
    api_card_market_value_cents INTEGER
);

-- 3. Create pokemon_cards table (for TCGCSV data)
CREATE TABLE IF NOT EXISTS pokemon_cards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    supertype TEXT,
    types TEXT[],
    subtypes TEXT[],
    hp INTEGER,
    number TEXT,
    rarity TEXT,
    expansion_id TEXT,
    expansion_name TEXT,
    image_url TEXT,
    abilities JSONB,
    attacks JSONB,
    weaknesses JSONB,
    resistances JSONB,
    retreat_cost TEXT[],
    converted_retreat_cost INTEGER,
    artist TEXT,
    flavor_text TEXT,
    regulation_mark TEXT,
    language TEXT DEFAULT 'en',
    language_code TEXT DEFAULT 'en',
    national_pokedex_numbers INTEGER[],
    -- Pricing data
    market_price DECIMAL(10,2),
    low_price DECIMAL(10,2),
    mid_price DECIMAL(10,2),
    high_price DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create pokemon_expansions table
CREATE TABLE IF NOT EXISTS pokemon_expansions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    series TEXT,
    code TEXT,
    total INTEGER,
    printed_total INTEGER,
    language TEXT DEFAULT 'en',
    language_code TEXT DEFAULT 'en',
    release_date DATE,
    is_online_only BOOLEAN DEFAULT FALSE,
    logo_url TEXT,
    symbol_url TEXT,
    translation JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create sync_status table
CREATE TABLE IF NOT EXISTS sync_status (
    id INTEGER PRIMARY KEY DEFAULT 1,
    cards TIMESTAMP WITH TIME ZONE,
    expansions TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_group_id ON orders(order_group_id);
CREATE INDEX IF NOT EXISTS idx_orders_item_id ON orders(item_id);
CREATE INDEX IF NOT EXISTS idx_orders_api_card_id ON orders(api_card_id);
CREATE INDEX IF NOT EXISTS idx_orders_api_card_name ON orders(api_card_name);
CREATE INDEX IF NOT EXISTS idx_orders_api_card_set ON orders(api_card_set);

CREATE INDEX IF NOT EXISTS idx_pokemon_cards_name ON pokemon_cards(name);
CREATE INDEX IF NOT EXISTS idx_pokemon_cards_expansion_id ON pokemon_cards(expansion_id);
CREATE INDEX IF NOT EXISTS idx_pokemon_cards_types ON pokemon_cards USING GIN(types);
CREATE INDEX IF NOT EXISTS idx_pokemon_cards_subtypes ON pokemon_cards USING GIN(subtypes);
CREATE INDEX IF NOT EXISTS idx_pokemon_cards_rarity ON pokemon_cards(rarity);
CREATE INDEX IF NOT EXISTS idx_pokemon_cards_supertype ON pokemon_cards(supertype);

-- 7. Create views for the app
CREATE OR REPLACE VIEW individual_orders_clean AS
SELECT 
  o.id,
  o.order_group_id,
  o.item_id,
  o.user_id,
  o.quantity,
  o.price_cents,
  o.market_value_cents,
  o.order_date,
  o.created_at,
  o.updated_at,
  o.order_number,
  o.order_source,
  o.notes,
  o.api_card_id,
  o.api_card_name,
  o.api_card_set,
  o.api_card_image_url,
  o.api_card_market_value_cents,
  -- Use API card data when item_id is null, otherwise use item data
  COALESCE(
    CASE 
      WHEN o.item_id IS NULL THEN o.api_card_name
      ELSE i.name 
    END,
    'Unknown Item'
  ) as item_name,
  COALESCE(
    CASE 
      WHEN o.item_id IS NULL THEN o.api_card_set
      ELSE i.set_name 
    END,
    'Unknown Set'
  ) as set_name,
  COALESCE(
    CASE 
      WHEN o.item_id IS NULL THEN o.api_card_image_url
      ELSE i.image_url 
    END,
    '/icons/other.png'
  ) as image_url,
  COALESCE(
    CASE 
      WHEN o.item_id IS NULL THEN o.api_card_market_value_cents
      ELSE o.market_value_cents 
    END,
    0
  ) as effective_market_value_cents
FROM orders o
LEFT JOIN items i ON o.item_id = i.id
WHERE o.user_id = auth.uid();

CREATE OR REPLACE VIEW collection_summary_clean AS
SELECT 
  COALESCE(
    CASE 
      WHEN o.item_id IS NULL THEN o.api_card_name
      ELSE i.name 
    END,
    'Unknown Item'
  ) as item_name,
  COALESCE(
    CASE 
      WHEN o.item_id IS NULL THEN o.api_card_set
      ELSE i.set_name 
    END,
    'Unknown Set'
  ) as set_name,
  COALESCE(
    CASE 
      WHEN o.item_id IS NULL THEN o.api_card_image_url
      ELSE i.image_url 
    END,
    '/icons/other.png'
  ) as image_url,
  o.order_group_id,
  SUM(o.quantity) as total_quantity,
  AVG(o.price_cents) as avg_price_cents,
  COALESCE(
    CASE 
      WHEN o.item_id IS NULL THEN o.api_card_market_value_cents
      ELSE o.market_value_cents 
    END,
    0
  ) as market_value_cents,
  MAX(o.order_date) as latest_order_date,
  COUNT(*) as order_count
FROM orders o
LEFT JOIN items i ON o.item_id = i.id
WHERE o.user_id = auth.uid()
GROUP BY 
  COALESCE(
    CASE 
      WHEN o.item_id IS NULL THEN o.api_card_name
      ELSE i.name 
    END,
    'Unknown Item'
  ),
  COALESCE(
    CASE 
      WHEN o.item_id IS NULL THEN o.api_card_set
      ELSE i.set_name 
    END,
    'Unknown Set'
  ),
  COALESCE(
    CASE 
      WHEN o.item_id IS NULL THEN o.api_card_image_url
      ELSE i.image_url 
    END,
    '/icons/other.png'
  ),
  o.order_group_id,
  COALESCE(
    CASE 
      WHEN o.item_id IS NULL THEN o.api_card_market_value_cents
      ELSE o.market_value_cents 
    END,
    0
  );

-- 8. Enable Row Level Security
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE pokemon_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE pokemon_expansions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_status ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies
-- Items policies (users can only see their own items)
CREATE POLICY "Users can view their own items" ON items FOR SELECT USING (true);
CREATE POLICY "Users can insert their own items" ON items FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own items" ON items FOR UPDATE USING (true);
CREATE POLICY "Users can delete their own items" ON items FOR DELETE USING (true);

-- Orders policies (users can only see their own orders)
CREATE POLICY "Users can view their own orders" ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own orders" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own orders" ON orders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own orders" ON orders FOR DELETE USING (auth.uid() = user_id);

-- Pokemon cards policies (public read access)
CREATE POLICY "Anyone can view pokemon cards" ON pokemon_cards FOR SELECT USING (true);
CREATE POLICY "Anyone can view pokemon expansions" ON pokemon_expansions FOR SELECT USING (true);
CREATE POLICY "Anyone can view sync status" ON sync_status FOR SELECT USING (true);
