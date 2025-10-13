# TCGCSV API Reference

## Base Information
- **Base URL**: `https://tcgcsv.com/`
- **Pokemon Category ID**: `3`
- **Update Schedule**: Daily at 20:00 UTC
- **Authentication**: None required
- **Rate Limiting**: Respect daily update schedule, use caching

## API Endpoints

### 1. Get All Groups (Expansions)
**Endpoint**: `GET https://tcgcsv.com/tcgplayer/3/groups`

**Response Structure**:
```json
{
  "totalItems": 210,
  "success": true,
  "errors": [],
  "results": [
    {
      "groupId": 24380,
      "name": "ME01: Mega Evolution",
      "abbreviation": "MEG",
      "isSupplemental": false,
      "publishedOn": "2025-09-26T00:00:00",
      "modifiedOn": "2025-10-09T19:47:56.96",
      "categoryId": 3
    }
  ]
}
```

**Key Fields**:
- `groupId`: Unique identifier for the expansion
- `name`: Full expansion name
- `abbreviation`: Short code for the expansion
- `isSupplemental`: Whether it's a supplemental product
- `publishedOn`: Release date
- `categoryId`: Category (3 = Pokemon)

---

### 2. Get Products for a Group
**Endpoint**: `GET https://tcgcsv.com/tcgplayer/3/{groupId}/products`

**Example**: `https://tcgcsv.com/tcgplayer/3/24380/products`

**Response Structure**:
```json
{
  "totalItems": 150,
  "success": true,
  "errors": [],
  "results": [
    {
      "productId": 123456,
      "name": "Booster Box",
      "cleanName": "Booster Box",
      "imageUrl": "https://...",
      "categoryId": 3,
      "groupId": 24380,
      "url": "https://...",
      "modifiedOn": "2025-10-10T12:00:00",
      "productTypeName": "Sealed Product",
      "extendedData": [
        {
          "name": "Number",
          "value": "123"
        }
      ]
    }
  ]
}
```

**Key Fields**:
- `productId`: Unique product identifier
- `name`: Product name
- `imageUrl`: Product image URL
- `productTypeName`: Product type (e.g., "Sealed Product", "Cards")
- `extendedData`: Additional product metadata

---

### 3. Get Prices for a Group
**Endpoint**: `GET https://tcgcsv.com/tcgplayer/3/{groupId}/prices`

**Example**: `https://tcgcsv.com/tcgplayer/3/24380/prices`

**Response Structure**:
```json
{
  "totalItems": 150,
  "success": true,
  "errors": [],
  "results": [
    {
      "productId": 123456,
      "lowPrice": 89.99,
      "midPrice": 99.99,
      "highPrice": 109.99,
      "marketPrice": 95.99,
      "directLowPrice": null,
      "subTypeName": "Normal"
    }
  ]
}
```

**Key Fields**:
- `productId`: Links to product data
- `lowPrice`: Lowest market price
- `midPrice`: Middle market price
- `highPrice`: Highest market price
- `marketPrice`: Current market value
- `subTypeName`: Condition/variant (Normal, Foil, etc.)

---

## Integration Strategy

### Step 1: Fetch Groups
```javascript
const response = await fetch('https://tcgcsv.com/tcgplayer/3/groups');
const data = await response.json();
const groups = data.results;
```

### Step 2: Get Products for a Group
```javascript
const groupId = 24380; // ME01: Mega Evolution
const response = await fetch(`https://tcgcsv.com/tcgplayer/3/${groupId}/products`);
const data = await response.json();
const products = data.results;
```

### Step 3: Filter for Sealed Products
```javascript
const sealedProducts = products.filter(product => {
  // Primary: Check productTypeName
  if (product.productTypeName?.toLowerCase().includes('sealed')) {
    return true;
  }
  
  // Secondary: Check product name
  const name = product.name?.toLowerCase() || '';
  const sealedKeywords = ['booster box', 'elite trainer box', 'tin', 'bundle'];
  return sealedKeywords.some(keyword => name.includes(keyword));
});
```

### Step 4: Get Prices
```javascript
const response = await fetch(`https://tcgcsv.com/tcgplayer/3/${groupId}/prices`);
const data = await response.json();
const prices = data.results;

// Match prices to products by productId
const productsWithPrices = sealedProducts.map(product => {
  const pricing = prices.find(p => p.productId === product.productId);
  return {
    ...product,
    marketPrice: pricing?.marketPrice || 0,
    lowPrice: pricing?.lowPrice || 0,
    highPrice: pricing?.highPrice || 0
  };
});
```

---

## Best Practices

### Caching
- **Cache Duration**: 24 hours (matches TCGCSV update schedule)
- **Cache Key Format**: `tcgcsv_{type}_{id}_{options}`
- **Invalidation**: Clear cache daily after 20:00 UTC

### Rate Limiting
- Use in-memory cache to minimize API calls
- Batch requests for multiple expansions
- Avoid requesting same data multiple times per session

### Error Handling
```javascript
try {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  const data = await response.json();
  return data.results;
} catch (error) {
  console.error('TCGCSV API error:', error);
  // Fallback to database or cached data
  return fallbackData;
}
```

### Headers
```javascript
const headers = {
  'Accept': 'application/json',
  'User-Agent': '1Track-Pokemon-Tracker'
};
```

---

## Common Group IDs

### Recent Expansions
| Expansion | Group ID | Abbreviation |
|-----------|----------|--------------|
| ME01: Mega Evolution | 24380 | MEG |
| SV10: Destined Rivals | 24269 | DRI |
| SV09: Journey Together | 24073 | JTG |
| SV08: Surging Sparks | 23651 | SSP |
| SV07: Stellar Crown | 23537 | SCR |
| SV06: Twilight Masquerade | 23473 | TWM |
| SV05: Temporal Forces | 23381 | TEF |
| SV04: Paradox Rift | 23286 | PAR |
| Prismatic Evolutions | 23821 | PRE |
| Scarlet & Violet 151 | 23237 | MEW |

### Classic Sets
| Expansion | Group ID | Abbreviation |
|-----------|----------|--------------|
| Base Set | 604 | BS |
| Jungle | 635 | JU |
| Fossil | 630 | FO |
| Base Set 2 | 605 | BS2 |
| Team Rocket | 1373 | TR |
| Gym Heroes | 1441 | G1 |
| Gym Challenge | 1440 | G2 |
| Neo Genesis | 1396 | N1 |

---

## Product Type Classification

### Sealed Product Types
- `Sealed Product` - Booster boxes, ETBs, bundles
- `Sealed Box` - Booster boxes specifically
- `Sealed Pack` - Individual booster packs
- `Theme Deck` - Pre-constructed decks
- `Starter Deck` - Beginner decks
- `Collection Box` - Special collection products
- `Tin` - Collector tins

### Card Types (Exclude for Sealed)
- `Cards` - Individual cards
- `Single Card` - Single card products
- `Promo Card` - Promotional cards

---

## Data Quality Notes

### Strengths
- ✅ Daily updates from TCGplayer
- ✅ Comprehensive product catalog
- ✅ Accurate pricing data
- ✅ Structured JSON responses
- ✅ No authentication required
- ✅ Historical data available

### Considerations
- ⚠️ Data updates once per day (20:00 UTC)
- ⚠️ Some older sets may have incomplete data
- ⚠️ Product images may not always be available
- ⚠️ Prices are US market only (USD)

---

## Resources

- **TCGCSV Website**: https://tcgcsv.com/
- **FAQ**: https://tcgcsv.com/faq
- **GitHub**: View source and infrastructure
- **Discord**: Community support and updates

## Example Full Workflow

```javascript
// 1. Initialize service
await tcgcsvService.initialize();

// 2. Get expansion mapping
const groupId = expansionMappingService.getTcgcsvGroupId('sv08');
// Returns: 23651 (Surging Sparks)

// 3. Fetch sealed products
const result = await tcgcsvService.getSealedProductsByGroup(groupId, {
  page: 1,
  pageSize: 30,
  sortBy: 'name',
  sortOrder: 'asc'
});

// 4. Display products
result.data.forEach(product => {
  console.log(`${product.name} - $${product.marketValue}`);
});
```

This integration provides comprehensive, up-to-date sealed product data for your Pokemon TCG application! 🎯
