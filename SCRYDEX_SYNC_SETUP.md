# Scrydex Data Synchronization Setup

This guide will help you set up the Scrydex API data synchronization system that syncs data to Supabase tables for instant loading.

## 🎯 What This Does

Instead of making direct API calls every time, the system:
1. **Syncs Scrydex data to Supabase tables** in the background
2. **Loads data instantly** from local tables
3. **Automatically syncs** when data is stale
4. **Falls back to API** if local data is unavailable

## 📋 Prerequisites

- ✅ Supabase project set up
- ✅ Scrydex API key and team ID configured
- ✅ Environment variables set up

## 🚀 Quick Setup

### 1. Set Environment Variables

Make sure you have these environment variables set:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Scrydex API (set in Supabase secrets)
SCRYDEX_API_KEY=your-scrydex-api-key
SCRYDEX_TEAM_ID=onetracking
```

### 2. Create Supabase Tables

Run the setup script to create the necessary tables:

```bash
npm run setup-scrydex
```

This will create:
- `pokemon_expansions` - Stores Pokemon expansion data
- `pokemon_cards` - Stores Pokemon card data  
- `sync_status` - Tracks sync status and timestamps

### 3. Start Development Server

```bash
npm run dev
```

### 4. Test the System

1. Navigate to the Search page
2. You'll see an "API Connection Test" component at the top
3. Click **"Test API Connection"** to verify everything works
4. Click **"Force Sync"** to populate the tables with data

## 🔧 How It Works

### Data Flow

```
Scrydex API → Supabase Tables → Web App
     ↑              ↓
Background Sync ← Local Data
```

### Sync Process

1. **Initial Load**: App checks local tables first
2. **Background Sync**: If data is stale, syncs in background
3. **API Fallback**: If no local data, falls back to API
4. **Periodic Sync**: Automatically syncs every hour

### Tables Structure

#### `pokemon_expansions`
- Stores expansion metadata (name, series, release date, etc.)
- Synced every 7 days

#### `pokemon_cards`  
- Stores card data (name, types, attacks, prices, etc.)
- Synced every 24 hours

#### `sync_status`
- Tracks when each table was last synced
- Used to determine if sync is needed

## 🧪 Testing

### API Test Component

The test component will show:
- ✅ **Green**: Successful operations
- ❌ **Red**: Failed operations with error details
- ⚠️ **Yellow**: Warnings (like missing environment variables)

### Manual Testing

1. **Test API Connection**: Verifies all services work
2. **Force Sync**: Manually triggers data synchronization
3. **Search Test**: Try searching for cards to test local data

## 🔍 Troubleshooting

### Common Issues

#### "Missing environment variables"
- Check that all required environment variables are set
- Verify Supabase URL and keys are correct

#### "Failed to create tables"
- Ensure you have the service role key
- Check Supabase project permissions
- Try running the SQL manually in Supabase SQL Editor

#### "API calls failing"
- Verify Scrydex API key and team ID are correct
- Check that the Supabase function is deployed
- Look at browser console for detailed error messages

#### "No data after sync"
- Check if the sync actually completed
- Verify the Supabase function has the correct API credentials
- Look at the sync service logs in browser console

### Debug Steps

1. **Check Environment Variables**:
   ```javascript
   console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
   console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY);
   ```

2. **Check Supabase Tables**:
   - Go to Supabase Dashboard → Table Editor
   - Verify tables exist and have data

3. **Check Sync Status**:
   - Look at the `sync_status` table
   - Verify timestamps are recent

4. **Check Browser Console**:
   - Look for error messages
   - Check network requests in DevTools

## 📊 Performance Benefits

### Before (Direct API Calls)
- ⏱️ 2-5 seconds per search
- 🔄 API rate limits
- 📡 Network dependency
- 💰 API costs per request

### After (Local Data)
- ⚡ <100ms per search
- 🚫 No rate limits
- 💾 Offline capable
- 💰 Reduced API costs

## 🔄 Sync Configuration

### Sync Intervals
- **Cards**: Every 24 hours
- **Expansions**: Every 7 days
- **Status Check**: Every hour

### Batch Sizes
- **Cards**: 100 per batch
- **Expansions**: 50 per batch
- **Rate Limiting**: 100ms between requests

## 🛠️ Advanced Configuration

### Custom Sync Intervals

Edit `src/services/scrydexSyncService.js`:

```javascript
this.config = {
  cardsSyncInterval: 12 * 60 * 60 * 1000, // 12 hours
  expansionsSyncInterval: 3 * 24 * 60 * 60 * 1000, // 3 days
  // ...
};
```

### Manual Sync Triggers

```javascript
import scrydexSyncService from '../services/scrydexSyncService';

// Force immediate sync
await scrydexSyncService.forceSync();

// Check sync status
const status = await scrydexSyncService.getSyncStatus();
console.log('Sync status:', status);
```

## 📈 Monitoring

### Sync Status
- Check `sync_status` table for last sync times
- Monitor browser console for sync logs
- Use the API test component for real-time status

### Performance Metrics
- Search response times
- API call frequency
- Data freshness

## 🎉 Success Indicators

You'll know the system is working when:
- ✅ API test shows all green checkmarks
- ✅ Search results load instantly
- ✅ `pokemon_expansions` and `pokemon_cards` tables have data
- ✅ `sync_status` shows recent timestamps
- ✅ No API rate limit errors

## 🆘 Getting Help

If you encounter issues:
1. Check the browser console for error messages
2. Verify all environment variables are set
3. Test the API connection using the test component
4. Check Supabase table data and permissions
5. Review the sync service logs

The system is designed to be robust with multiple fallbacks, so even if sync fails, the app will still work using direct API calls.


