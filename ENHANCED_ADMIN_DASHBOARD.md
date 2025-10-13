# Enhanced Admin Dashboard Documentation

## Overview

The Enhanced Admin Dashboard provides comprehensive control over all API sync operations, real-time progress tracking, and detailed data mapping visualization.

---

## 🎯 **New Features**

### **1. Start/Stop Sync Controls**

Each API sync now has dedicated control buttons:

#### **TCGCSV Sealed Products**
- **Test Sync**: 5 groups (for testing)
- **Recent Sync**: 20 latest groups (~2-3 min)
- **Full Sync**: All 210+ groups (~5-10 min)
- **Stop Button**: Appears when sync is running

#### **Scrydex Cards Sync**
- **Start Sync**: Begin cards synchronization
- **Stop Sync**: Cancel running sync

#### **Scrydex Expansions Sync**
- **Start Sync**: Begin expansions synchronization
- **Stop Sync**: Cancel running sync

### **2. Real-Time Progress Tracking**

#### **Progress Bars**
- Animated progress bar for each sync
- Shows percentage complete (0-100%)
- Color-coded by status:
  - 🔵 Blue: Running
  - 🟢 Green: Completed
  - 🔴 Red: Error
  - ⚪ Gray: Pending

#### **Progress Messages**
- Real-time status messages
- Current operation description
- Estimated time remaining (future)

#### **Live Stats**
- Products/Cards synced
- Current group being processed
- Total items remaining

### **3. Data Mappings Visualization**

Click **"Show Data Mappings"** button to reveal:

#### **For Each API:**
- **API Name & Description**
- **Status Badge**
- **Database Tables Linked**:
  - Table name
  - Table description
  - Sync type (full/incremental/real-time/manual)
  - Key fields stored
- **API Endpoints Used**:
  - Endpoint path
  - Purpose/function

---

## 📊 **Data Mapping Details**

### **Scrydex API**

**Tables:**
1. **`pokemon_cards`**
   - Description: Individual Pokemon cards
   - Fields: id, name, supertype, types, hp, rarity, expansion_id, image_url, abilities, attacks
   - Sync Type: Incremental
   - Updates: When new cards added

2. **`pokemon_expansions`**
   - Description: Pokemon expansion sets
   - Fields: id, name, series, code, total, release_date, logo, language_code
   - Sync Type: Full
   - Updates: Daily/weekly

**Endpoints:**
- `/cards` - Card data
- `/expansions` - Expansion sets

---

### **TCGCSV API**

**Tables:**
1. **`pokemon_sealed_products`**
   - Description: Sealed products (booster boxes, ETBs, tins)
   - Fields: product_id, name, tcgcsv_group_id, market_price, low_price, high_price, image_url, expansion_id
   - Sync Type: Full replacement
   - Updates: Daily at 20:00 UTC

2. **`pokemon_expansions.tcgcsv_group_id`**
   - Description: TCGCSV group ID mapping
   - Fields: tcgcsv_group_id
   - Sync Type: Manual
   - Updates: When new expansions added

**Endpoints:**
- `/tcgplayer/3/groups` - Expansion groups (210+)
- `/tcgplayer/3/{groupId}/products` - Product data
- `/tcgplayer/3/{groupId}/prices` - Pricing data

---

### **Supabase**

**Tables:**
- All database tables
- Real-time subscriptions
- Authentication data

**Endpoints:**
- `/rest/v1/*` - REST API
- `/auth/v1/*` - Authentication
- `/realtime/v1/*` - Real-time subscriptions

---

## 🔄 **Sync Operations**

### **TCGCSV Sealed Products Sync**

#### **Test Mode** (5 groups)
```bash
# Triggered by: "Test (5 groups)" button
# Command: node sync-tcgcsv-sealed-products.js --limit=5
# Duration: ~30-60 seconds
# Products: ~50-100 sealed products
```

#### **Recent Mode** (20 groups)
```bash
# Triggered by: "Sync Recent (20)" button
# Command: node sync-tcgcsv-sealed-products.js --recent
# Duration: ~2-3 minutes
# Products: ~300-500 sealed products
```

#### **Full Mode** (all groups)
```bash
# Triggered by: "Full Sync (All)" button
# Command: node sync-tcgcsv-sealed-products.js --full
# Duration: ~5-10 minutes
# Products: ~2,000-3,000 sealed products
```

#### **Progress Updates:**
1. Initializing connection
2. Fetching groups list
3. Processing group X of Y
4. Filtering sealed products
5. Importing to database
6. Complete!

---

## 📈 **Real-Time Progress**

### **How It Works**

1. **User clicks sync button**
2. Dashboard shows progress bar
3. System polls sync status every 5 seconds
4. Progress bar updates automatically
5. Completion triggers status reload
6. Success/error message displayed

### **Progress Indicators:**

```
┌─────────────────────────────────────────────────────┐
│ TCGCSV Sealed Products                      [Running]│
├─────────────────────────────────────────────────────┤
│ Syncing group 15 of 20...                      75%  │
│ ████████████████████████░░░░░░░░                   │
├─────────────────────────────────────────────────────┤
│ Products: 350  Groups: 15  Last: 2m ago            │
├─────────────────────────────────────────────────────┤
│ [Stop Sync]                                         │
└─────────────────────────────────────────────────────┘
```

---

## 🎛️ **Control Buttons**

### **When Idle:**
- 🟢 **Start Sync** - Begin synchronization
- 🟣 **Test/Recent/Full** - Different sync modes
- 🔵 **Refresh** - Reload all statuses

### **When Running:**
- 🔴 **Stop Sync** - Cancel operation
- ⏸️ **Pause** (future) - Pause and resume
- 📊 **View Logs** (future) - See detailed logs

---

## 🗺️ **Data Mappings View**

### **Toggle Visibility:**
Click **"Show Data Mappings"** in header

### **What You See:**

```
API → Database Mappings
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─ TCGCSV API ────────────────────── [Connected] ┐
│ Sealed products and pricing from TCGplayer     │
│                                                 │
│ 📊 Database Tables (2)                         │
│ ┌─────────────────────────────────────────┐   │
│ │ pokemon_sealed_products        [full]   │   │
│ │ Sealed products (boxes, ETBs, tins)     │   │
│ │ Fields: product_id, name, price...      │   │
│ └─────────────────────────────────────────┘   │
│                                                 │
│ 🌐 API Endpoints (3)                           │
│ • /tcgplayer/3/groups → Expansion groups       │
│ • /tcgplayer/3/{id}/products → Product data    │
│ • /tcgplayer/3/{id}/prices → Pricing data      │
└─────────────────────────────────────────────────┘
```

---

## 🔐 **Security & Access**

### **Admin Detection:**
- Email-based: Checks `adminConfig.js`
- Metadata-based: Checks user metadata
- Database-based: Checks database role (if configured)

### **Auto-Redirect:**
- Non-admins redirected to settings
- No error message shown
- Seamless UX

### **Console Logging:**
- `✅ Admin access granted` - Success
- `⚠️ Admin access denied` - Redirect
- `🔍 Admin check: {...}` - Debug info

---

## 📱 **Responsive Design**

### **Desktop (>1024px)**
- 2-column sync operations
- 4-column system overview
- Full data mappings visible

### **Tablet (768-1023px)**
- 2-column layouts
- Stacked sync cards
- Scrollable content

### **Mobile (<768px)**
- Single column
- Touch-optimized buttons
- Bottom navigation active

---

## 🎨 **Visual Design**

### **Color Scheme:**
- **Purple**: TCGCSV operations
- **Blue**: Scrydex operations
- **Indigo**: System/database
- **Green**: Success states
- **Red**: Errors/stop actions
- **Yellow**: Warnings/pending

### **Components:**
- **Progress Bars**: Animated, color-coded
- **Status Badges**: Icon + text
- **Sync Cards**: Bordered, hoverable
- **Data Mappings**: Collapsible panels

---

## 🔧 **Technical Implementation**

### **AdminSyncService** (`src/services/adminSyncService.js`)

**Features:**
- Progress listener system
- Active sync tracking
- Data mappings configuration
- Sync statistics aggregation

**Methods:**
```javascript
adminSyncService.startTcgcsvSync(mode)
adminSyncService.startScrydexCardsSync()
adminSyncService.startScrydexExpansionsSync()
adminSyncService.stopSync(syncId)
adminSyncService.getApiDataMappings()
adminSyncService.isSyncActive(syncId)
adminSyncService.emitProgress(syncId, progress)
```

### **Real-Time Updates**

```javascript
// Auto-refresh every 5 seconds when syncs are active
useEffect(() => {
  const interval = setInterval(() => {
    if (hasActiveSyncs) {
      loadAllStatuses();
    }
  }, 5000);
  return () => clearInterval(interval);
}, [activeSyncs]);
```

---

## 🚀 **Usage Guide**

### **Starting a Sync:**

1. **Navigate to Admin Dashboard**
   - Settings → Admin Dashboard button

2. **Choose Sync Operation**
   - TCGCSV: Test/Recent/Full
   - Scrydex Cards: Start Sync
   - Scrydex Expansions: Start Sync

3. **Click Start Button**
   - Progress bar appears
   - Real-time updates begin
   - Stats refresh every 5 seconds

4. **Monitor Progress**
   - Watch progress bar advance
   - View current status message
   - Check updated counts

5. **Wait for Completion**
   - Progress reaches 100%
   - Status changes to "Completed"
   - Final stats displayed

### **Stopping a Sync:**

1. **Click "Stop Sync" button** (red)
2. Current operation cancelled
3. Progress bar resets
4. Status returns to idle

### **Viewing Data Mappings:**

1. **Click "Show Data Mappings"** in header
2. Purple panel expands
3. See all API → Table relationships
4. View fields and endpoints
5. Click **"Hide Data Mappings"** to collapse

---

## 📊 **Dashboard Sections**

### **1. Header**
```
← Back | Admin Dashboard | [Show Data Mappings] [Refresh]
```

### **2. Setup Alert** (if needed)
```
⚠️ Setup Required
Follow these steps to complete TCGCSV setup...
```

### **3. Data Mappings** (toggleable)
```
🔗 API → Database Mappings
├─ Scrydex API
│  ├─ Tables: pokemon_cards, pokemon_expansions
│  └─ Endpoints: /cards, /expansions
├─ TCGCSV API
│  ├─ Tables: pokemon_sealed_products
│  └─ Endpoints: /tcgplayer/3/*
└─ Supabase
   └─ All tables (real-time)
```

### **4. System Overview**
```
┌────────┬────────┬────────┬────────┐
│ Cards  │ Expan  │ Sealed │ APIs   │
│ 12,543 │ 127    │ 2,450  │ 3      │
└────────┴────────┴────────┴────────┘
```

### **5. Sync Operations**
```
━━━ TCGCSV Sealed Products ━━━━━━━━━━━━━━━━
Syncing... 45% ████████████░░░░░░░░░░░░░░
Products: 150  Groups: 9  Last: Just now
[Test] [Sync Recent] [Full Sync]

━━━ Scrydex Cards Sync ━━━━━━━━━━━━━━━━━━━
Products: 12,543  Last: 2 days ago
[Start Sync]

━━━ Scrydex Expansions Sync ━━━━━━━━━━━━━━
Expansions: 127  Last: 2 days ago
[Start Sync]
```

### **6. API Status Summary**
```
┌─ Supabase ─────┬─ PostgreSQL ───┐
│ Endpoint: xyz  │ Cards: 12,543  │
│ Connection: ✓  │ Sealed: 2,450  │
└────────────────┴────────────────┘
```

---

## ⚡ **Quick Reference**

| Action | Button | Result |
|--------|--------|--------|
| Start TCGCSV test sync | Test (5 groups) | Syncs 5 expansions |
| Start TCGCSV recent sync | Sync Recent (20) | Syncs 20 latest |
| Start TCGCSV full sync | Full Sync (All) | Syncs all 210+ |
| Start Scrydex cards | Start Sync | Syncs all cards |
| Start Scrydex expansions | Start Sync | Syncs all expansions |
| Stop any sync | Stop Sync | Cancels operation |
| View data mappings | Show Data Mappings | Shows API links |
| Refresh all data | Refresh | Reloads all stats |

---

## 🎯 **Benefits**

✅ **Centralized Control**: All syncs in one place  
✅ **Real-Time Monitoring**: See progress as it happens  
✅ **Data Transparency**: Understand API → DB relationships  
✅ **Easy Management**: Start/stop with one click  
✅ **Visual Feedback**: Progress bars and status badges  
✅ **Auto-Refresh**: Stats update during active syncs  
✅ **Error Handling**: Clear error messages  
✅ **Setup Guidance**: Yellow alerts for missing setup  

---

## 🔮 **Future Enhancements**

### **Planned Features:**

1. **Sync Logs Viewer**
   - Detailed sync history
   - Error logs
   - Performance metrics

2. **Pause/Resume**
   - Pause long-running syncs
   - Resume from last point

3. **Scheduled Syncs**
   - Set up cron-like schedules
   - Email notifications
   - Auto-retry on failure

4. **Performance Charts**
   - Sync duration trends
   - Product count over time
   - API response times

5. **Webhook Integration**
   - Trigger syncs from external sources
   - Post-sync webhooks
   - Status updates via API

---

## 💡 **Tips**

### **Best Practices:**

1. **Test First**: Always run test mode (5 groups) before full sync
2. **Monitor Progress**: Watch progress bars for errors
3. **Check Mappings**: Use data mappings to understand structure
4. **Regular Syncs**: Run TCGCSV sync daily after 20:00 UTC
5. **Stop Gracefully**: Use stop button, don't refresh page

### **Troubleshooting:**

**Sync won't start:**
- Check if another sync is running
- Verify API status is connected
- Check console for errors

**Progress bar stuck:**
- Refresh the dashboard
- Check terminal for sync script output
- Verify network connectivity

**Data not updating:**
- Click "Refresh" button
- Check sync status table in database
- Verify sync completed successfully

---

## 📝 **Console Logs**

### **Useful Log Messages:**

```javascript
// Admin access
✅ Admin access granted

// Sync operations
🚀 Starting TCGCSV sync (recent)...
📦 [24380] ME01: Mega Evolution
   ├─ Total products: 225
   ├─ Sealed products: 32
   └─ ✅ Imported 32 products

// Progress updates
📊 Sync progress: 45%
⏱️ Estimated time: 2min 15sec
✅ Sync complete!
```

---

## 🎉 **Summary**

The Enhanced Admin Dashboard provides:

- 🎛️ **Complete Control**: Start/stop all syncs
- 📊 **Real-Time Progress**: Live progress bars
- 🗺️ **Data Visualization**: API → Table mappings
- 🔍 **Transparency**: Know exactly what's happening
- ⚡ **Fast Updates**: Auto-refresh every 5 seconds
- 🎨 **Professional UI**: Clean, modern design

Your admin dashboard is now a **powerful management interface**! 🚀
