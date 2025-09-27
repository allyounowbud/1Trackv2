# Scrydex Integration Guide

This document outlines the complete Scrydex API integration for OneTrack, which replaces the previous TCG Go and PriceCharting APIs as the primary data source.

## Overview

Scrydex is now the primary data source for TCG data, providing comprehensive information for:
- **Pokemon** (primary focus)
- **Magic: The Gathering**
- **Lorcana**
- **Gundam**

## Architecture

### Backend Components

1. **API Proxy Service** (`supabase/functions/api-proxy/index.ts`)
   - Handles all external API calls
   - Implements rate limiting and caching
   - Provides fallback to legacy APIs

2. **Scrydex Sync Service** (`supabase/functions/scrydex-sync/index.ts`)
   - Background data synchronization
   - Scheduled jobs for data freshness
   - API usage tracking

3. **Database Schema** (`migration-scrydex-integration.sql`)
   - `scrydex_cards` - Cached card data
   - `scrydex_expansions` - Cached expansion data
   - `scrydex_search_cache` - Search result caching
   - `scrydex_api_usage` - API usage tracking

### Frontend Components

1. **Scrydex Service** (`src/services/scrydexService.js`)
   - Client-side API service (for reference)
   - Rate limiting and caching
   - **Note**: Frontend should never make direct API calls

2. **Internal API Service** (`src/services/internalApiService.js`)
   - Updated to use Scrydex endpoints
   - Maintains fallback compatibility

3. **Smart Search Service** (`src/services/smartSearchService.js`)
   - Updated to support multiple games
   - Enhanced caching and data processing

## Security & API Key Management

### Critical Security Measures

1. **API Key Protection**
   - Scrydex API key is stored as a Supabase secret
   - Frontend never has direct access to the API key
   - All API calls go through the backend proxy

2. **Rate Limiting**
   - 60 requests per minute
   - 1000 requests per hour
   - 10000 requests per day
   - Automatic queue management

3. **Credit Management**
   - All API usage is tracked
   - Usage statistics available via sync service
   - Automatic fallback to prevent credit waste

## Database Schema

### Scrydex Cards Table
```sql
CREATE TABLE scrydex_cards (
    id TEXT PRIMARY KEY,
    game TEXT NOT NULL, -- 'pokemon', 'magic', 'lorcana', 'gundam'
    scrydex_id TEXT NOT NULL,
    name TEXT NOT NULL,
    set_name TEXT,
    set_code TEXT,
    number TEXT,
    rarity TEXT,
    image_url TEXT,
    small_image_url TEXT,
    large_image_url TEXT,
    tcgplayer_id TEXT,
    cardmarket_id TEXT,
    prices JSONB,
    legalities JSONB,
    raw_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Scrydex Expansions Table
```sql
CREATE TABLE scrydex_expansions (
    id TEXT PRIMARY KEY,
    game TEXT NOT NULL,
    scrydex_id TEXT NOT NULL,
    name TEXT NOT NULL,
    code TEXT,
    release_date DATE,
    total_cards INTEGER,
    image_url TEXT,
    symbol_url TEXT,
    logo_url TEXT,
    raw_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## API Endpoints

### New Scrydex Endpoints

1. **Search Cards**
   ```
   GET /functions/v1/api-proxy/search/cards?q=query&game=pokemon&limit=20
   ```

2. **Search Expansions**
   ```
   GET /functions/v1/api-proxy/search/expansions?game=pokemon&limit=1000
   ```

3. **Sync Service**
   ```
   POST /functions/v1/scrydex-sync?action=full-sync
   POST /functions/v1/scrydex-sync?action=status
   POST /functions/v1/scrydex-sync?action=sync-expansions
   POST /functions/v1/scrydex-sync?action=sync-cards
   POST /functions/v1/scrydex-sync?action=cleanup-cache
   ```

### Supported Games

- `pokemon` (default)
- `magic`
- `lorcana`
- `gundam`

## Deployment

### Prerequisites

1. Supabase CLI installed
2. Scrydex API key
3. Supabase project configured

### Deployment Steps

1. **Set Environment Variables**
   ```bash
   supabase secrets set SCRYDEX_API_KEY=your_scrydex_key_here
   supabase secrets set RAPIDAPI_KEY=your_rapidapi_key_here
   supabase secrets set PRICECHARTING_API_KEY=your_pricecharting_key_here
   ```

2. **Deploy Functions**
   ```bash
   supabase functions deploy api-proxy
   supabase functions deploy scrydex-sync
   ```

3. **Run Database Migrations**
   ```bash
   supabase db push
   ```

4. **Initial Data Sync**
   ```bash
   curl -X POST "YOUR_SUPABASE_URL/functions/v1/scrydex-sync?action=full-sync" \
     -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY"
   ```

### Automated Deployment

Use the provided deployment scripts:
- **Linux/Mac**: `./scripts/deploy-scrydex-integration.sh`
- **Windows**: `scripts/deploy-scrydex-integration.bat`

## Data Synchronization

### Background Sync Jobs

The sync service handles several types of data synchronization:

1. **Expansion Sync**
   - Fetches all expansions for each game
   - Updates expansion metadata
   - Caches expansion data

2. **Popular Cards Sync**
   - Fetches popular cards for each game
   - Updates card metadata and pricing
   - Caches card data

3. **Cache Cleanup**
   - Removes expired cache entries
   - Maintains database performance
   - Prevents storage bloat

### Sync Schedule

Recommended sync schedule:
- **Expansions**: Daily at 2 AM
- **Popular Cards**: Every 6 hours
- **Cache Cleanup**: Daily at 3 AM

## Monitoring & Usage

### API Usage Tracking

The system tracks:
- Total requests per endpoint
- Average response times
- Total credits used
- Requests by endpoint

### Usage Statistics

Access usage statistics via:
```bash
curl -X POST "YOUR_SUPABASE_URL/functions/v1/scrydex-sync?action=status" \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY"
```

### Database Functions

1. **Cleanup Expired Cache**
   ```sql
   SELECT cleanup_expired_scrydex_cache();
   ```

2. **Get Usage Statistics**
   ```sql
   SELECT * FROM get_scrydex_usage_stats(7); -- Last 7 days
   ```

## Fallback Strategy

### Multi-Level Fallback

1. **Primary**: Scrydex API
2. **Secondary**: Database cache
3. **Tertiary**: Legacy APIs (TCG Go, PriceCharting)

### Fallback Triggers

- API rate limit exceeded
- API key invalid/expired
- Network connectivity issues
- Scrydex service unavailable

## Best Practices

### API Usage

1. **Cache First**: Always check database cache before API calls
2. **Batch Requests**: Group related requests when possible
3. **Monitor Credits**: Track usage to avoid exceeding limits
4. **Use Sync Service**: Prefer background sync over real-time API calls

### Data Management

1. **Regular Cleanup**: Run cache cleanup regularly
2. **Monitor Storage**: Track database growth
3. **Backup Strategy**: Implement data backup for critical information
4. **Performance Monitoring**: Monitor query performance and optimize

### Error Handling

1. **Graceful Degradation**: Always provide fallback data
2. **User Feedback**: Inform users of data freshness
3. **Logging**: Comprehensive error logging for debugging
4. **Retry Logic**: Implement intelligent retry mechanisms

## Troubleshooting

### Common Issues

1. **API Key Issues**
   - Verify API key is set correctly
   - Check API key permissions
   - Monitor credit balance

2. **Rate Limiting**
   - Check usage statistics
   - Implement request queuing
   - Consider upgrading API plan

3. **Database Issues**
   - Check RLS policies
   - Verify table permissions
   - Monitor database performance

4. **Sync Failures**
   - Check function logs
   - Verify network connectivity
   - Review error messages

### Debug Commands

1. **Check Function Status**
   ```bash
   supabase functions list
   ```

2. **View Function Logs**
   ```bash
   supabase functions logs api-proxy
   supabase functions logs scrydex-sync
   ```

3. **Test API Endpoints**
   ```bash
   curl -X POST "YOUR_SUPABASE_URL/functions/v1/api-proxy/search/cards?q=pikachu&game=pokemon&limit=5" \
     -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY"
   ```

## Migration from Legacy APIs

### Data Migration

1. **Existing Data**: Legacy data remains in `cached_products` and `cached_cards`
2. **New Data**: All new data goes to Scrydex tables
3. **Gradual Migration**: System supports both old and new data sources

### API Compatibility

- Legacy endpoints remain functional
- New endpoints provide enhanced functionality
- Frontend automatically uses new endpoints when available

## Support

For issues or questions:
1. Check function logs for error details
2. Review API usage statistics
3. Verify environment variables
4. Test with minimal requests first

## Future Enhancements

### Planned Features

1. **Real-time Pricing**: WebSocket connections for live pricing
2. **Advanced Search**: Full-text search capabilities
3. **Image Recognition**: AI-powered card identification
4. **Market Analysis**: Trend analysis and predictions
5. **Multi-language Support**: Internationalization

### Performance Optimizations

1. **CDN Integration**: Global content delivery
2. **Database Indexing**: Optimized query performance
3. **Caching Layers**: Multi-level caching strategy
4. **Load Balancing**: Distributed request handling
