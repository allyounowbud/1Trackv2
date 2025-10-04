# Scrydex API Setup Guide

## 🔑 Required Environment Variables

You need to set up these environment variables in your Netlify dashboard:

### 1. Get Your API Credentials
1. Go to [Scrydex Dashboard](https://scrydex.com/dashboard)
2. Log in with your account
3. Find your **API Key** and **Team ID**

### 2. Set Environment Variables in Netlify
1. Go to your Netlify dashboard
2. Navigate to your site
3. Go to **Site settings** → **Environment variables**
4. Add these variables:

```
SCRYDEX_API_KEY=your_actual_api_key_here
SCRYDEX_TEAM_ID=your_actual_team_id_here
```

### 3. Deploy Your Site
After setting the environment variables, redeploy your site so the Netlify function can access them.

## 🚀 How It Works

The app now uses a **secure proxy approach**:

1. **Netlify Function** (`netlify/functions/scrydex.ts`) handles API calls with your credentials
2. **React App** calls the proxy function instead of Scrydex directly
3. **API keys stay secure** on the server side

## 🔍 API Endpoints Used

- **Search Cards**: `/pokemon/v1/en/cards?q=name:charizard&include=prices`
- **Get Expansions**: `/pokemon/v1/en/expansions`
- **Get Usage**: `/v1/usage`

## 📊 Features

✅ **Secure API calls** through Netlify proxy  
✅ **Proper headers** (X-Api-Key, X-Team-ID)  
✅ **Image loading** from Scrydex CDN  
✅ **Price information** (market, low, mid)  
✅ **Pagination** (20 results per page)  
✅ **Expansion browsing**  
✅ **Usage monitoring** (credits remaining)  
✅ **Error handling** with helpful messages  

## 🛠️ Troubleshooting

### "Missing Scrydex credentials" Error
- Make sure you've set both `SCRYDEX_API_KEY` and `SCRYDEX_TEAM_ID` in Netlify
- Redeploy your site after adding environment variables

### "Failed to call Scrydex API" Error
- Check your API key and Team ID are correct
- Verify you have credits remaining in your Scrydex account
- Check the Netlify function logs for more details

### No Images Loading
- Images come directly from Scrydex CDN
- Check your internet connection
- Some cards may not have images available

### No Prices Showing
- Make sure you have a paid Scrydex plan
- Prices are only available with `include=prices` parameter
- Some cards may not have price data

## 📝 Example Queries

Try these search queries:
- `name:charizard` - Find Charizard cards
- `type:fire` - Find Fire type Pokemon
- `rarity:rare` - Find rare cards
- `expansion.name:"Base Set"` - Find cards from Base Set
- `hp:100` - Find cards with 100 HP

## 🔄 Next Steps

Once this is working, you can:
1. Add caching to reduce API calls
2. Implement card collection features
3. Add price tracking and alerts
4. Set up scheduled data refreshes





