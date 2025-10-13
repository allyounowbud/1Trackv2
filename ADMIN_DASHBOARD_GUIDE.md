# Admin Dashboard Guide

## Overview

The Admin Dashboard provides centralized monitoring and management of all API connections, data sync operations, and system statistics. It's a dedicated, admin-only page for system administration.

## Access Control

### Who Can Access
- **Admins Only**: Users with admin privileges (`is_admin = true` in database)
- **Automatic Redirect**: Non-admins are redirected to settings page
- **Hidden from Navigation**: Not visible in sidebar or bottom navigation

### How to Access
1. Navigate to **Settings** page
2. Look for the **"Admin Dashboard"** button (admins only)
3. Click to access the admin dashboard
4. Use **back button** to return to settings

---

## Features

### 🎯 **System Overview Cards**

Four real-time statistics cards:

1. **Pokemon Cards**
   - Total cards in database
   - Icon: Database (blue)

2. **Expansions**
   - Total expansions synced
   - Icon: Package (purple)

3. **Sealed Products**
   - Total sealed products from TCGCSV
   - Icon: Package (green)

4. **Active APIs**
   - Number of connected APIs
   - Icon: Cloud (indigo)

### 📡 **API Connection Cards**

#### 1. **Supabase**
- **Status Badge**: Connected/Error
- **Data Shown**:
  - Endpoint identifier
  - Connection status
- **Icon**: Green database

#### 2. **Scrydex API**
- **Status Badge**: Connected/Unknown
- **Data Shown**:
  - Last cards sync time
  - Last expansions sync time
- **Icon**: Blue cloud

#### 3. **TCGCSV API**
- **Status Badge**: Active/Syncing/Pending/Error
- **Data Shown**:
  - Products synced count
  - Groups synced count
  - Last sync time
- **Controls**:
  - "Sync Recent" button (20 groups)
  - "Full Sync" button (all groups)
- **Icon**: Purple package

#### 4. **Database (PostgreSQL)**
- **Status Badge**: Connected/Error
- **Data Shown**:
  - Total cards
  - Total expansions
  - Total sealed products
- **Icon**: Indigo database

### 📊 **Sync Status & History**

#### TCGCSV Sync Details:
- **Sync Status**: pending/in_progress/completed/failed
- **Last Full Sync**: Date/time of last complete sync
- **Last Incremental Sync**: Date/time of last partial sync
- **Total Products**: Number of sealed products imported
- **Groups Synced**: Number of expansions processed
- **Error Display**: Shows sync errors if any

### ⚡ **Quick Actions**

Three quick action buttons:

1. **Database Tables**
   - Opens Supabase table editor
   - Direct link to database management

2. **TCGCSV API**
   - Opens TCGCSV website
   - View API documentation

3. **Sync Logs**
   - View sync history (coming soon)
   - Monitor sync operations

---

## Status Badges

### Badge Colors & Meanings

| Badge | Color | Icon | Meaning |
|-------|-------|------|---------|
| **Connected** | Green | CheckCircle | API is connected and working |
| **Active** | Green | CheckCircle | Sync completed successfully |
| **Syncing** | Blue | Activity | Sync in progress |
| **Pending** | Yellow | AlertCircle | Sync not yet started |
| **Error** | Red | XCircle | Connection or sync failed |
| **Unknown** | Gray | AlertCircle | Status not determined |

---

## Using the Dashboard

### Initial Load
1. Dashboard loads all API statuses automatically
2. Shows real-time database counts
3. Displays last sync times
4. All data refreshes on page load

### Refresh Data
- Click **"Refresh All"** button in header
- Reloads all API statuses and counts
- Updates all timestamps

### Trigger TCGCSV Sync
1. Click **"Sync Recent"** for last 20 expansions (~1-2 min)
2. Click **"Full Sync"** for all 210+ expansions (~5-10 min)
3. Dashboard shows alert with terminal command to run
4. Status automatically refreshes after sync

### View Database Tables
- Click **"Database Tables"** quick action
- Opens Supabase table editor in new tab
- Direct access to all tables

---

## Time Formatting

Dashboard shows relative times for better readability:

| Actual Time | Display |
|-------------|---------|
| < 1 minute ago | "Just now" |
| 1-59 minutes ago | "X min ago" |
| 1-23 hours ago | "X hours ago" |
| 1-6 days ago | "X days ago" |
| > 7 days ago | "Oct 13, 2025" |

---

## API Details

### Supabase
- **Type**: Database & Authentication
- **Status Check**: Queries pokemon_cards table
- **Data**: Project endpoint identifier

### Scrydex API
- **Type**: Card Data & Expansions
- **Status Check**: Reads sync_status table
- **Data**: Last sync timestamps for cards and expansions

### TCGCSV API
- **Type**: Sealed Products & Pricing
- **Status Check**: Reads pokemon_sealed_products_sync_status
- **Data**: Products count, groups synced, sync times
- **Actions**: Trigger new syncs

### Database (PostgreSQL)
- **Type**: Local Data Storage
- **Status Check**: Count queries on all tables
- **Data**: Cards, expansions, sealed products counts

---

## Security

### Authentication
- **Route Protection**: AdminDashboard checks `isAdmin` on mount
- **Automatic Redirect**: Non-admins redirected to settings
- **No Direct Access**: Cannot access via URL if not admin

### Button Visibility
- **Settings Page**: Admin button only shown to admins
- **Clean UI**: Non-admins never see admin controls
- **Seamless UX**: No indication of admin features for regular users

---

## Navigation

### To Admin Dashboard:
1. Settings → Admin Dashboard button
2. Or direct URL: `/admin` (admin only)

### From Admin Dashboard:
1. Click back arrow in header → Settings
2. Use sidebar navigation → Any page
3. Browser back button → Previous page

---

## Responsive Design

### Desktop (1024px+)
- 2-column layout for API cards
- 4-column layout for overview stats
- Full-width sync status panel

### Tablet (768px-1023px)
- 2-column layout for API cards
- 2-column layout for overview stats

### Mobile (<768px)
- Single column layout
- Stacked cards
- Scrollable content

---

## Future Enhancements

### Planned Features:

1. **Real-time Sync Progress**
   - Live progress bar during sync
   - Websocket updates
   - Estimated time remaining

2. **Sync Logs**
   - Detailed sync history
   - Error logs
   - Success/failure statistics

3. **API Health Monitoring**
   - Response time tracking
   - Error rate monitoring
   - Uptime statistics

4. **Automated Sync Scheduling**
   - Schedule daily syncs
   - Configure sync times
   - Email notifications on failure

5. **Expansion Mapping Manager**
   - View all expansion mappings
   - Add/edit TCGCSV group IDs
   - Auto-discover new expansions

6. **Data Analytics**
   - Price trend charts
   - Product count by expansion
   - Sync performance metrics

---

## Troubleshooting

### Dashboard Won't Load
**Issue**: Blank page or redirect to settings  
**Cause**: Not logged in as admin  
**Solution**: Ensure user has `is_admin = true` in database

### API Shows "Unknown" Status
**Issue**: Status badge shows gray "Unknown"  
**Cause**: Unable to fetch status from database  
**Solution**: Check database connection and table permissions

### Sync Button Doesn't Work
**Issue**: Click sync but nothing happens  
**Cause**: Sync requires terminal command  
**Solution**: Follow the alert instructions to run sync in terminal

### No Sealed Products Count
**Issue**: Sealed products shows 0  
**Cause**: TCGCSV sync not yet run  
**Solution**: Run `node sync-tcgcsv-sealed-products.js --recent`

---

## Code Structure

### Main Component
```jsx
src/pages/AdminDashboard.jsx
- useState for API statuses and sync states
- useEffect to load all statuses on mount
- Admin authentication check
- Real-time data loading
- Sync controls
```

### Key Functions

#### `loadAllStatuses()`
Loads all API and database statuses in parallel

#### `loadDatabaseStats()`
Counts cards, expansions, and sealed products

#### `loadTcgcsvSyncStatus()`
Fetches TCGCSV sync status from database

#### `handleTcgcsvSync(mode)`
Initiates TCGCSV sync (recent or full)

#### `getStatusBadge(status)`
Returns styled badge component for status

#### `formatDate(dateString)`
Formats dates as relative time

---

## Summary

The Admin Dashboard provides:

✅ **Centralized Monitoring**: All APIs in one place  
✅ **Real-time Stats**: Live database counts  
✅ **Sync Management**: Trigger and monitor syncs  
✅ **Admin Only**: Secure, hidden from regular users  
✅ **Clean UI**: Matches app's dark theme  
✅ **Quick Access**: One click from settings  

Perfect for monitoring your Pokemon TCG app's backend systems! 🎯🔧
