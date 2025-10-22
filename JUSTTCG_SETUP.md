# JustTCG Integration Setup Guide

## Overview

This guide will help you integrate JustTCG API into your 1Track application to import Pokemon cards with pricing data while respecting the free tier limitations.

## Prerequisites

- JustTCG API key (free tier)
- Node.js environment
- Supabase database access

## Setup Steps

### 1. Get JustTCG API Key

1. Visit [JustTCG Dashboard](https://justtcg.com/dashboard)
2. Sign up for a free account
3. Generate an API key from the dashboard
4. Note your rate limits:
   - **Monthly**: 1,000 requests
   - **Daily**: 100 requests  
   - **Per Request**: 20 cards maximum

### 2. Environment Variables

Add your JustTCG API key to your environment variables:

```bash
# Add to your .env file
VITE_JUSTTCG_API_KEY=your_api_key_here
```

### 3. Database Setup

Run the database migration to create the JustTCG tables:

```bash
# Apply the database schema
psql -h your-db-host -U your-username -d your-database -f create-justtcg-cards-table.sql
```

### 4. Install Dependencies

The JustTCG SDK is already installed, but you can verify:

```bash
npm list justtcg-js
```

## Usage

### Import All Pokemon Cards

This will import all Pokemon cards from JustTCG, respecting rate limits:

```bash
node import-justtcg-cards.js import
```

**Important**: This process will take multiple days due to rate limits:
- 100 requests per day = ~2,000 cards per day
- With ~50,000+ Pokemon cards total, this will take 25+ days

### Sync Pricing Only

For ongoing price updates (uses fewer requests):

```bash
node import-justtcg-cards.js sync
```

## Rate Limit Management

The import script automatically:

- ✅ Tracks daily and monthly request usage
- ✅ Stops when daily quota is reached
- ✅ Resumes the next day automatically
- ✅ Shows progress and remaining quota
- ✅ Handles rate limit errors gracefully

## Database Schema

### `justtcg_cards` Table

Stores Pokemon cards with JustTCG pricing:

```sql
- id: Unique identifier (justtcg-{card_id})
- name: Card name
- set_name: Set/expansion name
- set_code: Set code
- card_number: Card number in set
- rarity: Card rarity
- language: Card language (en, ja, etc.)
- justtcg_market_price: Market price from JustTCG
- justtcg_low_price: Low price
- justtcg_mid_price: Mid price
- justtcg_high_price: High price
- justtcg_foil_price: Foil version price
- justtcg_normal_price: Normal version price
- raw_api_data: Complete API response (JSONB)
- last_synced_at: Last price update timestamp
```

### `justtcg_sync_status` Table

Tracks API usage and sync status:

```sql
- api_requests_used: Total requests used this month
- api_requests_remaining: Requests remaining this month
- daily_requests_used: Requests used today
- daily_requests_remaining: Requests remaining today
- last_full_sync: Last complete import timestamp
- last_price_sync: Last pricing update timestamp
```

## Integration with Existing System

The JustTCG cards are stored separately from your existing `pokemon_cards` table to:

1. **Avoid conflicts** with TCGCSV/Scrydex data
2. **Enable comparison** between different pricing sources
3. **Allow selective usage** in your application
4. **Maintain data integrity** of existing imports

## Monitoring Progress

Check import progress:

```sql
-- Check total cards imported
SELECT COUNT(*) FROM justtcg_cards;

-- Check API usage
SELECT * FROM justtcg_sync_status;

-- Check recent imports
SELECT name, set_name, justtcg_market_price, last_synced_at 
FROM justtcg_cards 
ORDER BY last_synced_at DESC 
LIMIT 10;
```

## Troubleshooting

### Common Issues

1. **Rate Limit Exceeded**
   - Wait until the next day (daily limit resets at midnight UTC)
   - Check your usage: `SELECT * FROM justtcg_sync_status;`

2. **API Key Invalid**
   - Verify your API key in the JustTCG dashboard
   - Check environment variable: `echo $VITE_JUSTTCG_API_KEY`

3. **Database Connection Issues**
   - Verify Supabase credentials
   - Check database permissions

### Error Recovery

If the import stops due to errors:

1. Check the error logs
2. Fix any configuration issues
3. Resume with: `node import-justtcg-cards.js import`

The script will continue from where it left off.

## Next Steps

After initial import:

1. **Set up automated pricing sync** (daily/weekly)
2. **Integrate with your search system** to use JustTCG data
3. **Compare pricing** between JustTCG, TCGCSV, and Scrydex
4. **Consider upgrading** to a paid JustTCG plan for higher limits

## Support

- JustTCG Documentation: https://justtcg.com/docs
- JustTCG Support: https://justtcg.com/support
- Rate Limits: https://justtcg.com/docs/rate-limits


