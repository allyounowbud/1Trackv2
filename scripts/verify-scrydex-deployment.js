/**
 * Deployment Verification Script for Scrydex Integration
 * Checks if the Supabase functions are properly deployed
 */

import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env file if it exists
import { config } from 'dotenv';
config();

async function verifyScrydexDeployment() {
  console.log('🔍 Verifying Scrydex Integration Deployment...\n');

  // Check if required environment variables are set
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing required environment variables:');
    console.error('   VITE_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
    console.error('   VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Set' : '❌ Missing');
    console.error('\nPlease create a .env file with these variables.');
    return;
  }

  console.log('✅ Environment variables loaded');

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // Test 1: Check if scrydex-proxy function is accessible
    console.log('1️⃣ Testing scrydex-proxy function...');
    const proxyResponse = await fetch(`${supabaseUrl}/functions/v1/scrydex-proxy/api-usage`, {
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (proxyResponse.ok) {
      console.log('✅ scrydex-proxy function is accessible');
    } else {
      console.log(`⚠️ scrydex-proxy function returned status: ${proxyResponse.status}`);
      const errorText = await proxyResponse.text();
      console.log(`   Error: ${errorText}`);
    }

    // Test 2: Check if scrydex-sync function is accessible
    console.log('\n2️⃣ Testing scrydex-sync function...');
    const syncResponse = await fetch(`${supabaseUrl}/functions/v1/scrydex-sync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (syncResponse.ok) {
      console.log('✅ scrydex-sync function is accessible');
    } else {
      console.log(`⚠️ scrydex-sync function returned status: ${syncResponse.status}`);
      const errorText = await syncResponse.text();
      console.log(`   Error: ${errorText}`);
    }

    // Test 3: Check database connection
    console.log('\n3️⃣ Testing database connection...');
    const { data, error } = await supabase
      .from('scrydex_expansions')
      .select('count')
      .limit(1);

    if (error) {
      console.log(`⚠️ Database connection issue: ${error.message}`);
      console.log('   This might be expected if tables don\'t exist yet');
    } else {
      console.log('✅ Database connection successful');
    }

    console.log('\n🎉 Deployment verification complete!');
    console.log('\nNext steps:');
    console.log('1. Set your Scrydex API key as a Supabase secret:');
    console.log('   supabase secrets set SCRYDEX_API_KEY=your_key_here');
    console.log('   supabase secrets set SCRYDEX_TEAM_ID=onetracking');
    console.log('\n2. Deploy the functions if not already deployed:');
    console.log('   supabase functions deploy scrydex-proxy');
    console.log('   supabase functions deploy scrydex-sync');
    console.log('\n3. Test the integration in your browser application');

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}

// Run the verification
verifyScrydexDeployment();

