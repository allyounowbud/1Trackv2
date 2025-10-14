# 🚀 Partial Sales Migration - Complete Checklist

## 📋 Quick Start Guide

Follow these steps to complete the migration to quantity-based partial sales support.

---

## ✅ Step 1: Database Migration

### **⚠️ Important: If you get a view dependency error**

If you see an error like: `cannot drop view individual_orders_clean because other objects depend on it`

**Quick Fix:**
1. Run `fix-view-dependencies.sql` first to drop all views with CASCADE
2. Then proceed with the migration scripts below

### **Run in Supabase SQL Editor (in order):**

1. **`migrate-to-quantity-based-sales.sql`**
   - Migrates `is_sold` data to `quantity_sold`
   - Adds performance indexes
   - Creates computed `is_fully_sold` column
   - Updates all views with quantity-based logic
   - **Run this first!**

2. **`create-mark-order-sold-function.sql`**
   - Creates/updates the `mark_order_sold()` database function
   - Handles partial sales with validation
   - Prevents overselling
   - **Run this second!**

3. **`cleanup-orders-table.sql`** *(Optional)*
   - Removes redundant API data columns
   - Optimizes views for performance
   - **Only run if you want to clean up old data**

---

## ✅ Step 2: Verify Migration

### **Check Database State:**
```sql
-- Verify all orders have quantity_sold initialized
SELECT 
  COUNT(*) as total_orders,
  COUNT(*) FILTER (WHERE quantity_sold IS NULL) as missing_quantity_sold,
  COUNT(*) FILTER (WHERE quantity_sold = 0) as on_hand,
  COUNT(*) FILTER (WHERE quantity_sold > 0) as has_sales
FROM orders;
```

Expected result:
- `missing_quantity_sold` should be **0**
- All orders should have `quantity_sold` populated

### **Test Views:**
```sql
-- Test the updated view
SELECT * FROM individual_orders_clean LIMIT 5;

-- Check quantity-based filtering works
SELECT * FROM orders_on_hand LIMIT 5;
SELECT * FROM orders_sold LIMIT 5;
```

### **Test mark_order_sold Function:**
```sql
-- Find a test order
SELECT id, quantity, quantity_sold 
FROM orders 
WHERE quantity_sold = 0 
LIMIT 1;

-- Test partial sale (replace UUID with actual order ID)
SELECT mark_order_sold(
  'YOUR-ORDER-ID-HERE'::uuid,
  CURRENT_DATE,
  5000,  -- $50 per item
  2,     -- Sell 2 items
  'eBay',
  200,   -- $2 fees
  'Test sale'
);

-- Verify it worked
SELECT quantity, quantity_sold FROM orders WHERE id = 'YOUR-ORDER-ID-HERE';
```

---

## ✅ Step 3: Frontend Testing

### **Test Order Creation:**
1. Open your app at `http://localhost:5173`
2. Navigate to Collection page
3. Click "Add to Collection"
4. Add an item with quantity 5
5. **Verify in database:**
   ```sql
   SELECT * FROM orders ORDER BY created_at DESC LIMIT 1;
   ```
6. Check `quantity_sold` is **0**

### **Test Collection View:**
1. View your collection
2. Should see all items with `quantity_sold = 0`
3. Stats should calculate correctly
4. **Try filtering** by Ungraded/Graded/Sealed

### **Test Mark as Sold:**
1. Find an order in your collection
2. Click the menu → "Mark as Sold"
3. Enter sale details:
   - Sell 2 items out of 5
   - Price: $60/item
   - Location: "eBay"
4. Submit
5. **Verify:**
   - Collection shows 3 remaining
   - Order still appears in collection
   - Database shows `quantity_sold = 2`

### **Test Partial Sale:**
1. Find the same order again
2. Mark 3 more as sold (complete the sale)
3. **Verify:**
   - Order disappears from Collection view
   - Database shows `quantity_sold = 5`
   - Order would appear in Sold Items view

---

## ✅ Step 4: Edge Case Testing

### **Test Validation:**
- [ ] Try to sell more than remaining quantity (should error)
- [ ] Sell 0 items (should work, no change)
- [ ] Sell exact remaining quantity (should fully sell)

### **Test Editing:**
- [ ] Edit an order's purchase details
- [ ] Edit quantity on an order
- [ ] Edit partially sold order
- [ ] Delete an order

### **Test Search & Filters:**
- [ ] Search by item name
- [ ] Search by retailer
- [ ] Filter by status (all/on_hand/sold)
- [ ] Filter by type (Ungraded/Graded/Sealed)

---

## ✅ Step 5: Performance Check

### **Run Performance Test:**
```sql
-- Test query speed with indexes
EXPLAIN ANALYZE
SELECT * FROM orders 
WHERE quantity_sold < quantity
AND user_id = auth.uid();

-- Should use indexes: idx_orders_quantity_sold and idx_orders_quantity
```

### **Check Index Usage:**
```sql
-- Verify indexes exist
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename = 'orders'
AND indexname LIKE 'idx_orders_quantity%';
```

Expected indexes:
- `idx_orders_quantity`
- `idx_orders_quantity_sold`
- `idx_orders_quantity_status`
- `idx_orders_is_fully_sold`

---

## 📊 Migration Verification Checklist

### **Database ✅**
- [ ] `migrate-to-quantity-based-sales.sql` executed successfully
- [ ] `create-mark-order-sold-function.sql` executed successfully
- [ ] All orders have `quantity_sold` initialized
- [ ] Views created successfully
- [ ] Indexes created successfully
- [ ] `mark_order_sold()` function works

### **Frontend ✅**
- [ ] App loads without errors
- [ ] Collection view displays correctly
- [ ] Can create new orders
- [ ] New orders have `quantity_sold = 0`
- [ ] Mark as Sold modal opens
- [ ] Can mark items as sold
- [ ] Partial sales work correctly
- [ ] Stats calculate correctly
- [ ] Search works
- [ ] Filters work

### **Data Integrity ✅**
- [ ] No orders with `quantity_sold > quantity`
- [ ] All new orders initialize `quantity_sold = 0`
- [ ] Profit calculations are accurate
- [ ] Market values calculate correctly
- [ ] Collection stats are accurate

---

## 🐛 Troubleshooting

### **Problem: "cannot drop view individual_orders_clean because other objects depend on it"**
**Solution:** The migration tries to recreate views that have dependencies. Two options:

**Option 1 (Recommended):**
```sql
-- Run this fix script first
-- File: fix-view-dependencies.sql
DROP VIEW IF EXISTS orders_fully_sold CASCADE;
DROP VIEW IF EXISTS orders_partially_sold CASCADE;
DROP VIEW IF EXISTS orders_sold CASCADE;
DROP VIEW IF EXISTS orders_on_hand CASCADE;
DROP VIEW IF EXISTS individual_orders_clean CASCADE;
DROP VIEW IF EXISTS collection_summary_clean CASCADE;
```
Then run the migration scripts normally.

**Option 2:**
The updated migration scripts now handle this automatically by dropping dependent views first. Make sure you're using the latest version of the scripts.

### **Problem: Modal shows error when creating order**
**Solution:** Check that all required fields have correct names:
- `purchase_date` (not `buy_date`)
- `price_per_item_cents` (not `buy_price_cents`)
- `quantity` (not `buy_quantity`)
- `quantity_sold` must be initialized to 0

### **Problem: Collection shows wrong quantities**
**Solution:** Verify you're using `getRemainingCount(order)` everywhere:
```javascript
// ❌ WRONG
const qty = order.quantity;

// ✅ CORRECT
const qty = getRemainingCount(order);
```

### **Problem: Can't mark orders as sold**
**Solution:** Check that `mark_order_sold()` function exists:
```sql
-- Check function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'mark_order_sold';
```

### **Problem: Orders disappearing from collection**
**Solution:** They might be fully sold! Check:
```sql
SELECT id, quantity, quantity_sold 
FROM orders 
WHERE id = 'YOUR-ORDER-ID';
```
If `quantity_sold >= quantity`, it's fully sold and correctly hidden.

### **Problem: Database errors about missing columns**
**Solution:** Run the migration scripts in correct order:
1. First: `migrate-to-quantity-based-sales.sql`
2. Second: `create-mark-order-sold-function.sql`

### **Problem: Performance is slow**
**Solution:** Verify indexes were created:
```sql
-- Check indexes
\d orders
-- Look for indexes on quantity and quantity_sold
```

---

## 🎉 Success Criteria

Your migration is complete when:

1. ✅ All 3 SQL migration files executed successfully
2. ✅ All orders have `quantity_sold` populated (not NULL)
3. ✅ Can create new orders via modals
4. ✅ Can mark orders as sold (full or partial)
5. ✅ Collection view shows correct remaining quantities
6. ✅ Stats calculate correctly
7. ✅ No linter errors in frontend code
8. ✅ No console errors in browser
9. ✅ Can edit and delete orders
10. ✅ Search and filters work correctly

---

## 📞 Need Help?

### **Common Commands:**

**Check order status:**
```sql
SELECT 
  id, 
  quantity, 
  quantity_sold,
  quantity - COALESCE(quantity_sold, 0) as remaining,
  CASE 
    WHEN quantity_sold = 0 THEN 'on_hand'
    WHEN quantity_sold >= quantity THEN 'fully_sold'
    ELSE 'partially_sold'
  END as status
FROM orders
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 10;
```

**Reset a test order:**
```sql
-- Reset quantity_sold for testing
UPDATE orders 
SET quantity_sold = 0
WHERE id = 'YOUR-ORDER-ID';
```

**Check view contents:**
```sql
-- See what's in the view
SELECT * FROM individual_orders_clean LIMIT 10;
```

---

## 🚢 Ready to Deploy!

Once all checklist items are complete:
1. Commit your changes
2. Push to your repository
3. Deploy to production
4. Monitor for any issues
5. Celebrate! 🎉

Your app now supports partial sales with full edit/delete capabilities!

