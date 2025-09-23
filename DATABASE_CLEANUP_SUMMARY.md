# Database Schema Cleanup Summary

## 🎯 Objective
Clean up the database schema to store only essential transactional data, moving all summary calculations to the frontend for better performance and real-time accuracy.

## 🗑️ What Was Removed

### Views (Calculations moved to frontend):
- **`collection_summary`** - Total items, quantities, invested amounts, market values
- **`current_inventory`** - Unsold items with marketplace information  
- **`sold_items`** - Sold items with profit/loss calculations

### Why These Were Removed:
- **Real-time accuracy** - Frontend calculations always reflect current data
- **Reduced complexity** - Fewer database objects to maintain
- **Better performance** - No need to update summary tables
- **Dynamic filtering** - Can calculate summaries for any data subset
- **Single source of truth** - Raw orders table is the authoritative source

## ✅ What Remains (Essential Data)

### Core Tables:
1. **`orders`** - Individual buy/sell transactions (source of truth)
2. **`items`** - Product catalog with basic info and current market values
3. **`marketplaces`** - Marketplace definitions and fee structures
4. **`retailers`** - User-specific retailer list (NEW)
5. **`user_preferences`** - User settings and preferences

### Key Features Retained:
- **Automatic financial calculations** via triggers (total_cost_cents, profit_percentage, etc.)
- **Row Level Security (RLS)** for data protection
- **Proper indexing** for query performance
- **Foreign key relationships** for data integrity

## 🆕 What Was Added

### Retailers Table:
```sql
CREATE TABLE retailers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    location TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### New Order Columns:
- **`buy_retailer_id`** - Links to retailer for purchase
- **`sell_retailer_id`** - Links to retailer for sale

**Note:** Retailers are shared across users (not user-specific) to avoid duplication of common retailers like "Target", "Walmart", etc.

## 🔄 How Frontend Calculations Work

### Collection Summary (calculated in `Collection.jsx`):
```javascript
const collectionData = (() => {
  // Group orders by item name
  const itemGroups = {};
  orders.forEach(order => {
    // Aggregate quantities, costs, market values
  });
  
  // Calculate totals
  const totalValue = collectionItems.reduce((sum, item) => sum + (item.value * item.quantity), 0);
  const totalPaid = collectionItems.reduce((sum, item) => sum + (item.paid * item.quantity), 0);
  const profitLoss = totalValue - totalPaid;
  const profitLossPercent = totalPaid > 0 ? (profitLoss / totalPaid) * 100 : 0;
  
  return { totalValue, totalPaid, profitLoss, profitLossPercent, items: collectionItems };
})();
```

### Benefits:
- **Real-time updates** - Changes immediately reflect in UI
- **Dynamic filtering** - Can filter by date range, item type, etc.
- **Flexible calculations** - Easy to add new summary metrics
- **Better UX** - No database round-trips for summary data

## 📁 Files Created

1. **`supabase-v2-schema-clean.sql`** - Clean schema without summary views
2. **`migration-cleanup-views.sql`** - Migration script to clean existing database
3. **`DATABASE_CLEANUP_SUMMARY.md`** - This documentation

## 🚀 Migration Steps

1. **Backup your database** before running migration
2. **Run the migration script**:
   ```sql
   -- Execute migration-cleanup-views.sql
   ```
3. **Verify the cleanup** using the verification queries in the migration script
4. **Update your frontend** to ensure all calculations are working correctly

## 🎉 Result

- **Cleaner database** with only essential transactional data
- **Better performance** with real-time frontend calculations
- **More flexible** summary generation and filtering
- **Easier maintenance** with fewer database objects
- **Single source of truth** for all financial data

The database now focuses on what it does best: storing and retrieving transactional data, while the frontend handles what it does best: real-time calculations and user interactions.
