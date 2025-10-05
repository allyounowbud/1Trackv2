# 🚀 Sync Scrydex Data to Supabase - Setup Guide

## ✅ **Step 1: Clean Search Pages (COMPLETED)**

I've cleaned up both search pages by removing:
- ❌ API test components
- ❌ Usage statistics displays  
- ❌ Development mode warnings
- ❌ API setup modals
- ❌ All debugging UI elements

Now you have clean, basic search functionality.

## 🔧 **Step 2: Set Up Environment Variables**

You need to set up your environment variables for the sync script to work:

### Option A: Create `.env.local` file (Recommended)
Create a file called `.env.local` in your project root with:

```env
VITE_SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### Option B: Set Environment Variables
Or set them in your terminal:
```bash
export VITE_SUPABASE_URL="your_supabase_url_here"
export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key_here"
```

## 📊 **Step 3: Create Supabase Tables**

First, make sure your Supabase tables exist:

```bash
npm run setup-scrydex
```

This will create the required tables:
- `pokemon_expansions`
- `pokemon_cards` 
- `sync_status`

## 🔄 **Step 4: Sync API Data**

Now run the sync script to populate your tables with Scrydex data:

```bash
npm run sync-scrydex
```

This will:
1. ✅ Fetch expansions from Scrydex API
2. ✅ Store them in `pokemon_expansions` table
3. ✅ Fetch cards for each expansion
4. ✅ Store them in `pokemon_cards` table
5. ✅ Update sync status

## 🎯 **Step 5: Test Basic Search**

Once the sync is complete:

1. **Reload your app** at `http://localhost:5173/search`
2. **Try searching** for a Pokemon card (e.g., "charizard")
3. **Check the console** - you should see local database queries instead of API calls

## 📋 **What You'll See**

### ✅ Success Indicators:
- Console shows: `🗄️ Searching local pokemon_cards table: charizard`
- Fast search results (no API delays)
- Cards load from your Supabase database

### 📊 Expected Console Output:
```
🚀 Starting Scrydex data sync...
🔍 Checking if tables exist...
✅ Table pokemon_expansions exists
✅ Table pokemon_cards exists
✅ Table sync_status exists

🔄 Syncing expansions...
📦 Found 100 expansions
✅ Synced 100 expansions to Supabase

🔄 Syncing cards...
📦 Syncing cards for 10 expansions
🔍 Fetching cards for expansion: Base Set (base1)
📦 Found 102 cards for Base Set
✅ Synced 102 cards for Base Set
...
✅ Total cards synced: 1,250

🎉 Data sync completed successfully!
```

## 🐛 **Troubleshooting**

### Tables don't exist?
```bash
npm run setup-scrydex
```

### Environment variables missing?
Check your `.env.local` file or set them manually.

### API rate limiting?
The script includes delays to avoid rate limits. If you hit limits, wait a few minutes and try again.

### Need to reset data?
```bash
# Clear tables and re-sync
npm run setup-scrydex
npm run sync-scrydex
```

## 🎉 **Result**

After completing these steps:
- ✅ Clean search interface (no test components)
- ✅ Local data in Supabase tables
- ✅ Fast search from local database
- ✅ No more API dependency for basic search

Your search will now work instantly with local data! 🚀


