# OneTrack v2 - Supabase Configuration Guide

## 🎯 Overview
This guide will help you set up your new Supabase v2 project with a clean, comprehensive database schema designed specifically for order book management.

## 📋 Prerequisites
- New Supabase project created (named "v2")
- New Netlify project created (named "v2")
- Access to both project dashboards

## 🗄️ Database Schema

### Core Tables

#### 1. **marketplaces**
- Stores marketplace information and fee structures
- Pre-populated with common marketplaces (eBay, TCGPlayer, CardMarket, etc.)
- Tracks fee percentages and fixed fees

#### 2. **items**
- Stores all items (both API-sourced and manually added)
- Tracks market values from multiple sources
- Supports both API integration and manual entry
- Includes image URLs and metadata

#### 3. **orders** (Order Book)
- Comprehensive order tracking with buy/sell data
- Automatic financial calculations (profit/loss, percentages)
- Supports partial sales and multiple marketplace transactions
- Tracks fees and location data

#### 4. **user_preferences**
- User-specific settings and preferences
- Currency, date format, default marketplace settings
- Market value update preferences

### Key Features

#### ✅ **Flexible Item Management**
- Add items from API search results
- Manually add items with custom market values
- Edit market values for any item
- Support for custom product images

#### ✅ **Comprehensive Order Book**
- Track buy date, price, quantity, location
- Track sell date, price, quantity, location
- Automatic fee calculation based on marketplace
- Profit/loss calculations with percentages

#### ✅ **Marketplace Fee Management**
- Configurable fee percentages per marketplace
- Fixed fee support
- Automatic fee calculation on sales

#### ✅ **Financial Tracking**
- Total cost calculation
- Revenue tracking
- Net profit calculation
- Profit percentage calculation
- Collection value tracking

## 🚀 Setup Instructions

### Step 1: Create Supabase v2 Project
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Name it "v2" or "OneTrack-v2"
4. Choose your organization and region
5. Set a strong database password
6. Wait for project creation to complete

### Step 2: Run Database Schema
1. Go to your new v2 project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase-v2-schema.sql`
4. Paste and run the SQL script
5. Verify all tables, functions, and policies are created

### Step 3: Configure Authentication
1. Go to **Authentication** → **Settings**
2. Configure your site URL: `http://localhost:5173` (for development)
3. Add redirect URLs:
   - `http://localhost:5173/auth/callback`
   - `https://your-netlify-site.netlify.app/auth/callback`
4. Set up Discord OAuth (if desired)

### Step 4: Update Environment Variables
Create a new `.env.local` file with your v2 project credentials:

```env
# Supabase v2 Configuration
VITE_SUPABASE_URL="https://your-v2-project-id.supabase.co"
VITE_SUPABASE_ANON_KEY="your-v2-anon-key"

# API Keys (same as before)
VITE_RAPIDAPI_KEY="your-rapidapi-key"
VITE_PRICECHARTING_API_KEY="your-pricecharting-key"

# App Configuration
VITE_USE_MOCK_DATA="false"
```

### Step 5: Test the Setup
1. Start your development server: `npm run dev`
2. Test item creation (both API and manual)
3. Test order book functionality
4. Verify marketplace fee calculations

## 📊 Database Views

The schema includes several useful views:

- **current_inventory**: Shows all unsold items with current market values
- **sold_items**: Shows all sold items with profit/loss data
- **collection_summary**: Provides collection statistics and totals

## 🔒 Security Features

- Row Level Security (RLS) enabled on all tables
- User-specific data isolation
- Secure API key management
- Marketplace data is read-only for users

## 🎨 Key Benefits of v2 Schema

1. **Clean Architecture**: No legacy tables or conflicting data
2. **Comprehensive Tracking**: Full buy/sell lifecycle management
3. **Flexible Item Management**: Support for both API and manual items
4. **Automatic Calculations**: Financial data computed automatically
5. **Marketplace Integration**: Built-in fee management
6. **Performance Optimized**: Proper indexing and efficient queries

## 🔄 Migration from v1

If you need to migrate data from v1:
1. Export relevant data from v1 tables
2. Transform data to match v2 schema
3. Import using the new table structure
4. Verify data integrity

## 📝 Next Steps

After setting up the database:
1. Update your app configuration to use v2 Supabase
2. Test all functionality with the new schema
3. Deploy to your v2 Netlify project
4. Update any external integrations

This clean v2 schema provides a solid foundation for comprehensive order book management with room for future enhancements!
