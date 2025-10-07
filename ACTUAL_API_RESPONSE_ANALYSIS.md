# Actual Scrydex API Response Analysis

## 🎯 **Real API Response Structure**

Based on the actual API responses you provided, here's the exact structure:

### **Raw Pricing Response:**
```json
{
  "condition": "NM",
  "is_perfect": false,
  "is_signed": false,
  "is_error": false,
  "type": "raw",
  "low": 868.0,
  "market": 915.43,
  "currency": "USD",
  "trends": {
    "days_1": { "price_change": 0.0, "percent_change": 0.0 },
    "days_7": { "price_change": -16.59, "percent_change": -1.78 },
    "days_14": { "price_change": -44.32, "percent_change": -4.62 },
    "days_30": { "price_change": -95.64, "percent_change": -9.46 },
    "days_90": { "price_change": -365.6, "percent_change": -28.54 },
    "days_180": { "price_change": -646.65, "percent_change": -41.4 }
  }
}
```

### **Graded Pricing Response:**
```json
{
  "grade": "10",
  "company": "PSA",
  "is_perfect": false,
  "is_signed": false,
  "is_error": false,
  "type": "graded",
  "low": 2350.0,
  "mid": 2566.0,
  "high": 2650.0,
  "market": 2567.88,
  "currency": "USD",
  "trends": {
    "days_1": { "price_change": 111.75, "percent_change": 4.55 },
    "days_7": { "price_change": 111.75, "percent_change": 4.55 },
    "days_14": { "price_change": -11.3, "percent_change": -0.44 },
    "days_30": { "price_change": -10.93, "percent_change": -0.42 },
    "days_90": { "price_change": -153.12, "percent_change": -5.63 },
    "days_180": { "price_change": -1658.19, "percent_change": -39.24 }
  }
}
```

## 🔍 **Key Differences from Expected Structure**

### **❌ What We Expected vs ✅ What We Got:**

1. **Trends Structure:**
   - **Expected**: `{ "days_7": { "percent_change": 5.2 } }`
   - **Actual**: `{ "days_7": { "price_change": -16.59, "percent_change": -1.78 } }`
   - **Difference**: Actual includes both `price_change` and `percent_change`

2. **Trend Periods:**
   - **Expected**: `days_7`, `days_30`, `days_90`, `days_365`
   - **Actual**: `days_1`, `days_7`, `days_14`, `days_30`, `days_90`, `days_180`
   - **Difference**: More granular trend periods, no `days_365`

3. **Graded Pricing Fields:**
   - **Expected**: `grade: "PSA 10"`
   - **Actual**: `grade: "10"` and `company: "PSA"`
   - **Difference**: Grade and company are separate fields

4. **Missing Fields:**
   - **Expected**: `condition` field in graded pricing
   - **Actual**: No `condition` field in graded pricing
   - **Difference**: Graded pricing doesn't have condition field

## 🚨 **Critical Issues Found**

1. **Database Schema Mismatch**: Our current schema doesn't match the actual API response
2. **Trend Periods**: We're missing `days_1`, `days_14`, and `days_180` trend periods
3. **Price Change Data**: We're missing `price_change` values in trends
4. **Graded Condition**: Graded pricing doesn't have condition field

## 🔧 **Required Database Schema Updates**

### **1. Update Trends Structure:**
```sql
-- Add missing trend periods and price_change fields
ALTER TABLE pokemon_cards ADD COLUMN IF NOT EXISTS raw_trend_1d DECIMAL(10,2);
ALTER TABLE pokemon_cards ADD COLUMN IF NOT EXISTS raw_trend_14d DECIMAL(10,2);
ALTER TABLE pokemon_cards ADD COLUMN IF NOT EXISTS raw_trend_180d DECIMAL(10,2);
ALTER TABLE pokemon_cards ADD COLUMN IF NOT EXISTS raw_price_change_1d DECIMAL(10,2);
ALTER TABLE pokemon_cards ADD COLUMN IF NOT EXISTS raw_price_change_7d DECIMAL(10,2);
ALTER TABLE pokemon_cards ADD COLUMN IF NOT EXISTS raw_price_change_14d DECIMAL(10,2);
ALTER TABLE pokemon_cards ADD COLUMN IF NOT EXISTS raw_price_change_30d DECIMAL(10,2);
ALTER TABLE pokemon_cards ADD COLUMN IF NOT EXISTS raw_price_change_90d DECIMAL(10,2);
ALTER TABLE pokemon_cards ADD COLUMN IF NOT EXISTS raw_price_change_180d DECIMAL(10,2);

-- Same for graded pricing
ALTER TABLE pokemon_cards ADD COLUMN IF NOT EXISTS graded_trend_1d DECIMAL(10,2);
ALTER TABLE pokemon_cards ADD COLUMN IF NOT EXISTS graded_trend_14d DECIMAL(10,2);
ALTER TABLE pokemon_cards ADD COLUMN IF NOT EXISTS graded_trend_180d DECIMAL(10,2);
ALTER TABLE pokemon_cards ADD COLUMN IF NOT EXISTS graded_price_change_1d DECIMAL(10,2);
ALTER TABLE pokemon_cards ADD COLUMN IF NOT EXISTS graded_price_change_7d DECIMAL(10,2);
ALTER TABLE pokemon_cards ADD COLUMN IF NOT EXISTS graded_price_change_14d DECIMAL(10,2);
ALTER TABLE pokemon_cards ADD COLUMN IF NOT EXISTS graded_price_change_30d DECIMAL(10,2);
ALTER TABLE pokemon_cards ADD COLUMN IF NOT EXISTS graded_price_change_90d DECIMAL(10,2);
ALTER TABLE pokemon_cards ADD COLUMN IF NOT EXISTS graded_price_change_180d DECIMAL(10,2);
```

### **2. Update Trends JSONB Structure:**
```sql
-- Update the trends JSONB to match actual API structure
-- Raw trends should include: days_1, days_7, days_14, days_30, days_90, days_180
-- Each with: price_change and percent_change
```

### **3. Remove Graded Condition Field:**
```sql
-- Remove graded_condition field since it doesn't exist in API
ALTER TABLE pokemon_cards DROP COLUMN IF EXISTS graded_condition;
```

## 📋 **Updated Database Schema**

The database schema needs to be updated to exactly match the actual API response structure, including:
- All trend periods (1, 7, 14, 30, 90, 180 days)
- Both price_change and percent_change values
- Separate grade and company fields for graded pricing
- No condition field for graded pricing

This ensures we store exactly what the API returns, nothing more, nothing less.
