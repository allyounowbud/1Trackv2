#!/bin/bash

# Deploy Scrydex Integration
# This script deploys the Scrydex API integration and sets up the database

echo "🚀 Deploying Scrydex Integration..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if we're logged in to Supabase
if ! supabase status &> /dev/null; then
    echo "❌ Not logged in to Supabase. Please run:"
    echo "   supabase login"
    exit 1
fi

# Deploy the updated API proxy function
echo "📦 Deploying updated API Proxy function..."
supabase functions deploy api-proxy

if [ $? -eq 0 ]; then
    echo "✅ API Proxy function deployed successfully"
else
    echo "❌ Failed to deploy API Proxy function"
    exit 1
fi

# Deploy the new Scrydex sync function
echo "📦 Deploying Scrydex Sync function..."
supabase functions deploy scrydex-sync

if [ $? -eq 0 ]; then
    echo "✅ Scrydex Sync function deployed successfully"
else
    echo "❌ Failed to deploy Scrydex Sync function"
    exit 1
fi

# Run database migrations
echo "🗄️ Running database migrations..."
supabase db push

if [ $? -eq 0 ]; then
    echo "✅ Database migrations completed successfully"
else
    echo "❌ Failed to run database migrations"
    exit 1
fi

# Set up environment variables
echo "🔧 Setting up environment variables..."
echo "Make sure the following environment variables are set in your Supabase project:"
echo "  - SCRYDEX_API_KEY: Your Scrydex API key"
echo "  - RAPIDAPI_KEY: Your RapidAPI key for TCG Go API (fallback)"
echo "  - PRICECHARTING_API_KEY: Your PriceCharting API key (fallback)"
echo ""
echo "You can set them using:"
echo "  supabase secrets set SCRYDEX_API_KEY=your_scrydex_key_here"
echo "  supabase secrets set RAPIDAPI_KEY=your_rapidapi_key_here"
echo "  supabase secrets set PRICECHARTING_API_KEY=your_pricecharting_key_here"

# Test the deployed functions
echo "🧪 Testing deployed functions..."
echo "Testing API Proxy with Scrydex..."
curl -X POST "${SUPABASE_URL}/functions/v1/api-proxy/search/expansions?game=pokemon&limit=5" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  --max-time 30

echo ""
echo "Testing Scrydex Sync..."
curl -X POST "${SUPABASE_URL}/functions/v1/scrydex-sync?action=status" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  --max-time 30

echo ""
echo "🎉 Scrydex Integration deployment completed!"
echo ""
echo "Next steps:"
echo "1. Set up your Scrydex API key as a secret in Supabase"
echo "2. Run initial data sync: curl -X POST '${SUPABASE_URL}/functions/v1/scrydex-sync?action=full-sync' -H 'Authorization: Bearer ${SUPABASE_ANON_KEY}'"
echo "3. Set up a cron job to run background sync regularly"
echo "4. Monitor API usage and credits"
echo ""
echo "New API Endpoints:"
echo "  - Search Cards: /functions/v1/api-proxy/search/cards?q=query&game=pokemon&limit=20"
echo "  - Search Expansions: /functions/v1/api-proxy/search/expansions?game=pokemon&limit=1000"
echo "  - Scrydex Sync: /functions/v1/scrydex-sync?action=full-sync"
echo "  - Sync Status: /functions/v1/scrydex-sync?action=status"
echo ""
echo "Supported Games:"
echo "  - pokemon (default)"
echo "  - magic"
echo "  - lorcana"
echo "  - gundam"
