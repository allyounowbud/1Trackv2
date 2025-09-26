# OneTrack API Architecture

## Overview

OneTrack now uses a centralized backend API service that acts as a data layer between the frontend and external APIs. This architecture ensures:

- **Consistent Data**: All users see the same data instantly
- **Better Performance**: Cached responses reduce API calls
- **Rate Limiting**: Centralized control over external API usage
- **Cost Efficiency**: Reduced API quota consumption
- **Reliability**: Fallback strategies and error handling

## Architecture Diagram

```
Frontend (React App)
    ↓
Internal API Service (internalApiService.js)
    ↓
Supabase Edge Functions (api-proxy)
    ↓
External APIs (TCG Go, PriceCharting)
    ↓
Database Cache (Supabase)
```

## Components

### 1. Frontend Services

#### `internalApiService.js`
- **Purpose**: Frontend service that communicates with our backend API
- **Features**: 
  - Client-side caching (5 minutes)
  - Error handling
  - Consistent API interface
- **Endpoints**:
  - `searchCards(query, limit)`
  - `searchProducts(query, limit)`
  - `getExpansionData(expansionId)`
  - `getMarketData(productName)`

#### Updated `smartSearchService.js`
- **Changes**: Now uses `internalApiService` instead of direct external API calls
- **Benefits**: Consistent data, better caching, reduced API spam

### 2. Backend Services

#### API Proxy (`supabase/functions/api-proxy/index.ts`)
- **Purpose**: Centralized API gateway for all external API calls
- **Features**:
  - Rate limiting (100 req/min for TCG Go, 50 req/min for PriceCharting)
  - Multi-level caching (in-memory + database)
  - Error handling and fallbacks
  - Data persistence in Supabase

#### Background Sync (`supabase/functions/background-sync/index.ts`)
- **Purpose**: Keeps cached data fresh by periodically updating from external APIs
- **Features**:
  - Syncs popular search terms
  - Updates market data
  - Cleans up old cache entries
  - Can be triggered manually or via cron

### 3. Database Schema

#### Cache Tables
- `api_cache`: General API response cache
- `cached_cards`: Cached card search results
- `cached_products`: Cached product search results
- `cached_expansions`: Cached expansion data
- `cached_market_data`: Cached market pricing data

#### Features
- Automatic cleanup of old entries (7+ days)
- Indexed for fast lookups
- Row Level Security (RLS) enabled
- Service role access for backend functions

## API Endpoints

### Internal API Endpoints

```
GET /functions/v1/api-proxy/search/cards?q=query&limit=20
GET /functions/v1/api-proxy/search/products?q=query&limit=20
GET /functions/v1/api-proxy/expansion?id=expansion_id
GET /functions/v1/api-proxy/market-data?product=product_name
```

### Background Sync Endpoints

```
POST /functions/v1/background-sync?action=full
POST /functions/v1/background-sync?action=popular-searches
POST /functions/v1/background-sync?action=market-data
POST /functions/v1/background-sync?action=cleanup
```

## Deployment

### Prerequisites
1. Supabase CLI installed: `npm install -g supabase`
2. Logged in to Supabase: `supabase login`
3. API keys configured as secrets

### Deploy Commands

#### Windows
```bash
scripts/deploy-api-services.bat
```

#### Linux/Mac
```bash
chmod +x scripts/deploy-api-services.sh
./scripts/deploy-api-services.sh
```

### Manual Deployment
```bash
# Deploy functions
supabase functions deploy api-proxy
supabase functions deploy background-sync

# Run migrations
supabase db push

# Set secrets
supabase secrets set RAPIDAPI_KEY=your_key_here
supabase secrets set PRICECHARTING_API_KEY=your_key_here
```

## Configuration

### Environment Variables (Supabase Secrets)
- `RAPIDAPI_KEY`: Your RapidAPI key for TCG Go API
- `PRICECHARTING_API_KEY`: Your PriceCharting API key

### Rate Limiting
- **TCG Go API**: 100 requests per minute
- **PriceCharting API**: 50 requests per minute
- **Client Cache**: 5 minutes
- **Server Cache**: 1-2 hours depending on data type

## Data Flow

### Search Flow
1. User searches in frontend
2. `internalApiService` checks client cache
3. If not cached, calls API proxy
4. API proxy checks server cache and database
5. If not cached, calls external API
6. Response cached at multiple levels
7. Data returned to frontend

### Background Sync Flow
1. Cron job triggers background sync
2. Sync service fetches popular search terms
3. Updates cache with fresh data
4. Cleans up old cache entries
5. Maintains data freshness

## Benefits

### For Users
- **Instant Results**: Cached data loads immediately
- **Consistent Experience**: Same data for all users
- **Reliable Service**: Fallback strategies prevent failures

### For Development
- **Reduced API Costs**: Centralized rate limiting
- **Better Monitoring**: Centralized logging and metrics
- **Easier Maintenance**: Single point of API management

### For Performance
- **Faster Load Times**: Multi-level caching
- **Reduced Latency**: Closer data sources
- **Better Scalability**: Centralized resource management

## Monitoring

### Cache Hit Rates
Monitor cache effectiveness through Supabase logs and database queries.

### API Usage
Track external API usage through rate limiting logs and response times.

### Error Rates
Monitor error rates and implement alerts for API failures.

## Future Enhancements

1. **Real-time Updates**: WebSocket connections for live data
2. **Advanced Caching**: Redis for even faster responses
3. **Analytics**: User search patterns and popular items
4. **A/B Testing**: Different API strategies
5. **Machine Learning**: Predictive caching based on user behavior

## Troubleshooting

### Common Issues

1. **API Key Errors**: Check Supabase secrets configuration
2. **Rate Limit Exceeded**: Adjust rate limiting or implement backoff
3. **Cache Misses**: Verify database connectivity and cache TTL
4. **Function Timeouts**: Optimize external API calls and caching

### Debug Commands
```bash
# Check function logs
supabase functions logs api-proxy
supabase functions logs background-sync

# Test endpoints
curl -X GET "your-supabase-url/functions/v1/api-proxy/search/cards?q=pikachu&limit=5" \
  -H "Authorization: Bearer your-anon-key"
```

