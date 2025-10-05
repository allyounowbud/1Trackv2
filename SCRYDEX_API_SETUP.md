# 🚀 Scrydex API Integration Setup

## 🎯 Goal
Get real Pokemon data from Scrydex API into your Supabase database for instant web app access.

## 📋 Prerequisites
- ✅ Supabase database tables created (already done)
- ✅ Scrydex API account with API key and Team ID
- ✅ Node.js environment

## 🔑 Step 1: Get Your Scrydex API Credentials

1. **Go to Scrydex Dashboard**: https://scrydex.com/dashboard
2. **Sign in** to your account
3. **Navigate to API Keys** section
4. **Copy your**:
   - API Key (long string)
   - Team ID (shorter string)

## ⚙️ Step 2: Configure Environment Variables

Run the setup script to configure your credentials:

```bash
npm run setup-scrydex-credentials
```

This will:
- Create/update your `.env` file
- Add placeholder values for your API credentials
- Show you exactly what to edit

## ✏️ Step 3: Edit Your .env File

Open your `.env` file and replace the placeholder values:

```env
# Scrydex API Credentials
SCRYDEX_API_KEY=your_actual_api_key_here
SCRYDEX_TEAM_ID=your_actual_team_id_here
```

**Important**: Replace `your_actual_api_key_here` and `your_actual_team_id_here` with your real credentials.

## 🚀 Step 4: Fetch Real Pokemon Data

Once your credentials are configured, run:

```bash
npm run fetch-scrydex-data
```

This script will:
- ✅ Fetch all Pokemon expansions from Scrydex API
- ✅ Fetch all Pokemon cards from Scrydex API  
- ✅ Fetch pricing data for all cards
- ✅ Store everything in your Supabase database
- ✅ Update sync status with real data counts

## ⏱️ Expected Timeline

- **Expansions**: ~30 seconds (hundreds of expansions)
- **Cards**: ~2-5 minutes (thousands of cards)
- **Pricing**: ~1-2 minutes (pricing data)
- **Total**: ~5-10 minutes depending on data size

## 📊 What You'll Get

After the script completes, your database will contain:
- **All Pokemon expansions** (Base Set, Jungle, Fossil, etc.)
- **All Pokemon cards** (Charizard, Pikachu, etc.)
- **Real pricing data** (USD, EUR, GBP from multiple sources)
- **Updated sync status** showing real counts

## 🎮 Step 5: Test Your App

1. **Refresh your web app** (http://localhost:5173/search)
2. **You should see**:
   - Real card counts (e.g., "15,000+ cards")
   - Real expansion counts (e.g., "200+ expansions")
   - Working search with real Pokemon data
   - Real pricing information

## 🔍 Test Search Functionality

Try searching for:
- **"Charizard"** - Should show multiple Charizard cards
- **"Pikachu"** - Should show multiple Pikachu cards
- **"Fire"** - Should show all Fire-type Pokemon
- **"Base Set"** - Should show all Base Set cards

## 🚨 Troubleshooting

### API Key Issues
```
❌ Missing Scrydex API credentials!
```
**Solution**: Make sure your `.env` file has the correct API key and Team ID.

### Network Issues
```
❌ API Error 401: Unauthorized
```
**Solution**: Check your API key and Team ID are correct.

### Database Issues
```
❌ Failed to store cards: permission denied
```
**Solution**: Make sure your Supabase database tables exist and have proper permissions.

## 🎉 Success!

Once complete, you'll have:
- ✅ **Real Pokemon data** from Scrydex API
- ✅ **Instant search** from local database
- ✅ **Real pricing** information
- ✅ **Professional app** ready for users

## 🔄 Future Updates

To update pricing data later:
```bash
npm run fetch-scrydex-data
```

This will:
- Keep existing card data
- Update pricing information
- Update sync timestamps

## 📈 Next Steps

After getting real data:
1. **Test search functionality** thoroughly
2. **Add more features** (filters, sorting, etc.)
3. **Set up automated pricing updates** (daily cron job)
4. **Deploy to production** when ready

---

**Your Pokemon app will have real, up-to-date data from Scrydex API!** 🚀
