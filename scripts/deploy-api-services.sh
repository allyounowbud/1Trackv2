#!/bin/bash

# Deploy API Services to Supabase
# This script deploys the API proxy and background sync services

echo "🚀 Deploying OneTrack API Services to Supabase..."

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

# Deploy the API proxy function
echo "📦 Deploying API Proxy function..."
supabase functions deploy api-proxy

if [ $? -eq 0 ]; then
    echo "✅ API Proxy function deployed successfully"
else
    echo "❌ Failed to deploy API Proxy function"
    exit 1
fi

# Deploy the background sync function
echo "📦 Deploying Background Sync function..."
supabase functions deploy background-sync

if [ $? -eq 0 ]; then
    echo "✅ Background Sync function deployed successfully"
else
    echo "❌ Failed to deploy Background Sync function"
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

# Set up environment variables (if not already set)
echo "🔧 Setting up environment variables..."
echo "Make sure the following environment variables are set in your Supabase project:"
echo "  - RAPIDAPI_KEY: Your RapidAPI key for TCG Go API"
echo "  - PRICECHARTING_API_KEY: Your PriceCharting API key"
echo ""
echo "You can set them using:"
echo "  supabase secrets set RAPIDAPI_KEY=your_key_here"
echo "  supabase secrets set PRICECHARTING_API_KEY=your_key_here"

# Test the deployed functions
echo "🧪 Testing deployed functions..."
echo "Testing API Proxy..."
curl -X POST "${SUPABASE_URL}/functions/v1/api-proxy/search/cards?q=pikachu&limit=5" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  --max-time 30

echo ""
echo "Testing Background Sync..."
curl -X POST "${SUPABASE_URL}/functions/v1/background-sync?action=popular-searches" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  --max-time 30

echo ""
echo "🎉 API Services deployment completed!"
echo ""
echo "Next steps:"
echo "1. Set up your API keys as secrets in Supabase"
echo "2. Configure a cron job to run background sync regularly"
echo "3. Update your frontend to use the new internal API endpoints"
echo ""
echo "API Endpoints:"
echo "  - Search Cards: /functions/v1/api-proxy/search/cards?q=query&limit=20"
echo "  - Search Products: /functions/v1/api-proxy/search/products?q=query&limit=20"
echo "  - Get Expansion: /functions/v1/api-proxy/expansion?id=expansion_id"
echo "  - Get Market Data: /functions/v1/api-proxy/market-data?product=product_name"
echo "  - Background Sync: /functions/v1/background-sync?action=full"


