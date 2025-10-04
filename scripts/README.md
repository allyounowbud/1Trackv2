# Scrydex Data Import System

This directory contains scripts to import Scrydex Pokemon card data into your local Supabase database, eliminating the need for constant API calls.

## Overview

The system is designed to:
1. **Import static data** (cards, expansions) into local Supabase tables
2. **Use API only for pricing** (which changes frequently)
3. **Provide fast local queries** instead of slow API calls

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables** in your `.env` file:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Run the database setup** (if not already done):
   ```bash
   # Execute the SQL file in your Supabase dashboard
   # File: create-optimized-tables.sql
   ```

## Usage

### Initial Data Import

Import all Pokemon cards and expansions from Scrydex:

```bash
npm run import-scrydex
```

This will:
- Import all expansions from Scrydex API
- Import all cards for each expansion
- Store data in your Supabase tables
- Take several hours to complete (respecting rate limits)

### Update Pricing Data

Update pricing for all cards:

```bash
npm run update-pricing
```

Update pricing for a limited number of cards:

```bash
npm run update-pricing-limited
```

Update pricing for specific expansions:

```bash
npm run update-pricing -- --expansions sv1,sv2,sv3
```

## Scheduling

### Recommended Schedule

1. **Initial Import**: Run once to populate your database
2. **Daily Pricing Updates**: Run `npm run update-pricing` daily
3. **Weekly Full Sync**: Run `npm run import-scrydex` weekly to catch new cards/expansions

### Using Cron (Linux/Mac)

Add to your crontab:

```bash
# Daily pricing update at 2 AM
0 2 * * * cd /path/to/1Track && npm run update-pricing

# Weekly full sync on Sundays at 3 AM
0 3 * * 0 cd /path/to/1Track && npm run import-scrydex
```

### Using Task Scheduler (Windows)

1. Open Task Scheduler
2. Create Basic Task
3. Set trigger to daily/weekly as needed
4. Set action to start program: `npm`
5. Add arguments: `run update-pricing` (or `run import-scrydex`)

## Database Tables

### pokemon_cards
- Stores all Pokemon card data
- Includes pricing information
- Indexed for fast searching

### pokemon_expansions
- Stores expansion/set information
- Includes metadata like release dates

### api_cache
- Caches API responses (if needed)
- Automatically expires old entries

### image_cache
- Stores card images locally
- Reduces bandwidth usage

### pricing_cache
- Stores historical pricing data
- Enables trend analysis

## App Integration

The app has been updated to use `localDatabaseService` instead of `scrydexService` for:
- Card searches
- Expansion data
- Static card information

The API is still used for:
- Real-time pricing updates
- New data synchronization

## Monitoring

### Check Database Stats

```javascript
// In your app
import localDatabaseService from '../services/localDatabaseService';

const stats = await localDatabaseService.getDatabaseStats();
console.log(stats);
```

### Monitor Import Progress

Check the `scripts/import-progress.json` file for:
- Last import time
- Number of cards imported
- Import duration

## Troubleshooting

### Common Issues

1. **Rate Limit Errors**: The scripts include delays to respect Scrydex rate limits
2. **Memory Issues**: Large imports are processed in batches
3. **Connection Timeouts**: Scripts retry failed requests

### Logs

All scripts provide detailed console output:
- ✅ Success indicators
- ❌ Error messages
- 📊 Progress updates
- ⏳ Timing information

### Manual Recovery

If an import fails partway through:
1. Check the progress file
2. Restart the import (it will skip existing data)
3. Use the `--limit` option for pricing updates to process smaller batches

## Performance

### Expected Performance

- **Initial Import**: 50,000+ cards in 2-4 hours
- **Daily Pricing Update**: 50,000+ cards in 30-60 minutes
- **Local Queries**: Sub-second response times
- **API Calls**: Reduced by 95%+

### Optimization Tips

1. **Batch Size**: Adjust `BATCH_SIZE` in scripts if needed
2. **Delays**: Adjust `DELAY_BETWEEN_BATCHES` for rate limits
3. **Indexing**: Database indexes are optimized for common queries
4. **Caching**: Local database service includes query caching

## Security

- All data is stored in your own Supabase instance
- No sensitive API keys are exposed to clients
- Row Level Security (RLS) is enabled on all tables
- Public read access for card data, restricted write access

## Support

For issues or questions:
1. Check the console logs for detailed error messages
2. Verify your Supabase connection and permissions
3. Ensure your Scrydex API proxy is working correctly
4. Check the import progress file for partial completion status

