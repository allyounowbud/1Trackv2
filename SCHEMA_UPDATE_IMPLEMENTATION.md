# Database Schema Update Implementation Guide

## 🎯 **Objective**
Update the database schema to exactly match the Scrydex API response structure, ensuring we store only the data returned by the API and nothing more.

## 📋 **Files Created**

### 1. **api-schema-analysis.md**
- Detailed analysis comparing current schema vs API structure
- Identifies all mismatches and missing fields
- Documents the exact API response format

### 2. **update-schema-to-match-api.sql**
- Complete database schema update for main tables
- Matches exact Scrydex API response structure
- Includes helper functions for data extraction
- Preserves all API data while enabling easy querying

### 3. **update-search-cache-schema.sql**
- Updated search cache table structure
- Stores complete API responses as JSONB
- Individual card/product caching with proper structure

## 🔧 **Key Changes Made**

### **pokemon_cards Table Updates:**
- ✅ **Fixed field mappings**: `image_url` → `image_small` + `image_large`
- ✅ **Fixed expansion reference**: `expansion_id` + `expansion_name` (flattened from nested API structure)
- ✅ **Added missing fields**: `legalities` (from API)
- ✅ **Updated pricing structure**: Complete `prices` JSONB + individual price fields
- ✅ **Preserved all existing fields** that match API structure

### **pokemon_expansions Table Updates:**
- ✅ **Fixed field mappings**: `logo_url` → `logo`, `symbol_url` → `symbol`
- ✅ **Updated data types**: `release_date` as TEXT (API returns string)
- ✅ **Preserved all existing fields** that match API structure

### **search_cache Table Updates:**
- ✅ **Added `api_response` JSONB**: Stores complete API response
- ✅ **Updated structure**: Matches API response format exactly
- ✅ **Enhanced caching**: Individual cards/products with proper structure

## 🚀 **Implementation Steps**

### **Step 1: Backup Current Data**
```sql
-- Create backup tables
CREATE TABLE pokemon_cards_backup AS SELECT * FROM pokemon_cards;
CREATE TABLE pokemon_expansions_backup AS SELECT * FROM pokemon_expansions;
CREATE TABLE search_cache_backup AS SELECT * FROM search_cache;
```

### **Step 2: Apply Schema Updates**
```bash
# Run the schema update scripts
psql -d your_database -f update-schema-to-match-api.sql
psql -d your_database -f update-search-cache-schema.sql
```

### **Step 3: Migrate Existing Data (if any)**
```sql
-- Migrate existing cards data
INSERT INTO pokemon_cards (
    id, name, supertype, types, subtypes, hp, number, rarity,
    expansion_id, expansion_name, image_small, image_large,
    abilities, attacks, weaknesses, resistances, retreat_cost,
    converted_retreat_cost, artist, flavor_text, regulation_mark,
    language, language_code, national_pokedex_numbers,
    created_at, updated_at
)
SELECT 
    id, name, supertype, types, subtypes, hp, number, rarity,
    expansion_id, expansion_name, image_url, image_url, -- Map old image_url to both small and large
    abilities, attacks, weaknesses, resistances, retreat_cost,
    converted_retreat_cost, artist, flavor_text, regulation_mark,
    language, language_code, national_pokedex_numbers,
    created_at, updated_at
FROM pokemon_cards_backup;

-- Migrate existing expansions data
INSERT INTO pokemon_expansions (
    id, name, series, code, total, printed_total, language,
    language_code, release_date, is_online_only, logo, symbol, translation,
    created_at, updated_at
)
SELECT 
    id, name, series, code, total, printed_total, language,
    language_code, release_date::TEXT, is_online_only, logo_url, symbol_url, translation,
    created_at, updated_at
FROM pokemon_expansions_backup;
```

### **Step 4: Update Application Code**
Update the sync service to use the new helper functions:

```typescript
// In scrydex-sync service
import { store_scrydex_card, store_scrydex_expansion } from './database-functions';

// Store card data
await supabase.rpc('store_scrydex_card', { card_data: cardResponse });

// Store expansion data  
await supabase.rpc('store_scrydex_expansion', { expansion_data: expansionResponse });
```

## 🔍 **Verification Steps**

### **1. Test API Response Storage**
```sql
-- Test storing a sample card
SELECT store_scrydex_card('{
  "id": "test-card",
  "name": "Test Card",
  "supertype": "Pokemon",
  "types": ["Lightning"],
  "prices": {
    "market": {"usd": 1.50},
    "tcgplayer": {"usd": 1.25}
  }
}'::jsonb);
```

### **2. Verify Data Extraction**
```sql
-- Check that pricing data was extracted correctly
SELECT 
    id, name, 
    market_price_usd, tcgplayer_price_usd,
    prices
FROM pokemon_cards 
WHERE id = 'test-card';
```

### **3. Test Search Cache**
```sql
-- Test storing search results
SELECT store_search_cache(
    'test-search-key',
    'pikachu',
    'pokemon',
    'general',
    NULL,
    1,
    100,
    '{"data": [], "total": 0}'::jsonb,
    '[]'::jsonb,
    0
);
```

## 📊 **Benefits of This Update**

### **✅ Data Integrity**
- Stores exactly what API returns, nothing more, nothing less
- No data loss or corruption during sync
- Complete API response preservation

### **✅ Performance**
- Individual price fields for fast queries
- Proper indexing on all searchable fields
- JSONB storage for complex nested data

### **✅ Flexibility**
- Can handle API changes without schema updates
- Raw API data always available
- Easy to add new fields as API evolves

### **✅ Maintainability**
- Clear field mappings to API structure
- Helper functions for data extraction
- Comprehensive documentation

## 🚨 **Important Notes**

1. **Backup First**: Always backup existing data before applying schema changes
2. **Test Environment**: Test the schema updates in a development environment first
3. **API Credentials**: Ensure Scrydex API credentials are properly configured
4. **Sync Process**: Update the sync service to use new helper functions
5. **Application Code**: Update any code that references old field names

## 🔄 **Next Steps**

1. **Apply Schema Updates**: Run the SQL scripts in your database
2. **Update Sync Service**: Modify the sync service to use new structure
3. **Test Sync Process**: Run a test sync to verify everything works
4. **Update Application**: Update any code that uses the old field names
5. **Monitor Performance**: Watch for any performance issues after deployment

This update ensures your database schema perfectly matches the Scrydex API response structure, providing a solid foundation for reliable data synchronization.
