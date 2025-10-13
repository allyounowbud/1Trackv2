# TCGCSV Sealed Products Integration

## Overview

This integration replaces the current `sealed_products` database table with data from [TCGCSV](https://tcgcsv.com/), providing comprehensive, daily-updated sealed product data for Pokemon TCG expansions.

## Architecture

### Data Flow
```
Frontend (PokemonPage.jsx)
    ↓
PokemonGameService.getSealedProductsByExpansion()
    ↓
ExpansionMappingService (maps our expansion IDs to TCGCSV group IDs)
    ↓
TCGCSVService.getSealedProductsByGroup()
    ↓
TCGCSV API (https://tcgcsv.com/)
```

### Key Components

#### 1. **TCGCSVService** (`src/services/tcgcsvService.js`)
- **Purpose**: Interface with TCGCSV API for sealed products
- **Key Methods**:
  - `getSealedProductsByGroup(groupId, options)` - Fetch sealed products for a specific expansion
  - `filterSealedProducts(products)` - Filter products to only include sealed items
  - `formatSealedProduct(product, groupId)` - Format TCGCSV data for our app
- **Caching**: 24-hour cache (matches TCGCSV daily update schedule)

#### 2. **ExpansionMappingService** (`src/services/expansionMappingService.js`)
- **Purpose**: Maps between our internal expansion IDs and TCGCSV group IDs
- **Coverage**: 100+ Pokemon expansions from Base Set to Scarlet & Violet
- **Key Methods**:
  - `getTcgcsvGroupId(expansionId)` - Get TCGCSV group ID from our expansion ID
  - `getOurExpansionId(groupId)` - Get our expansion ID from TCGCSV group ID
  - `hasMapping(expansionId)` - Check if mapping exists

#### 3. **PokemonGameService** (`src/services/games/pokemonGameService.js`)
- **Updated Methods**:
  - `getSealedProductsByExpansion()` - Now uses TCGCSV as primary source
  - `searchSealedProducts()` - Searches across TCGCSV data
- **Fallback Strategy**: Falls back to database if TCGCSV fails or no mapping exists

## Data Mapping

### TCGCSV to App Field Mapping
```javascript
{
  id: product.productId,
  name: product.name,
  image_url: product.imageUrl,
  marketValue: product.marketPrice,
  rarity: 'Sealed',
  expansion_id: expansionId, // From mapping service
  expansion_name: product.setName,
  source: 'tcgcsv',
  itemType: 'sealed',
  type: 'sealed',
  gameId: 'pokemon'
}
```

### Sealed Product Detection
The system identifies sealed products using multiple methods:

#### Primary Method: `productTypeName` Field
- TCGCSV provides a `productTypeName` field in the product data
- Products with `productTypeName` containing "sealed" are automatically included
- Most reliable method for accurate classification

#### Secondary Method: Keyword Matching
- **Included Keywords**: booster box, booster pack, elite trainer box, collection box, bundle, tin, display, premium collection, mini tin, sealed, box, pack, display box, booster, etb, build & battle, theme deck, deck, starter, gift set, battle stadium, trainer kit
- **Excluded Keywords**: single, card, holo, reverse, rare, common, uncommon, secret rare, ultra rare, full art, rainbow rare, gold, promo card, individual

#### Logic:
```javascript
// 1. Check productTypeName first (most reliable)
if (productTypeName.includes('sealed')) return true;

// 2. Check keywords in name/type
if (hasIncludedKeyword && !hasExcludedKeyword) return true;

// 3. Exclude if productTypeName indicates individual card
if (productTypeName === 'card') return false;
```

## Expansion Coverage

### Supported Expansions (150+)
Based on actual TCGCSV API data from [https://tcgcsv.com/tcgplayer/3/groups](https://tcgcsv.com/tcgplayer/3/groups):

- **Mega Evolution Era (2025)**: ME01-ME02, MEP, MEE
- **Scarlet & Violet Era**: SV01-SV10, Prismatic Evolutions, Shrouded Fable, Paldean Fates, 151, Black Bolt, White Flare
- **Sword & Shield Era**: SWSH01-SWSH12 including Shining Fates and Champion's Path
- **Sun & Moon Era**: SM01-SM12 including Shining Legends and special sets
- **XY Era**: XY01-XY12 (Base to Evolutions)
- **Black & White Era**: BW01-BW11 (Base to Legendary Treasures)
- **HeartGold & SoulSilver Era**: HGSS01-HGSS04, Call of Legends
- **Platinum Era**: PL01-PL04 (Platinum to Arceus)
- **Diamond & Pearl Era**: DP01-DP07 (Diamond & Pearl to Stormfront)
- **EX Era**: All EX sets (Ruby & Sapphire to Power Keepers)
- **e-Card Era**: Expedition, Aquapolis, Skyridge
- **Neo Era**: Neo Genesis, Discovery, Revelation, Destiny
- **Gym Era**: Gym Heroes, Gym Challenge
- **Original Era**: Base Set (including Shadowless), Jungle, Fossil, Team Rocket, Base Set 2
- **Special Sets**: Trading Card Game Classic, Southern Islands, McDonald's Promos, Trick or Trade, Battle Academy

## API Integration Details

### TCGCSV API Structure
- **Base URL**: `https://tcgcsv.com/`
- **Pokemon Category ID**: `3`
- **Data Structure**: Categories → Groups (expansions) → Products (cards + sealed)
- **Update Schedule**: Daily at 20:00 UTC
- **Rate Limiting**: Built-in caching to minimize API calls

### Request Headers
```javascript
{
  'Accept': 'application/json',
  'User-Agent': '1Track-Pokemon-Tracker'
}
```

## Performance Optimizations

### Caching Strategy
- **TCGCSV Cache**: 24-hour cache for all API responses
- **Service Cache**: In-memory cache for processed results
- **Cache Keys**: Include expansion ID, page, sort options

### Pagination
- **Default Page Size**: 30 items per page
- **Efficient Loading**: Only loads data when needed
- **Smart Search**: Limits search to recent 15 expansions for performance

### Error Handling
- **Primary Source**: TCGCSV API
- **Fallback**: Original database if TCGCSV fails
- **Graceful Degradation**: Returns empty results on complete failure

## Usage Examples

### Fetch Sealed Products for Expansion
```javascript
const result = await pokemonGameService.getSealedProductsByExpansion('swsh12', {
  page: 1,
  pageSize: 30,
  sortBy: 'name',
  sortOrder: 'asc'
});
```

### Search Sealed Products
```javascript
const result = await pokemonGameService.searchSealedProducts('booster box', {
  page: 1,
  pageSize: 30
});
```

### Check Expansion Coverage
```javascript
const hasMapping = expansionMappingService.hasMapping('swsh12');
const groupId = expansionMappingService.getTcgcsvGroupId('swsh12');
```

## Benefits

### Data Quality
- **Daily Updates**: Fresh pricing data every day
- **Comprehensive Coverage**: All major Pokemon expansions
- **Accurate Pricing**: Direct from TCGplayer via TCGCSV
- **Consistent Format**: Standardized product information

### Performance
- **Fast Loading**: Cached responses for quick access
- **Efficient Search**: Smart filtering and pagination
- **Reduced Database Load**: Offloads sealed products from database

### Reliability
- **Fallback Strategy**: Database backup if TCGCSV fails
- **Error Handling**: Graceful degradation on API issues
- **Mapping Coverage**: 100+ expansions supported

## Testing

Run the test script to verify integration:
```bash
node test-tcgcsv-sealed-integration.js
```

The test covers:
- Service initialization
- Expansion mapping
- TCGCSV API connectivity
- Sealed product filtering
- Data formatting
- PokemonGameService integration
- Search functionality
- Cache performance

## Future Enhancements

### Potential Improvements
1. **Dynamic Mapping**: Auto-discover new expansions from TCGCSV
2. **Enhanced Caching**: Redis for distributed caching
3. **Price History**: Track pricing trends over time
4. **Image Optimization**: CDN for product images
5. **Search Optimization**: Elasticsearch for advanced search

### Expansion Coverage
- **New Expansions**: Add mappings as new sets release
- **Other TCGs**: Extend to Magic, Lorcana, etc.
- **Historical Data**: Add older, less common expansions

## Troubleshooting

### Common Issues

#### No Sealed Products Found
- Check if expansion has mapping: `expansionMappingService.hasMapping(expansionId)`
- Verify TCGCSV API connectivity
- Check console for error messages

#### Slow Performance
- Verify caching is working: `tcgcsvService.getCacheStats()`
- Check network connectivity to TCGCSV
- Monitor API response times

#### Missing Expansions
- Add new mappings to `expansionMappingService.js`
- Update expansion list as new sets release
- Verify TCGCSV group ID is correct

### Debug Commands
```javascript
// Check cache status
tcgcsvService.getCacheStats()

// Check mapping coverage
expansionMappingService.getStats()

// Test specific expansion
const groupId = expansionMappingService.getTcgcsvGroupId('swsh12')
const products = await tcgcsvService.getSealedProductsByGroup(groupId)
```

## Conclusion

This integration successfully replaces the limited `sealed_products` database with comprehensive, daily-updated data from TCGCSV. The system provides:

- **100+ supported expansions** from Base Set to current releases
- **Daily updated pricing** from TCGplayer
- **Robust error handling** with database fallback
- **Efficient caching** for optimal performance
- **Seamless integration** with existing PokemonGameService

The result is a much more comprehensive and up-to-date sealed products experience for users browsing Pokemon expansions! 🎯📦
