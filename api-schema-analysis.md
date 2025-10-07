# Scrydex API vs Database Schema Analysis

## 🔍 **API Response Structure Analysis**

Based on the TypeScript interfaces in `supabase/functions/scrydex-sync/index.ts`, here's the exact structure of Scrydex API responses:

### **ScrydexCard Interface**
```typescript
interface ScrydexCard {
  id: string;
  name: string;
  supertype: string;
  types?: string[];
  subtypes?: string[];
  hp?: number;
  number?: string;
  rarity?: string;
  expansion?: {
    id: string;
    name: string;
  };
  images?: {
    small?: string;
    large?: string;
  };
  abilities?: any[];
  attacks?: any[];
  weaknesses?: any[];
  resistances?: any[];
  retreat_cost?: string[];
  converted_retreat_cost?: number;
  artist?: string;
  flavor_text?: string;
  regulation_mark?: string;
  language?: string;
  language_code?: string;
  national_pokedex_numbers?: number[];
  legalities?: any;
  prices?: {
    market?: {
      usd?: number;
      eur?: number;
      gbp?: number;
    };
    tcgplayer?: {
      usd?: number;
      eur?: number;
      gbp?: number;
    };
    cardmarket?: {
      eur?: number;
      usd?: number;
      gbp?: number;
    };
  };
}
```

### **ScrydexExpansion Interface**
```typescript
interface ScrydexExpansion {
  id: string;
  name: string;
  series?: string;
  code?: string;
  total?: number;
  printed_total?: number;
  language?: string;
  language_code?: string;
  release_date?: string;
  is_online_only?: boolean;
  logo?: string;
  symbol?: string;
  translation?: any;
}
```

## 📊 **Current Database Schema vs API Structure**

### **pokemon_cards Table Issues:**

#### ✅ **Fields that match API:**
- `id` ✅ (matches `id`)
- `name` ✅ (matches `name`)
- `supertype` ✅ (matches `supertype`)
- `types` ✅ (matches `types[]`)
- `subtypes` ✅ (matches `subtypes[]`)
- `hp` ✅ (matches `hp`)
- `number` ✅ (matches `number`)
- `rarity` ✅ (matches `rarity`)
- `abilities` ✅ (matches `abilities[]`)
- `attacks` ✅ (matches `attacks[]`)
- `weaknesses` ✅ (matches `weaknesses[]`)
- `resistances` ✅ (matches `resistances[]`)
- `retreat_cost` ✅ (matches `retreat_cost[]`)
- `converted_retreat_cost` ✅ (matches `converted_retreat_cost`)
- `artist` ✅ (matches `artist`)
- `flavor_text` ✅ (matches `flavor_text`)
- `regulation_mark` ✅ (matches `regulation_mark`)
- `language` ✅ (matches `language`)
- `language_code` ✅ (matches `language_code`)
- `national_pokedex_numbers` ✅ (matches `national_pokedex_numbers[]`)

#### ❌ **Fields that DON'T match API:**
- `expansion_id` ❌ (API has `expansion.id`)
- `expansion_name` ❌ (API has `expansion.name`)
- `image_url` ❌ (API has `images.small` and `images.large`)
- `market_price` ❌ (API has `prices.market.usd`)
- `low_price` ❌ (API has `prices.tcgplayer.usd`)
- `mid_price` ❌ (API has `prices.cardmarket.eur`)
- `high_price` ❌ (API has `prices.cardmarket.eur`)

#### ❌ **Missing API fields:**
- `legalities` ❌ (not in database)
- `prices` ❌ (complex pricing structure not stored)

### **pokemon_expansions Table Issues:**

#### ✅ **Fields that match API:**
- `id` ✅ (matches `id`)
- `name` ✅ (matches `name`)
- `series` ✅ (matches `series`)
- `code` ✅ (matches `code`)
- `total` ✅ (matches `total`)
- `printed_total` ✅ (matches `printed_total`)
- `language` ✅ (matches `language`)
- `language_code` ✅ (matches `language_code`)
- `release_date` ✅ (matches `release_date`)
- `is_online_only` ✅ (matches `is_online_only`)
- `translation` ✅ (matches `translation`)

#### ❌ **Fields that DON'T match API:**
- `logo_url` ❌ (API has `logo`)
- `symbol_url` ❌ (API has `symbol`)

## 🚨 **Critical Issues Found:**

1. **Pricing Structure Mismatch**: The API returns a complex nested pricing object, but our database has simple decimal fields
2. **Image Structure Mismatch**: API returns `images.small` and `images.large`, but database has single `image_url`
3. **Expansion Reference Mismatch**: API has nested `expansion` object, but database has separate `expansion_id` and `expansion_name`
4. **Missing Fields**: `legalities` field from API is not stored in database

## 🔧 **Recommended Schema Updates:**

### **Option 1: Store Raw API Data (Recommended)**
Store the complete API response as JSONB to preserve all data exactly as received.

### **Option 2: Flatten API Structure**
Update schema to match the exact API structure with proper field mappings.

### **Option 3: Hybrid Approach**
Store both raw API data and flattened fields for easy querying.
