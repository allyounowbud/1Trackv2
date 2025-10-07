# Update Supabase Environment Variables

## 🔧 **Required Environment Variables**

You need to update your Supabase Edge Function environment variables with the correct API credentials:

### **In Supabase Dashboard:**
1. Go to **Settings** → **Edge Functions** → **Environment Variables**
2. Update these variables:

```
SCRYDEX_API_KEY=3afbdca9aaae128736728a33c52b734abda3278545f9406c02c9c91ab0e728a7
SCRYDEX_TEAM_ID=onetracking
```

### **Current Status:**
- ❌ **API Key**: Currently set to truncated value starting with `1268e2cea8723dfc...`
- ❌ **Team ID**: Currently set to truncated value starting with `46e64ff1424a5f8a...`

### **Action Required:**
1. **Delete the old truncated values**
2. **Add the new complete values** shown above
3. **Save the changes**

## 🎯 **After Updating Environment Variables:**

1. **Test the sync again** - it should work now
2. **The API calls will succeed** with the correct credentials
3. **Data will be stored** in the correct format

## 📋 **Verification:**

After updating the environment variables, the test sync should work and you should see:
- ✅ API calls succeeding (200 status)
- ✅ Cards being stored in the database
- ✅ Proper data structure with HP as string, images as array, etc.
