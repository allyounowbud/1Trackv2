# Complete Scrydex API Structure Analysis

## 🎯 **Complete API Response Structure**

Based on the actual API responses you provided, here's the complete structure:

### **Pokemon Card Object:**
```json
{
  "id": "base1-4",
  "name": "Charizard",
  "supertype": "Pokémon",
  "subtypes": ["Stage 2"],
  "types": ["Fire"],
  "hp": "120",  // ⚠️ STRING, not integer
  "abilities": [
    {
      "type": "Pokémon Power",
      "name": "Energy Burn",
      "text": "As often as you like during your turn..."
    }
  ],
  "attacks": [
    {
      "cost": ["Fire", "Fire", "Fire", "Fire"],
      "converted_energy_cost": 4,
      "name": "Fire Spin",
      "text": "Discard 2 Energy cards attached to Charizard...",
      "damage": "100"
    }
  ],
  "number": "4",
  "rarity": "Rare Holo",
  "rarity_code": "★H",  // ⚠️ NEW FIELD
  "artist": "Mitsuhiro Arita",
  "national_pokedex_numbers": [6],
  "images": [  // ⚠️ ARRAY, not object
    {
      "type": "front",
      "small": "https://images.scrydex.com/pokemon/base1-4/small",
      "medium": "https://images.scrydex.com/pokemon/base1-4/medium",
      "large": "https://images.scrydex.com/pokemon/base1-4/large"
    }
  ],
  "expansion": {  // ⚠️ COMPLETE EXPANSION OBJECT
    "id": "base1",
    "name": "Base",
    "series": "Base",
    "total": 102,
    "printed_total": 102,
    "language": "English",
    "language_code": "EN",
    "release_date": "1999/01/09",
    "is_online_only": false
  },
  "language": "English",
  "language_code": "EN",
  "expansion_sort_order": 4,  // ⚠️ NEW FIELD
  "variants": [  // ⚠️ VARIANTS WITH PRICING
    {
      "name": "unlimitedHolofoil",
      "prices": []
    },
    {
      "name": "firstEditionShadowlessHolofoil",
      "prices": []
    }
  ]
}
```

### **Pokemon Expansion Object:**
```json
{
  "id": "zsv10pt5",
  "name": "Black Bolt",
  "series": "Scarlet & Violet",
  "code": "BLK",
  "total": 172,
  "printed_total": 86,
  "language": "English",
  "language_code": "EN",
  "release_date": "2025/07/18",
  "is_online_only": false,
  "logo": "https://images.scrydex.com/pokemon/zsv10pt5-logo/logo",
  "symbol": "https://images.scrydex.com/pokemon/zsv10pt5-symbol/symbol"
}
```

## 🚨 **Critical Issues Found**

### **1. HP Field Type:**
- **Expected**: `hp INTEGER`
- **Actual**: `hp TEXT` (e.g., "120")
- **Issue**: HP is returned as string, not integer

### **2. Images Structure:**
- **Expected**: `images: { small: "...", large: "..." }`
- **Actual**: `images: [{ type: "front", small: "...", medium: "...", large: "..." }]`
- **Issue**: Images is an array with type field, includes medium size

### **3. Missing Fields:**
- **rarity_code**: New field not in our schema
- **expansion_sort_order**: New field not in our schema
- **medium image**: New image size not in our schema

### **4. Expansion Object:**
- **Expected**: Flattened `expansion_id` and `expansion_name`
- **Actual**: Complete nested expansion object
- **Issue**: We need to handle the full expansion object

### **5. Variants Structure:**
- **Expected**: Simple variants array
- **Actual**: Variants with pricing arrays
- **Issue**: Each variant can have its own pricing data

## 🔧 **Required Schema Updates**

### **1. Update HP Field:**
```sql
-- Change HP from INTEGER to TEXT
ALTER TABLE pokemon_cards ALTER COLUMN hp TYPE TEXT;
```

### **2. Update Images Structure:**
```sql
-- Add medium image field
ALTER TABLE pokemon_cards ADD COLUMN image_medium TEXT;

-- Update images to handle array structure
-- Store complete images array as JSONB
ALTER TABLE pokemon_cards ADD COLUMN images JSONB;
```

### **3. Add Missing Fields:**
```sql
-- Add rarity_code field
ALTER TABLE pokemon_cards ADD COLUMN rarity_code TEXT;

-- Add expansion_sort_order field
ALTER TABLE pokemon_cards ADD COLUMN expansion_sort_order INTEGER;
```

### **4. Update Expansion Handling:**
```sql
-- Store complete expansion object
ALTER TABLE pokemon_cards ADD COLUMN expansion JSONB;

-- Add expansion fields for easy querying
ALTER TABLE pokemon_cards ADD COLUMN expansion_series TEXT;
ALTER TABLE pokemon_cards ADD COLUMN expansion_total INTEGER;
ALTER TABLE pokemon_cards ADD COLUMN expansion_printed_total INTEGER;
ALTER TABLE pokemon_cards ADD COLUMN expansion_language TEXT;
ALTER TABLE pokemon_cards ADD COLUMN expansion_language_code TEXT;
ALTER TABLE pokemon_cards ADD COLUMN expansion_release_date TEXT;
ALTER TABLE pokemon_cards ADD COLUMN expansion_is_online_only BOOLEAN;
```

### **5. Update Variants Structure:**
```sql
-- Store complete variants array with pricing
ALTER TABLE pokemon_cards ADD COLUMN variants JSONB;
```

## 📋 **Updated Database Schema Requirements**

The database schema needs to be completely updated to match the actual API response structure, including:

1. **HP as TEXT** instead of INTEGER
2. **Images as array** with type, small, medium, large
3. **Complete expansion object** with all fields
4. **Variants with pricing arrays**
5. **New fields**: rarity_code, expansion_sort_order
6. **Proper JSONB storage** for complex objects

This ensures we store exactly what the API returns, nothing more, nothing less.
