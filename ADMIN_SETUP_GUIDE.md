# 🔐 Admin Access Setup Guide

## Overview

The database sync settings are now **admin-only** to prevent regular users from accessing backend systems and API management tools.

## 🚀 Quick Setup

### Method 1: Email-Based Admin (Recommended)

1. **Open** `src/config/adminConfig.js`
2. **Add your email** to the `ADMIN_EMAILS` array:

```javascript
export const ADMIN_EMAILS = [
  'admin@1track.com',
  'your-email@example.com',  // ← Add your email here
  'another-admin@example.com'
];
```

3. **Save the file** and restart your app
4. **Sign in** with that email address
5. **Access admin settings** in Settings → Database Sync

### Method 2: User Metadata Admin

If you're using Supabase Auth with custom metadata:

1. **Set user metadata** when creating users:
```javascript
// In your user creation code
const { data, error } = await supabase.auth.signUp({
  email: 'admin@example.com',
  password: 'password',
  options: {
    data: {
      role: 'admin',  // This will grant admin access
      // OR
      admin: true,
      // OR  
      isAdmin: true
    }
  }
});
```

### Method 3: Database-Based Admin

If you have a `users` table in your database:

1. **Create a users table** (if not exists):
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

2. **Set admin flag** in database:
```sql
UPDATE users SET is_admin = true WHERE email = 'admin@example.com';
```

## 🔍 How It Works

The admin system checks for admin privileges using **three methods**:

1. **Email Check**: Is the user's email in the admin list?
2. **Metadata Check**: Does the user have admin role in metadata?
3. **Database Check**: Is the user marked as admin in the database?

**If ANY method returns true, the user gets admin access.**

## 🎯 Admin Features

### What Admins Can Access:
- ✅ **Database Sync Settings** - Full sync controls
- ✅ **Pricing System Management** - 12-hour pricing updates
- ✅ **System Health Monitoring** - Service status and statistics
- ✅ **Manual Sync Triggers** - On-demand database updates
- ✅ **Cache Management** - Clear and manage pricing caches

### What Regular Users See:
- ❌ **Access Restricted** message
- ❌ **No sync controls** or admin buttons
- ✅ **Normal app functionality** (collection, search, etc.)

## 🛡️ Security Features

### Frontend Protection:
- Admin checks run on component load
- Loading states while checking permissions
- Clear access denied messages for non-admins
- Admin badge indicators for authorized users

### Backend Protection:
- Supabase Edge Functions still require proper authentication
- Database operations respect user permissions
- API rate limiting still applies to admin operations

## 🔧 Configuration Options

### Admin Permissions
Edit `src/config/adminConfig.js` to customize:

```javascript
export const ADMIN_PERMISSIONS = {
  canManageDatabase: true,     // Database sync controls
  canManagePricing: true,      // Pricing system controls  
  canViewSystemHealth: true,   // System monitoring
  canManageUsers: false,       // User management (future)
  canAccessLogs: false         // System logs (future)
};
```

### Admin Email List
```javascript
export const ADMIN_EMAILS = [
  'admin@1track.com',
  'owner@yourcompany.com',
  'support@yourcompany.com'
];
```

## 🚨 Troubleshooting

### "Access Restricted" Message
- ✅ Check your email is in `ADMIN_EMAILS` array
- ✅ Verify you're signed in with the correct account
- ✅ Try refreshing the page after adding your email
- ✅ Check browser console for admin check logs

### Admin Settings Not Loading
- ✅ Ensure you're signed in
- ✅ Check network connection
- ✅ Verify Supabase configuration
- ✅ Check browser console for errors

### Database Errors
- ✅ Verify Supabase is properly configured
- ✅ Check if `users` table exists (for database method)
- ✅ Ensure proper database permissions

## 📝 Testing Admin Access

1. **Add your email** to admin config
2. **Sign out** and sign back in
3. **Go to Settings** page
4. **Look for "Admin Access" badge** in Database Sync section
5. **Verify you can see** sync controls and system status

## 🔄 Removing Admin Access

To remove admin access from a user:

### Email Method:
- Remove email from `ADMIN_EMAILS` array
- User will lose access on next page refresh

### Metadata Method:
- Update user metadata to remove admin flags
- Changes take effect immediately

### Database Method:
- Set `is_admin = false` in users table
- Changes take effect on next login

## 📞 Support

If you need help setting up admin access:

1. **Check this guide** first
2. **Verify your email** is correctly added
3. **Check browser console** for error messages
4. **Test with a different email** if needed

---

**Security Note**: Admin access gives full control over database sync and pricing systems. Only grant admin access to trusted users who understand the implications.
