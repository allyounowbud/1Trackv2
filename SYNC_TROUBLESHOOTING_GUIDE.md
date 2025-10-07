# Scrydex Sync Troubleshooting Guide

## 🚨 **Current Issue: 400 Bad Request Error**

The sync is failing with a 400 Bad Request error. Here are the most likely causes and solutions:

## 🔍 **Possible Causes**

### **1. Missing Environment Variables**
The Edge Function requires these environment variables:
- `SCRYDEX_API_KEY`
- `SCRYDEX_TEAM_ID`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

**Check**: Go to your Supabase dashboard → Settings → Edge Functions → Environment Variables

### **2. Edge Function Not Deployed**
The `scrydex-sync` function might not be deployed.

**Check**: Go to your Supabase dashboard → Edge Functions → Check if `scrydex-sync` is listed

### **3. Database Schema Mismatch**
The Edge Function is trying to insert data into tables that don't match the API response structure.

**Solution**: Apply the database schema updates we created

### **4. API Credentials Invalid**
The Scrydex API credentials might be invalid or expired.

**Check**: Verify your Scrydex API key and team ID are correct

## 🔧 **Step-by-Step Troubleshooting**

### **Step 1: Check Environment Variables**
1. Go to Supabase Dashboard
2. Navigate to Settings → Edge Functions
3. Check Environment Variables section
4. Ensure these are set:
   - `SCRYDEX_API_KEY`: Your Scrydex API key
   - `SCRYDEX_TEAM_ID`: Your Scrydex team ID
   - `SUPABASE_URL`: Your Supabase URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Your service role key

### **Step 2: Deploy Edge Function**
If the function isn't deployed:
```bash
# Deploy the sync function
npx supabase functions deploy scrydex-sync
```

### **Step 3: Update Database Schema**
Apply the schema updates:
```bash
# Apply the complete schema update
psql -d your_database -f update-schema-complete-api-structure.sql
```

### **Step 4: Test API Credentials**
Test your Scrydex API credentials:
```bash
curl -H "X-Api-Key: YOUR_API_KEY" -H "X-Team-ID: YOUR_TEAM_ID" \
     "https://api.scrydex.com/v1/pokemon/v1/expansions?pageSize=1"
```

## 🚀 **Quick Fix Steps**

1. **Set Environment Variables** in Supabase dashboard
2. **Deploy Edge Function** if not deployed
3. **Update Database Schema** with our new schema
4. **Test Sync** again

## 📋 **Environment Variables Setup**

In your Supabase dashboard, add these environment variables:

```
SCRYDEX_API_KEY=your_scrydex_api_key_here
SCRYDEX_TEAM_ID=your_scrydex_team_id_here
SUPABASE_URL=https://hcpubmtohdnlmcjixbnl.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

## 🔍 **Debugging Steps**

1. **Check Edge Function Logs**:
   - Go to Supabase Dashboard → Edge Functions → scrydex-sync → Logs
   - Look for error messages

2. **Test with Simple Request**:
   - Try calling the function with just `action=status`
   - This should work even without API credentials

3. **Verify Database Tables**:
   - Check if `pokemon_cards` and `pokemon_expansions` tables exist
   - Check if they have the correct schema

## 💡 **Most Likely Solution**

The most likely issue is **missing environment variables**. Set up the environment variables in your Supabase dashboard, then try the sync again.

If that doesn't work, the next most likely issue is that the **database schema needs to be updated** to match the API response structure.
