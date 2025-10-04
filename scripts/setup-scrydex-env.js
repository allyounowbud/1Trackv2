#!/usr/bin/env node

/**
 * Scrydex Environment Setup Script
 * 
 * This script helps you set up the required environment variables for Scrydex integration.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Scrydex Environment Setup\n');

console.log('📋 Required Environment Variables:');
console.log('   SCRYDEX_API_KEY=your_api_key_from_scrydex_dashboard');
console.log('   SCRYDEX_TEAM_ID=your_team_id_from_scrydex_dashboard\n');

console.log('🎯 How to get your credentials:');
console.log('   1. Go to https://scrydex.com/register');
console.log('   2. Create an account and subscribe to a plan');
console.log('   3. Create a team in the Scrydex Account Hub');
console.log('   4. Generate an API key from the dashboard');
console.log('   5. Note your Team ID and API Key\n');

console.log('⚙️  How to set environment variables in Supabase:');
console.log('   1. Open your Supabase Dashboard');
console.log('   2. Go to Settings → Edge Functions');
console.log('   3. Click "Environment Variables"');
console.log('   4. Add these variables:');
console.log('      - SCRYDEX_API_KEY: your_actual_api_key');
console.log('      - SCRYDEX_TEAM_ID: your_actual_team_id\n');

console.log('🔒 Security Notes:');
console.log('   ✅ API keys are stored securely in Supabase environment variables');
console.log('   ✅ Frontend never has direct access to API keys');
console.log('   ✅ All API calls go through our secure backend proxy');
console.log('   ✅ Never expose API keys in client-side code\n');

console.log('🚀 After setting environment variables:');
console.log('   1. Deploy the Scrydex functions: npm run deploy:scrydex');
console.log('   2. Test the integration in the Settings page');
console.log('   3. Try searching for cards and expansions\n');

console.log('✨ Your Scrydex integration will be ready to go!');

// Create a sample .env file for local development (optional)
const envSample = `# Scrydex API Configuration
# Get these values from your Scrydex dashboard: https://scrydex.com/register

# Your Scrydex API Key (keep this secure!)
SCRYDEX_API_KEY=your_api_key_here

# Your Scrydex Team ID
SCRYDEX_TEAM_ID=your_team_id_here

# Note: These are for local development only
# In production, set these in your Supabase Edge Functions environment variables
`;

const envSamplePath = path.join(__dirname, '..', '.env.scrydex.sample');
fs.writeFileSync(envSamplePath, envSample);

console.log(`\n📁 Created sample environment file: ${envSamplePath}`);
console.log('   (This is just for reference - use Supabase environment variables for production)');

