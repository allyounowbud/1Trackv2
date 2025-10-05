@echo off
echo 🚀 Deploying Scrydex API Integration...

REM Check if Supabase CLI is installed
where supabase >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Supabase CLI not found. Please install it first:
    echo    npm install -g supabase
    pause
    exit /b 1
)

echo 📦 Deploying Scrydex Edge Functions...

REM Deploy the Scrydex proxy function
supabase functions deploy scrydex-proxy
if %errorlevel% neq 0 (
    echo ❌ Failed to deploy scrydex-proxy function
    pause
    exit /b 1
)

REM Deploy the Scrydex sync function (if it exists)
if exist "supabase\functions\scrydex-sync" (
    supabase functions deploy scrydex-sync
    if %errorlevel% neq 0 (
        echo ❌ Failed to deploy scrydex-sync function
        pause
        exit /b 1
    )
)

echo ✅ Scrydex Edge Functions deployed successfully!

echo 🔧 Setting up environment variables...
echo Setting your Scrydex credentials...

REM Set the environment variables using Supabase CLI
supabase secrets set SCRYDEX_API_KEY=3afbdca9aaae128736728a33c52b734abda3278545f9406c02c9c91ab0e728a7
supabase secrets set SCRYDEX_TEAM_ID=onetracking

echo ✅ Environment variables set successfully!
echo.

echo 🎉 Scrydex API integration deployment complete!
echo.
echo Available endpoints:
echo    /functions/v1/scrydex-proxy/search/cards?q=query
echo    /functions/v1/scrydex-proxy/search/expansions?q=query
echo    /functions/v1/scrydex-proxy/card?id=cardId
echo    /functions/v1/scrydex-proxy/expansion?id=expansionId
echo    /functions/v1/scrydex-proxy/api-usage
echo.

pause
