# Fix Supabase Environment Variables

## 🚨 **Issue Identified**

The Supabase environment variables are being truncated or modified when you save them. This is a known issue with Supabase.

## 🔧 **Solutions to Try:**

### **Solution 1: Use Supabase CLI (Recommended)**
```bash
# Set environment variables via CLI
npx supabase secrets set SCRYDEX_API_KEY=3afbdca9aaae128736728a33c52b734abda3278545f9406c02c9c91ab0e728a7
npx supabase secrets set SCRYDEX_TEAM_ID=onetracking
```

### **Solution 2: Check for Hidden Characters**
1. **Copy the values exactly** (no extra spaces or characters)
2. **Paste them one at a time**
3. **Save immediately** after each one

### **Solution 3: Use Different Variable Names**
Try using shorter variable names:
```
SCRYDEX_KEY=3afbdca9aaae128736728a33c52b734abda3278545f9406c02c9c91ab0e728a7
SCRYDEX_TEAM=onetracking
```

### **Solution 4: Check Dashboard Again**
1. Go to **Settings** → **Edge Functions** → **Environment Variables**
2. **Delete all existing SCRYDEX variables**
3. **Add them one by one** with these exact values:
   - **Name**: `SCRYDEX_API_KEY`
   - **Value**: `3afbdca9aaae128736728a33c52b734abda3278545f9406c02c9c91ab0e728a7`
   - **Name**: `SCRYDEX_TEAM_ID`  
   - **Value**: `onetracking`

## 🎯 **Verification Steps:**

After setting the variables:
1. **Check the values** in the dashboard
2. **Test the sync** - it should work now
3. **Check Edge Function logs** if it still fails

## 🚨 **If Still Not Working:**

The issue might be that Supabase is caching the old values. Try:
1. **Wait 5-10 minutes** for the changes to propagate
2. **Redeploy the Edge Function** to pick up new environment variables
3. **Test again**

## 📋 **Current Status:**
- ✅ **API Key**: Should be `3afbdca9aaae128736728a33c52b734abda3278545f9406c02c9c91ab0e728a7`
- ✅ **Team ID**: Should be `onetracking`
- ❌ **Current Issue**: Values are being truncated/modified in Supabase
