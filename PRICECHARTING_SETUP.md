# PriceCharting API Setup Guide

This guide will help you set up the PriceCharting API for sealed product pricing in your 1Track application.

## Overview

The PriceCharting API provides accurate US pricing data for sealed products (booster boxes, elite trainer boxes, etc.). This integration allows the app to:

- Get real-time pricing for sealed products
- Sort products by expansion using Scrydex data
- Display market, low, mid, and high prices
- Provide accurate US market values

## Step 1: Get PriceCharting API Key

1. **Visit PriceCharting**: Go to [https://www.pricecharting.com](https://www.pricecharting.com)
2. **Create Account**: Sign up for a free account if you don't have one
3. **Get API Key**: 
   - Go to your account settings
   - Look for "API" or "Developer" section
   - Generate an API key
   - Note: Free accounts have limited API calls per month

## Step 2: Configure Supabase Environment Variables

1. **Open Supabase Dashboard**: Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. **Select Your Project**: Choose your 1Track project
3. **Go to Settings**: Click on "Settings" in the left sidebar
4. **Environment Variables**: Click on "Environment Variables"
5. **Add Variables**: Add the following environment variables:

   ```
   PRICECHARTING_API_KEY=your_api_key_here
   PRICECHARTING_BASE_URL=https://www.pricecharting.com/api
   ```

   Replace `your_api_key_here` with your actual PriceCharting API key.

## Step 3: Verify Setup

1. **Restart Your App**: The app will automatically detect the new API key
2. **Check Settings Page**: Go to Settings in your app and look for "PriceCharting" section
3. **Test Connection**: Click "Test Connection" to verify the API is working
4. **Search Sealed Products**: Try searching for "booster box" or "elite trainer box"

## API Endpoints

The PriceCharting integration provides the following endpoints:

- **Test**: `GET /functions/v1/pricecharting-api?endpoint=test`
- **Search**: `GET /functions/v1/pricecharting-api?endpoint=search&q=query&game=pokemon`
- **Product Details**: `GET /functions/v1/pricecharting-api?endpoint=product&id=product_id`
- **Pricing**: `GET /functions/v1/pricecharting-api?endpoint=pricing&id=product_id`

## Usage in App

### Sealed Product Search
When you search for sealed products, the app will:
1. Use PriceCharting API to find products
2. Sort results by expansion using Scrydex data
3. Display pricing information
4. Show market, low, mid, and high prices

### Example Searches
- "pokemon booster box"
- "elite trainer box"
- "sealed collection"
- "booster pack"

## Troubleshooting

### Common Issues

1. **404 Error**: The PriceCharting API function is not deployed
   - Solution: The function has been deployed automatically

2. **403/401 Error**: Invalid API key
   - Solution: Check your API key in Supabase environment variables

3. **429 Error**: Rate limit exceeded
   - Solution: Wait a few minutes or upgrade your PriceCharting plan

4. **No Results**: Search query not found
   - Solution: Try different search terms or check if the product exists

### Debug Information

Check the browser console for detailed error messages:
- Open Developer Tools (F12)
- Go to Console tab
- Look for PriceCharting-related errors

## Security Notes

- API keys are stored securely on the backend
- All requests go through our secure proxy
- No sensitive data is exposed to the frontend
- Rate limiting is handled by PriceCharting

## Cost Considerations

- **Free Plan**: Limited API calls per month
- **Paid Plans**: Higher limits and better support
- **Usage**: Each search counts as one API call
- **Caching**: Results are cached to minimize API usage

## Support

If you encounter issues:

1. Check the browser console for errors
2. Verify your API key is correct
3. Ensure you have sufficient API quota
4. Try different search terms
5. Check PriceCharting's service status

## Integration Details

The PriceCharting integration works alongside:

- **Scrydex API**: For single card pricing and expansion data
- **RapidAPI**: For image enhancement (optional)
- **Hybrid Search**: Automatically routes searches to appropriate APIs

This ensures you get the best pricing data for both singles and sealed products while maintaining proper expansion sorting.
