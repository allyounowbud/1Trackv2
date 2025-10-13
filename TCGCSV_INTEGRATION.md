# TCGCSV Integration Guide

## Overview

This project now integrates with [TCGCSV.com](https://tcgcsv.com/) as a complementary data source alongside Scrydex. TCGCSV provides daily-updated Pokemon TCG pricing data from TCGplayer, serving as a reliable fallback when local database or Scrydex data is unavailable.

## What is TCGCSV?

TCGCSV is a free service that provides TCGplayer trading card data in CSV and JSON formats. The data updates daily at approximately 20:00 UTC.

### Key Features
- **Daily Updates**: Fresh pricing data every day
- **Multiple Formats**: Available as CSV downloads or JSON API
- **Pokemon Support**: Category ID 3 contains all Pokemon TCG data
- **TCGplayer Market Prices**: Direct pricing from TCGplayer
- **Extended Data**: Card rarity, set numbers, and other metadata

### Limitations
- **No SKU Data**: No condition-specific pricing (NM, LP, MP, HP)
- **Daily Updates Only**: Not real-time pricing
- **TCGplayer Only**: Limited to TCGplayer's data

## Integration Architecture

### Data Flow

```
User Search Request
    ↓
1. Local Database (pokemon_cards, sealed_products, items)
    ↓ (if no results)
2. TCGCSV API Search
    ↓ (if no results)
3. Cache Check
```

### Pricing Flow

```
Price Request
    ↓
1. Database Pricing (fast)
    ↓ (if missing/stale)
2. Scrydex API (real-time)
    ↓ (if fails)
3. TCGCSV API (fallback)
    ↓
Cache & Return
```

## Services Modified

### 1. `tcgcsvService.js` (NEW)
**Location**: `src/services/tcgcsvService.js`

Main service for interacting with TCGCSV API.

**Key Methods**:
- `initialize()` - Initialize and test connection
- `getGroups()` - Get all Pokemon sets
- `getProductsByGroup(groupId)` - Get cards from a specific set
- `searchCards(query, options)` - Search for cards by name
- `getPricingByName(cardName, setName)` - Get pricing for a card
- `formatProduct(product)` - Convert TCGCSV format to our internal format

**Caching**:
- 24-hour cache (matches TCGCSV's daily update schedule)
- LRU eviction with max 100 entries
- In-memory cache for fast access

### 2. `smartPricingService.js` (UPDATED)
**Location**: `src/services/smartPricingService.js`

Added TCGCSV as third-tier pricing fallback.

**Changes**:
- Added `fetchFromTcgcsv(cardName, setName)` method
- Updated `fetchPricingData()` to try TCGCSV after Scrydex fails
- Accepts `cardName` and `setName` in options for TCGCSV lookup

**Pricing Priority**:
1. Database pricing (if fresh)
2. Scrydex API (if database is stale/missing)
3. TCGCSV API (if Scrydex fails)

### 3. `simpleSearchService.js` (UPDATED)
**Location**: `src/services/simpleSearchService.js`

Added TCGCSV fallback when database search returns no results.

**Changes**:
- Added `searchTcgcsv(query, options)` method
- Updated `searchAll()` to try TCGCSV when database is empty
- New option: `useTcgcsvFallback` (default: true)

### 4. `hybridSearchService.js` (UPDATED)
**Location**: `src/services/hybridSearchService.js`

Added TCGCSV fallback for hybrid search scenarios.

**Changes**:
- Integrated TCGCSV search when local results are empty
- Automatic fallback with proper error handling
- Returns results with `source: 'tcgcsv'` flag

## API Endpoints

### Base URL
```
https://tcgcsv.com
```

### Category Endpoint (Pokemon)
```
GET /3
```
Returns Pokemon category data including available groups (sets).

### Group Products Endpoint
```
GET /3/{groupId}
```
Returns all products (cards) for a specific group (set).

**Example**:
```
GET /3/3170  # Silver Tempest set
```

## Data Mapping

TCGCSV uses TCGplayer's data structure. Here's how we map it to our internal format:

| TCGCSV Field | Our Field | Description |
|--------------|-----------|-------------|
| `productId` | `id`, `tcgplayerId` | Unique product ID |
| `name` | `name` | Card name |
| `cleanName` | `name` | Alternative name format |
| `imageUrl` | `image_url`, `image` | Card image URL |
| `marketPrice` | `raw_market`, `marketPrice` | Current market price |
| `lowPrice` | `lowPrice` | Lowest price |
| `midPrice` | `midPrice` | Mid-range price |
| `highPrice` | `highPrice` | Highest price |
| `groupName` | `set_name`, `expansion_name` | Set/expansion name |
| `extendedData[Rarity]` | `rarity` | Card rarity |
| `extendedData[Number]` | `number` | Card number |
| `modifiedOn` | `lastUpdated` | Last update timestamp |

## Usage Examples

### Search with TCGCSV Fallback

```javascript
import simpleSearchService from './services/simpleSearchService.js';

// Search will automatically fall back to TCGCSV if database is empty
const results = await simpleSearchService.searchAll('Charizard', {
  page: 1,
  pageSize: 30,
  useTcgcsvFallback: true // default
});

if (results.source === 'tcgcsv') {
  console.log('Results from TCGCSV!');
}
```

### Get Pricing with TCGCSV Fallback

```javascript
import smartPricingService from './services/smartPricingService.js';

// Pricing will fall back to TCGCSV if Scrydex fails
const pricing = await smartPricingService.getCardPricing(
  'card-api-id',
  {
    cardName: 'Pikachu VMAX',
    setName: 'Vivid Voltage',
    fallbackToApi: true
  }
);

if (pricing.source === 'tcgcsv') {
  console.log('Pricing from TCGCSV!');
}
```

### Direct TCGCSV Service Usage

```javascript
import tcgcsvService from './services/tcgcsvService.js';

// Initialize service
await tcgcsvService.initialize();

// Search for cards
const results = await tcgcsvService.searchCards('Lugia', {
  limit: 10
});

// Get pricing by name
const pricing = await tcgcsvService.getPricingByName(
  'Lugia VSTAR',
  'Silver Tempest'
);

console.log(`Market Price: $${pricing.marketPrice}`);
```

## Benefits

### 1. **Better Data Coverage**
- Access to TCGplayer's extensive Pokemon TCG database
- Fallback ensures you always get results when available

### 2. **Improved Reliability**
- Multiple data sources reduce single-point-of-failure
- Automatic failover between services

### 3. **Market Price Reference**
- Daily-updated TCGplayer market prices
- Good for general market value assessments

### 4. **Cost Effective**
- Free API access
- Reduces load on primary APIs
- Daily caching minimizes requests

## Limitations

### 1. **No Condition Pricing**
TCGCSV doesn't provide SKU-level data, meaning:
- No Near Mint (NM) specific prices
- No Lightly Played (LP) specific prices
- No Moderately Played (MP) specific prices
- No Heavily Played (HP) specific prices

Use Scrydex for condition-specific pricing.

### 2. **Daily Updates Only**
- Prices update once per day (20:00 UTC)
- Not suitable for real-time trading scenarios
- May be stale during high volatility periods

### 3. **API Access**
- May require CORS proxy for browser-based requests
- Currently returns 403 for some requests (investigating)
- May need alternative access method (CSV files)

## Troubleshooting

### API Returns 403 Error

**Possible Causes**:
- CORS restrictions
- Rate limiting
- User-Agent requirements
- API key requirements (if any)

**Solutions**:
1. Use a backend proxy (recommended)
2. Download CSV files and parse locally
3. Contact TCGCSV for API access details

### No Results from TCGCSV

**Check**:
1. Is the service initialized? `await tcgcsvService.initialize()`
2. Is the search query specific enough?
3. Check console for error messages
4. Verify TCGCSV API is accessible

### Pricing Discrepancies

TCGCSV and Scrydex may show different prices because:
- **Update Frequency**: TCGCSV updates daily, Scrydex may be more recent
- **Data Source**: TCGCSV uses TCGplayer, Scrydex aggregates multiple sources
- **Conditions**: Scrydex includes condition-specific pricing

## Future Enhancements

### Potential Improvements
1. **CSV File Integration**: Parse daily CSV files instead of API calls
2. **Database Sync**: Periodically import TCGCSV data into local database
3. **Price History**: Track price changes over time
4. **Set Completion**: Use groups data for set tracking
5. **Sealed Products**: Integrate sealed product pricing

### Alternative Access Methods
```javascript
// Option 1: Direct CSV download
const csvUrl = 'https://tcgcsv.com/3/3170.csv';
// Parse CSV and import to database

// Option 2: GitHub mirror (if available)
const githubCsv = 'https://raw.githubusercontent.com/...';
```

## Testing

Run the integration test:
```bash
node test-tcgcsv-integration.js
```

The test verifies:
- Service imports
- API endpoint accessibility
- Data structure compatibility
- Integration points
- Fallback logic
- Caching strategy

## Resources

- **TCGCSV Website**: https://tcgcsv.com/
- **GitHub Repo**: Check TCGCSV for their infrastructure repo
- **Discord**: Join their Discord for updates and support
- **Patreon**: Support the project at their Patreon

## Support

For issues with:
- **TCGCSV Service**: Check TCGCSV's Discord or GitHub
- **Integration Code**: Review this documentation and service code
- **Data Mapping**: See the "Data Mapping" section above

---

**Last Updated**: October 12, 2025
**Version**: 1.0.0
**Status**: ✅ Active

