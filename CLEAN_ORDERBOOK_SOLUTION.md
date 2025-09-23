# Clean Orderbook Solution

## 🎯 The Problem
You're right to be confused! The current system has:
- `orders` table (old system)
- `buy_orders` table (new system) 
- `sell_orders` table (new system)
- `order_links` table (new system)
- Plus views like `individual_orders`, `collection_summary`, etc.

When you delete an order, it's only deleted from one table but still exists in others. This is messy and confusing.

## 💡 Simple Solution: Use ONE Table

Instead of multiple tables, let's use a single, clean `orders` table that handles everything properly.

### Clean Orders Table Structure:
```sql
CREATE TABLE orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    
    -- Order identification
    order_number INTEGER, -- Order #1, #2, #3 for same item
    
    -- Buy information
    buy_date DATE NOT NULL,
    buy_price_cents INTEGER NOT NULL, -- Price per item
    buy_quantity INTEGER NOT NULL DEFAULT 1,
    buy_location TEXT,
    buy_marketplace_id UUID REFERENCES marketplaces(id),
    buy_retailer_id UUID REFERENCES retailers(id),
    buy_notes TEXT,
    
    -- Sell information (if sold)
    sell_date DATE,
    sell_price_cents INTEGER, -- Price per item
    sell_quantity INTEGER,
    sell_location TEXT,
    sell_marketplace_id UUID REFERENCES marketplaces(id),
    sell_retailer_id UUID REFERENCES retailers(id),
    sell_fees_cents INTEGER DEFAULT 0,
    sell_notes TEXT,
    
    -- Status
    is_sold BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'delivered', -- 'ordered', 'shipped', 'delivered', 'sold'
    
    -- Calculated fields
    total_cost_cents INTEGER, -- buy_price_cents * buy_quantity
    total_revenue_cents INTEGER, -- sell_price_cents * sell_quantity (if sold)
    net_profit_cents INTEGER, -- total_revenue_cents - total_cost_cents - sell_fees_cents
    profit_percentage DECIMAL(5,2), -- (net_profit_cents / total_cost_cents) * 100
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔧 How It Works

### Adding Orders:
1. User adds item to collection
2. System creates ONE record in `orders` table
3. Gets next order number for that item (Order #1, #2, etc.)

### Marking as Sold:
1. User marks order as sold
2. System updates the SAME record with sell information
3. Calculates profit automatically

### Deleting Orders:
1. User deletes order
2. System deletes the ONE record from `orders` table
3. Done. No orphaned data anywhere.

## 🎯 Benefits

- ✅ **One source of truth** - All order data in one place
- ✅ **Simple deletion** - Delete one record, everything is gone
- ✅ **Clear order tracking** - Order #1, #2, #3 for same item
- ✅ **Automatic calculations** - Profit/loss calculated automatically
- ✅ **No confusion** - No duplicate data across multiple tables

## 📋 Implementation

1. **Clean up existing tables** - Remove the confusing multiple tables
2. **Use single orders table** - One clean table for everything
3. **Update frontend** - Simple queries to one table
4. **Automatic order numbering** - Each order gets a sequence number

This is much simpler and cleaner than the complex multi-table system. Would you like me to implement this clean solution?
