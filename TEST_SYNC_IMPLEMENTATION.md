# Test Sync Implementation - 10 Cards

## 🎯 **What We've Implemented**

I've added a **test sync feature** that syncs only 10 cards to verify everything works before doing a massive sync.

## 🔧 **Changes Made**

### **1. Edge Function Updates (`supabase/functions/scrydex-sync/index.ts`)**
- ✅ Added `testSync()` method that limits to 10 cards
- ✅ Added `syncCardsLimited(limit)` method for controlled card syncing
- ✅ Added `test-sync` action to the switch statement
- ✅ Updated error message to include test-sync option

### **2. Client Service Updates (`src/services/scrydexSyncService.js`)**
- ✅ Added `triggerTestSync()` method
- ✅ Uses `action=test-sync` parameter

### **3. UI Updates (`src/components/ScrydexSyncSettings.jsx`)**
- ✅ Added `handleTestSync()` handler
- ✅ Added green "Test Sync (10 Cards)" button
- ✅ Shows "Testing..." when in progress

### **4. Test Script (`test-sync-10-cards.js`)**
- ✅ Script to test the 10-card sync
- ✅ Verifies cards are stored in database
- ✅ Shows card details after sync

## 🚀 **How to Use**

### **Option 1: UI Button**
1. Go to Settings page
2. Click the green **"Test Sync (10 Cards)"** button
3. Wait for completion
4. Check the results

### **Option 2: Test Script**
```bash
node test-sync-10-cards.js
```

## 📊 **What the Test Sync Does**

1. **Syncs Expansions**: Gets a few expansions first
2. **Syncs 10 Cards**: Searches for Pikachu, Charizard, Blastoise
3. **Uses New Schema**: Stores data with the updated schema structure
4. **Includes All Fields**: HP as string, images as array, complete expansion objects
5. **Safe Testing**: Only 10 cards, won't overwhelm the system

## 🎯 **Expected Results**

After running the test sync, you should see:
- ✅ 10 cards stored in `pokemon_cards` table
- ✅ Cards with correct field types (HP as string, etc.)
- ✅ Complete expansion objects stored
- ✅ Images array with small, medium, large URLs
- ✅ All new fields populated (rarity_code, expansion_sort_order, etc.)

## 🔍 **Verification Steps**

1. **Run Test Sync** (button or script)
2. **Check Database**:
   ```sql
   SELECT id, name, hp, rarity_code, expansion_sort_order 
   FROM pokemon_cards 
   LIMIT 10;
   ```
3. **Verify Schema**: Check that HP is stored as string, images as array
4. **Check Expansions**: Verify expansion objects are complete

## 🚨 **Important Notes**

- **Database Schema Must Be Updated First**: Apply `update-schema-complete-api-structure.sql`
- **Edge Function Must Be Deployed**: Deploy the updated sync function
- **Environment Variables**: Ensure API credentials are set in Supabase

## 🎉 **Next Steps**

1. **Apply Database Schema** (if not done yet)
2. **Deploy Edge Function** (if not done yet)
3. **Run Test Sync** to verify everything works
4. **If successful**: Run full sync for all cards
5. **If issues**: Debug and fix before full sync

This test sync will help you verify that the database schema matches the API response structure before doing a massive sync of all cards!
