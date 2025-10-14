# Database Recovery Guide

## Overview
This guide will help you restore your 1Track application after the database was accidentally reset.

## Step 1: Recreate Essential Tables

Run the following SQL in your Supabase SQL Editor:

```sql
-- Run this file: recreate-essential-tables.sql
```

This will create:
- `items` table (for custom items)
- `orders` table (with API card fields)
- `pokemon_cards` table (for TCGCSV data)
- `pokemon_expansions` table
- `sync_status` table
- All necessary indexes and views
- Row Level Security policies

## Step 2: Install Dependencies

```bash
npm install
```

This will install the `csv-parser` dependency needed for TCGCSV import.

## Step 3: Import TCGCSV Data

### Option A: Using Node.js Script (Recommended)

1. Get your TCGCSV Pokemon data file
2. Run the import script:

```bash
npm run import-tcgcsv <path-to-your-tcgcsv-file.csv>
```

### Option B: Manual SQL Import

1. Convert your TCGCSV data to the expected format
2. Run the SQL in `import-tcgcsv-pokemon.sql`

## Step 4: Verify Installation

1. Go to your Supabase dashboard
2. Check that all tables exist and have data
3. Test your application:
   - Collection page should load
   - Pokemon page should show cards
   - Custom items should work
   - Orders should work

## Expected TCGCSV Format

Your CSV file should have these columns:
- `id` - Unique card identifier
- `name` - Card name
- `supertype` - Usually "Pokémon"
- `types` - Comma-separated types (e.g., "Fire,Psychic")
- `subtypes` - Comma-separated subtypes (e.g., "Stage 2,EX")
- `hp` - Hit points (integer)
- `number` - Card number in set
- `rarity` - Card rarity
- `set_id` - Expansion/set identifier
- `set_name` - Expansion/set name
- `set_series` - Series name
- `image_url` - Card image URL
- `artist` - Card artist
- `market_price`, `low_price`, `mid_price`, `high_price` - Pricing data

## Troubleshooting

### If the import fails:
1. Check your CSV format matches the expected columns
2. Ensure your Supabase connection is working
3. Check the console for error messages

### If the app doesn't work:
1. Verify all tables exist in Supabase
2. Check that RLS policies are enabled
3. Ensure your user has proper permissions

## Next Steps

After basic functionality is restored:
1. Re-sync with Scrydex API for more comprehensive data
2. Import additional card sets as needed
3. Test all app functionality thoroughly

## Files Created

- `recreate-essential-tables.sql` - Creates all necessary tables and views
- `import-tcgcsv-pokemon.sql` - SQL template for manual import
- `import-tcgcsv-data.js` - Node.js script for automated import
- `update-orders-schema.sql` - Schema updates for orders table

## Support

If you encounter issues:
1. Check the console for error messages
2. Verify your Supabase project settings
3. Ensure all environment variables are set correctly
