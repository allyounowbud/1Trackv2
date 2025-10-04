#!/bin/bash

echo "🚀 Deploying Scrydex API Integration..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

echo "📦 Deploying Scrydex Edge Functions..."

# Deploy the Scrydex proxy function
supabase functions deploy scrydex-proxy
if [ $? -ne 0 ]; then
    echo "❌ Failed to deploy scrydex-proxy function"
    exit 1
fi

# Deploy the Scrydex sync function (if it exists)
if [ -d "supabase/functions/scrydex-sync" ]; then
    supabase functions deploy scrydex-sync
    if [ $? -ne 0 ]; then
        echo "❌ Failed to deploy scrydex-sync function"
        exit 1
    fi
fi

echo "✅ Scrydex Edge Functions deployed successfully!"

echo "🔧 Setting up environment variables..."
echo "Setting your Scrydex credentials..."

# Set the environment variables using Supabase CLI
supabase secrets set SCRYDEX_API_KEY=3afbdca9aaae128736728a33c52b734abda3278545f9406c02c9c91ab0e728a7
supabase secrets set SCRYDEX_TEAM_ID=onetracking

echo "✅ Environment variables set successfully!"
echo ""

echo "🎉 Scrydex API integration deployment complete!"
echo ""
echo "Available endpoints:"
echo "   /functions/v1/scrydex-proxy/search/cards?q=query"
echo "   /functions/v1/scrydex-proxy/search/expansions?q=query"
echo "   /functions/v1/scrydex-proxy/card?id=cardId"
echo "   /functions/v1/scrydex-proxy/expansion?id=expansionId"
echo "   /functions/v1/scrydex-proxy/api-usage"
echo ""
