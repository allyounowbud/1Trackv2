# Daily Pricing Sync Setup Guide

This guide will help you set up automated daily pricing synchronization for your Scrydex integration.

## 🎯 What This Does

The daily pricing sync:
- Updates pricing data for all cards in your database
- Runs automatically every day
- Respects API rate limits
- Provides detailed logging
- Updates sync status

## 🚀 Quick Setup

### Option 1: Using Cron (Linux/Mac)

1. **Open your crontab:**
   ```bash
   crontab -e
   ```

2. **Add the daily sync job:**
   ```bash
   # Run daily pricing sync at 2 AM every day
   0 2 * * * cd /path/to/your/1Track && npm run daily-pricing-sync >> /var/log/scrydex-sync.log 2>&1
   ```

3. **Make the script executable:**
   ```bash
   chmod +x scripts/daily-pricing-sync.js
   ```

### Option 2: Using Windows Task Scheduler

1. **Open Task Scheduler**
2. **Create Basic Task:**
   - Name: "Scrydex Daily Pricing Sync"
   - Trigger: Daily at 2:00 AM
   - Action: Start a program
   - Program: `node`
   - Arguments: `scripts/daily-pricing-sync.js`
   - Start in: `C:\path\to\your\1Track`

### Option 3: Using GitHub Actions (Recommended for Production)

Create `.github/workflows/daily-sync.yml`:

```yaml
name: Daily Pricing Sync

on:
  schedule:
    # Run at 2 AM UTC every day
    - cron: '0 2 * * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run daily pricing sync
      env:
        VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
        SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        SCRYDEX_API_KEY: ${{ secrets.SCRYDEX_API_KEY }}
        SCRYDEX_TEAM_ID: ${{ secrets.SCRYDEX_TEAM_ID }}
      run: npm run daily-pricing-sync
    
    - name: Upload logs
      uses: actions/upload-artifact@v4
      if: failure()
      with:
        name: sync-logs
        path: sync.log
```

## 🔧 Configuration

### Environment Variables

Make sure these are set in your environment:

```bash
# Required
VITE_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# For API calls (set in your deployment environment)
SCRYDEX_API_KEY=your-scrydex-api-key
SCRYDEX_TEAM_ID=your-team-id
```

### Sync Configuration

You can modify the sync behavior in `scripts/daily-pricing-sync.js`:

```javascript
class DailyPricingSync {
  constructor() {
    this.batchSize = 50; // Cards per batch
    this.delayBetweenBatches = 1000; // Delay in milliseconds
    // ... other settings
  }
}
```

## 📊 Monitoring

### Check Sync Status

```bash
# Check if sync is running
ps aux | grep daily-pricing-sync

# Check recent logs
tail -f /var/log/scrydex-sync.log

# Check database sync status
npm run test-db
```

### Database Queries

Check sync status in your database:

```sql
-- Check last sync times
SELECT * FROM sync_status;

-- Check recent pricing updates
SELECT name, market_price, updated_at 
FROM pokemon_cards 
WHERE updated_at > NOW() - INTERVAL '1 day'
ORDER BY updated_at DESC
LIMIT 10;

-- Check pricing coverage
SELECT 
  COUNT(*) as total_cards,
  COUNT(market_price) as cards_with_pricing,
  ROUND(COUNT(market_price) * 100.0 / COUNT(*), 2) as pricing_coverage_percent
FROM pokemon_cards;
```

## 🚨 Troubleshooting

### Common Issues

#### "Missing environment variables"
- Ensure all required environment variables are set
- Check that the script has access to them

#### "API rate limit exceeded"
- Increase `delayBetweenBatches` in the script
- Reduce `batchSize` to make smaller requests
- Check your Scrydex API plan limits

#### "Database connection failed"
- Verify Supabase credentials
- Check network connectivity
- Ensure database is accessible

#### "No cards to update"
- This is normal if all cards were recently updated
- Check if the sync is running too frequently

### Debug Mode

Run the sync manually with debug output:

```bash
# Run with verbose logging
DEBUG=* npm run daily-pricing-sync

# Run with limited cards for testing
node scripts/daily-pricing-sync.js --limit=10
```

### Log Analysis

Check logs for patterns:

```bash
# Count successful updates
grep "Updated pricing" /var/log/scrydex-sync.log | wc -l

# Count errors
grep "Failed to update" /var/log/scrydex-sync.log | wc -l

# Check for API errors
grep "API error" /var/log/scrydex-sync.log
```

## 📈 Performance Optimization

### Batch Size Tuning

- **Small batches (10-25)**: More reliable, slower
- **Medium batches (50-100)**: Balanced performance
- **Large batches (100+)**: Faster, but higher risk of timeouts

### Rate Limiting

Adjust delays based on your API plan:

```javascript
// Conservative (free tier)
this.delayBetweenBatches = 2000; // 2 seconds

// Standard (paid tier)
this.delayBetweenBatches = 1000; // 1 second

// Aggressive (premium tier)
this.delayBetweenBatches = 500; // 0.5 seconds
```

### Database Optimization

Ensure proper indexes exist:

```sql
-- Check existing indexes
SELECT indexname, tablename, indexdef 
FROM pg_indexes 
WHERE tablename IN ('pokemon_cards', 'pokemon_expansions');

-- Add missing indexes if needed
CREATE INDEX IF NOT EXISTS idx_pokemon_cards_updated_at 
ON pokemon_cards(updated_at);
```

## 🔄 Manual Sync

### Force a sync manually:

```bash
# Run the daily sync script
npm run daily-pricing-sync

# Or use the force sync command
npm run force-sync
```

### Sync specific cards:

```bash
# Update only cards from a specific expansion
node -e "
import('./src/services/scrydexSyncService.js').then(async (m) => {
  const service = m.default;
  await service.initialize();
  // Add custom logic here
});
"
```

## 📧 Notifications

### Email Notifications

Add email notifications to the sync script:

```javascript
// In daily-pricing-sync.js
async sendNotification(subject, message) {
  // Add your email service integration here
  console.log(`📧 ${subject}: ${message}`);
}
```

### Slack Notifications

```javascript
async sendSlackNotification(message) {
  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (!webhook) return;
  
  await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: message })
  });
}
```

## 🎉 Success Indicators

You'll know the daily sync is working when:

- ✅ Sync runs automatically at scheduled time
- ✅ Logs show successful pricing updates
- ✅ Database `updated_at` timestamps are recent
- ✅ Cards show current market prices
- ✅ No API rate limit errors
- ✅ Sync status table is updated

## 🆘 Getting Help

If you encounter issues:

1. Check the logs for error messages
2. Verify environment variables are set correctly
3. Test the API connection manually
4. Check database connectivity
5. Review your Scrydex API plan limits

The system is designed to be robust with automatic retries and graceful error handling.
