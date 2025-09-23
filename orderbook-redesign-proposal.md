# Orderbook Redesign Proposal

## 🎯 Problem
Current orderbook structure has a fundamental issue:
- Single record tries to handle both buy and sell
- When you have 50 orders of the same item, it's unclear which specific orders are sold
- Can't track profit/loss for specific transactions
- Inventory tracking becomes confusing

## 💡 Solution: Separate Buy and Sell Orders

### New Structure:
1. **Buy Orders** - Individual purchase transactions
2. **Sell Orders** - Individual sale transactions  
3. **Order Links** - Connect specific buy orders to sell orders

## 📊 Proposed Schema

### Buy Orders Table
```sql
CREATE TABLE buy_orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    item_id UUID NOT NULL REFERENCES items(id),
    
    -- Purchase details
    buy_date DATE NOT NULL,
    buy_price_cents INTEGER NOT NULL, -- Price per item
    quantity INTEGER NOT NULL DEFAULT 1,
    buy_location TEXT,
    buy_marketplace_id UUID REFERENCES marketplaces(id),
    buy_retailer_id UUID REFERENCES retailers(id),
    buy_notes TEXT,
    
    -- Status
    status TEXT DEFAULT 'delivered', -- 'ordered', 'shipped', 'delivered'
    is_available_for_sale BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Sell Orders Table
```sql
CREATE TABLE sell_orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    item_id UUID NOT NULL REFERENCES items(id),
    
    -- Sale details
    sell_date DATE NOT NULL,
    sell_price_cents INTEGER NOT NULL, -- Price per item
    quantity INTEGER NOT NULL DEFAULT 1,
    sell_location TEXT,
    sell_marketplace_id UUID REFERENCES marketplaces(id),
    sell_retailer_id UUID REFERENCES retailers(id),
    sell_fees_cents INTEGER DEFAULT 0,
    sell_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Order Links Table (FIFO/LIFO Tracking)
```sql
CREATE TABLE order_links (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sell_order_id UUID NOT NULL REFERENCES sell_orders(id) ON DELETE CASCADE,
    buy_order_id UUID NOT NULL REFERENCES buy_orders(id),
    
    -- Link details
    quantity_linked INTEGER NOT NULL, -- How many from this buy order were sold
    cost_basis_cents INTEGER NOT NULL, -- Cost basis for this specific quantity
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔄 How It Works

### Example Scenario:
1. **Buy 10 cards** at $5 each on Jan 1
2. **Buy 5 cards** at $6 each on Jan 15  
3. **Sell 3 cards** at $8 each on Feb 1

### Order Links (FIFO):
- Sell Order #1 → Buy Order #1 (3 cards at $5 each)
- Remaining: 7 cards from Buy Order #1, 5 cards from Buy Order #2

### Profit Calculation:
- Cost Basis: 3 × $5 = $15
- Revenue: 3 × $8 = $24
- Profit: $24 - $15 = $9

## 🎯 Benefits

1. **Clear Inventory Tracking** - Know exactly which buy orders are still available
2. **Accurate Profit/Loss** - Track profit for each specific transaction
3. **FIFO/LIFO Support** - Can implement different cost basis methods
4. **Partial Sales** - Can sell part of a buy order
5. **Audit Trail** - Complete history of every transaction
6. **Flexible Reporting** - Can analyze by date, item, profit, etc.

## 🔧 Implementation Options

### Option 1: Complete Redesign
- Replace current `orders` table with new structure
- Requires data migration
- Cleanest long-term solution

### Option 2: Hybrid Approach  
- Keep current `orders` table for existing data
- Add new tables for future transactions
- Gradual migration

### Option 3: Enhanced Current Structure
- Add `parent_order_id` to link related orders
- Add `quantity_remaining` to track inventory
- Less disruptive but more complex

## 🤔 Questions for You

1. **Do you want to migrate existing data** or start fresh?
2. **FIFO or LIFO** for cost basis calculation?
3. **How important is historical data** vs. clean new structure?
4. **Do you need partial sales** (sell 2 out of 10 cards)?

## 📋 Next Steps

1. **Choose implementation approach**
2. **Create migration scripts**
3. **Update frontend logic**
4. **Test with sample data**
5. **Deploy and verify**

What do you think? Which approach makes the most sense for your use case?
