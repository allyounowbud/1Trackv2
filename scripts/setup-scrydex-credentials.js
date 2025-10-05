#!/usr/bin/env node

/**
 * Setup Scrydex API Credentials Script
 * Helps configure environment variables for Scrydex API access
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔑 Scrydex API Credentials Setup');
console.log('================================');
console.log('');

// Check if .env file exists
const envPath = path.join(process.cwd(), '.env');
const envLocalPath = path.join(process.cwd(), '.env.local');

let envContent = '';

if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
  console.log('📄 Found existing .env file');
} else if (fs.existsSync(envLocalPath)) {
  envContent = fs.readFileSync(envLocalPath, 'utf8');
  console.log('📄 Found existing .env.local file');
} else {
  console.log('📄 No .env file found, will create one');
}

// Check if credentials are already set
const hasApiKey = envContent.includes('SCRYDEX_API_KEY=');
const hasTeamId = envContent.includes('SCRYDEX_TEAM_ID=');

if (hasApiKey && hasTeamId) {
  console.log('✅ Scrydex credentials already configured');
  console.log('');
  console.log('🚀 You can now run:');
  console.log('   npm run fetch-scrydex-data');
  console.log('');
  process.exit(0);
}

console.log('📋 To get your Scrydex API credentials:');
console.log('');
console.log('1. Go to: https://scrydex.com/dashboard');
console.log('2. Sign in to your account');
console.log('3. Go to API Keys section');
console.log('4. Copy your API Key and Team ID');
console.log('');

// Create or update .env file
const newEnvContent = envContent + `
# Scrydex API Credentials
SCRYDEX_API_KEY=3afbdca9aaae128736728a33c52b734abda3278545f9406c02c9c91ab0e728a7
SCRYDEX_TEAM_ID=onetracking
`;

if (fs.existsSync(envPath)) {
  fs.writeFileSync(envPath, newEnvContent);
  console.log('✅ Updated .env file with Scrydex credentials placeholders');
} else if (fs.existsSync(envLocalPath)) {
  fs.writeFileSync(envLocalPath, newEnvContent);
  console.log('✅ Updated .env.local file with Scrydex credentials placeholders');
} else {
  fs.writeFileSync(envPath, newEnvContent);
  console.log('✅ Created .env file with Scrydex credentials placeholders');
}

console.log('');
console.log('🔧 Next steps:');
console.log('1. Edit the .env file and replace the placeholder values:');
console.log('   - Replace "your_api_key_here" with your actual API key');
console.log('   - Replace "your_team_id_here" with your actual team ID');
console.log('');
console.log('2. Run the data fetch script:');
console.log('   npm run fetch-scrydex-data');
console.log('');
console.log('💡 The script will:');
console.log('   - Fetch all Pokemon expansions from Scrydex API');
console.log('   - Fetch all Pokemon cards from Scrydex API');
console.log('   - Fetch pricing data for all cards');
console.log('   - Store everything in your Supabase database');
console.log('   - Update sync status with real data counts');
console.log('');
console.log('⚠️  Note: This may take several minutes depending on the amount of data');