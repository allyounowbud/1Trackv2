# Orderbook Example Usage

## 🎯 How the New Orderbook Works

### Scenario: Tracking Pokemon Card Collection

Let's say you're tracking a Charizard card from "Prismatic Evolutions":

## 📥 Step 1: Buy Orders (Inventory)

```sql
-- Buy 10 cards at $5 each on Jan 1
INSERT INTO buy_orders (item_id, buy_date, buy_price_cents, quantity, buy_location, buy_notes)
VALUES ('charizard-item-id', '2024-01-01', 500, 10, 'Local Store', 'Bought 10 Charizard cards');

-- Buy 5 more cards at $6 each on Jan 15  
INSERT INTO buy_orders (item_id, buy_date, buy_price_cents, quantity, buy_location, buy_notes)
VALUES ('charizard-item-id', '2024-01-15', 600, 5, 'eBay', 'Bought 5 more Charizard cards');
```

**Result:** You now have 15 cards in inventory:
- 10 cards at $5 each (Jan 1)
- 5 cards at $6 each (Jan 15)

## 📤 Step 2: Sell Orders (Sales)

```sql
-- Sell 3 cards at $8 each on Feb 1
INSERT INTO sell_orders (item_id, sell_date, sell_price_cents, quantity, sell_location, sell_fees_cents)
VALUES ('charizard-item-id', '2024-02-01', 800, 3, 'TCGPlayer', 50);
```

**Result:** You sold 3 cards for $8 each, with $0.50 in fees.

## 🔗 Step 3: Order Links (FIFO Cost Basis)

```sql
-- Link the sale to the first buy order (FIFO)
INSERT INTO order_links (sell_order_id, buy_order_id, quantity_linked, cost_basis_cents)
VALUES ('sell-order-id', 'buy-order-jan-1-id', 3, 1500); -- 3 cards at $5 each = $15
```

**Result:** 
- 3 cards from the Jan 1 purchase are now sold
- Remaining inventory: 7 cards at $5 each + 5 cards at $6 each

## 📊 Step 4: Profit Calculation

The system automatically calculates:
- **Revenue:** 3 × $8 = $24
- **Fees:** $0.50
- **Net Revenue:** $24 - $0.50 = $23.50
- **Cost Basis:** $15 (from order links)
- **Profit:** $23.50 - $15 = $8.50
- **Profit %:** ($8.50 / $15) × 100 = 56.67%

## 🔍 Step 5: Query Current Inventory

```sql
-- See what's still available for sale
SELECT * FROM current_inventory WHERE item_name LIKE '%Charizard%';
```

**Result:** Shows 12 cards still available (7 at $5, 5 at $6)

## 📈 Step 6: Query Sold Items with Profit

```sql
-- See all sold items with profit calculations
SELECT * FROM sold_items_with_profit WHERE item_name LIKE '%Charizard%';
```

**Result:** Shows the 3 sold cards with $8.50 profit

## 🎯 Key Benefits

### 1. **Clear Inventory Tracking**
- Know exactly which buy orders are still available
- Track quantity remaining for each purchase

### 2. **Accurate Profit/Loss**
- Each sale is linked to specific buy orders
- FIFO cost basis ensures accurate profit calculation

### 3. **Partial Sales**
- Can sell part of a buy order (3 out of 10 cards)
- Remaining quantity automatically tracked

### 4. **Audit Trail**
- Complete history of every transaction
- Can trace profit back to specific purchases

### 5. **Flexible Reporting**
- Query by date range, item, profit, etc.
- Easy to generate tax reports

## 🔄 Frontend Integration

### Collection Page
```javascript
// Get current inventory
const inventory = await supabase
  .from('current_inventory')
  .select('*')
  .order('buy_date', { ascending: true }); // FIFO order

// Get sold items with profit
const soldItems = await supabase
  .from('sold_items_with_profit')
  .select('*')
  .order('sell_date', { ascending: false });
```

### Add to Collection
```javascript
// Create buy order
const { data: buyOrder } = await supabase
  .from('buy_orders')
  .insert({
    item_id: itemId,
    buy_date: buyDate,
    buy_price_cents: buyPriceCents,
    quantity: quantity,
    buy_location: location,
    buy_notes: notes
  });
```

### Mark as Sold
```javascript
// Create sell order
const { data: sellOrder } = await supabase
  .from('sell_orders')
  .insert({
    item_id: itemId,
    sell_date: sellDate,
    sell_price_cents: sellPriceCents,
    quantity: quantity,
    sell_location: location,
    sell_fees_cents: feesCents
  });

// Create order links (FIFO)
const availableOrders = await supabase
  .from('buy_orders')
  .select('*')
  .eq('item_id', itemId)
  .eq('is_available_for_sale', true)
  .gt('quantity_remaining', 0)
  .order('buy_date', { ascending: true });

let remainingToLink = quantity;
for (const buyOrder of availableOrders.data) {
  const quantityToLink = Math.min(remainingToLink, buyOrder.quantity_remaining);
  
  await supabase
    .from('order_links')
    .insert({
      sell_order_id: sellOrder.id,
      buy_order_id: buyOrder.id,
      quantity_linked: quantityToLink,
      cost_basis_cents: quantityToLink * buyOrder.buy_price_cents
    });
  
  remainingToLink -= quantityToLink;
  if (remainingToLink <= 0) break;
}
```

## 🎉 Result

You now have a professional-grade orderbook that:
- ✅ Tracks individual transactions clearly
- ✅ Handles multiple orders of the same item
- ✅ Calculates accurate profit/loss
- ✅ Maintains proper inventory levels
- ✅ Provides complete audit trail
- ✅ Supports partial sales
- ✅ Enables flexible reporting

This is exactly what you need for a professional collectibles tracking app!
