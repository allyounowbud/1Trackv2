# RapidAPI Setup Guide

## 🔑 Required Environment Variables

You need to set up the RapidAPI key in your Supabase project to enable sealed product pricing.

### 1. Get Your RapidAPI Key
1. Go to [RapidAPI](https://rapidapi.com/)
2. Sign up or log in to your account
3. Subscribe to the **TCGPlayer API** (or any card pricing API)
4. Get your **API Key** from the dashboard

### 2. Set Environment Variables in Supabase
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard/project/hcpubmtohdnlmcjixbnl)
2. Navigate to **Settings** → **Environment variables**
3. Add these variables:

```
RAPIDAPI_KEY=your_actual_rapidapi_key_here
RAPIDAPI_HOST=tcgplayer.p.rapidapi.com
```

### 3. Deploy the Function
The RapidAPI function is already deployed. If you need to redeploy:

```bash
npx supabase functions deploy rapidapi
```

## 🚀 How It Works

The app uses a **secure proxy approach**:

1. **Supabase Function** (`supabase/functions/rapidapi/index.ts`) handles API calls with your credentials
2. **React App** calls the proxy function instead of RapidAPI directly
3. **API keys stay secure** on the server side

## 🔍 API Endpoints Used

- **Search Products**: `/catalog/products?getExtendedFields=true&includeProductVariations=true`
- **Product Details**: `/catalog/products/{id}?getExtendedFields=true&includeProductVariations=true`
- **Product Pricing**: `/pricing/product/{id}`

## 📊 Features

✅ **Secure API calls** through Supabase proxy  
✅ **Proper headers** (X-RapidAPI-Key, X-RapidAPI-Host)  
✅ **Sealed product pricing** (booster boxes, ETBs, etc.)  
✅ **Product details** with images and descriptions  
✅ **Market pricing** (low, mid, high, market prices)  
✅ **Error handling** with helpful messages  

## 🛠️ Troubleshooting

### Function Not Working
- Check that the RapidAPI key is set in Supabase environment variables
- Verify the function is deployed: `npx supabase functions deploy rapidapi`
- Check the function logs in Supabase dashboard

### API Errors
- Ensure you have an active RapidAPI subscription
- Check your API usage limits
- Verify the API key is correct

### No Results
- The API only returns sealed products (booster boxes, ETBs, etc.)
- Single cards are handled by Scrydex API
- Try different search terms like "booster box" or "elite trainer box"

## 📝 Notes

- This service is **only for sealed products**
- Single card pricing is handled by Scrydex API
- The hybrid search service automatically routes queries to the appropriate API
- All API calls go through the secure Supabase backend
