# Background Sync Cron Setup

## Manual Cron Job Setup

Since Supabase doesn't have built-in cron jobs, you can set up the background sync to run every 12 hours using external services:

### Option 1: GitHub Actions (Free)
Create `.github/workflows/background-sync.yml`:

```yaml
name: Background Sync
on:
  schedule:
    - cron: '0 */12 * * *'  # Every 12 hours
  workflow_dispatch:  # Allow manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Background Sync
        run: |
          curl -X POST "${{ secrets.SUPABASE_URL }}/functions/v1/background-sync?action=full" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}"
```

### Option 2: Uptime Robot (Free)
- Create a monitor that calls your function every 12 hours
- URL: `https://your-project.supabase.co/functions/v1/background-sync?action=full`
- Method: POST
- Headers: `Authorization: Bearer your-anon-key`

### Option 3: Cron-job.org (Free)
- Set up a cron job to call your function every 12 hours
- URL: `https://your-project.supabase.co/functions/v1/background-sync?action=full`
- Method: POST
- Headers: `Authorization: Bearer your-anon-key`

## Manual Testing

You can manually trigger the sync by calling:
```bash
curl -X POST "https://your-project.supabase.co/functions/v1/background-sync?action=full" \
  -H "Authorization: Bearer your-anon-key"
```

## Sync Schedule

- **Full Sync**: Every 12 hours
- **Market Data**: Updated every 12 hours
- **Static Data**: Cached forever (names, images, etc.)
- **Cleanup**: Removes old market data after 30 days

