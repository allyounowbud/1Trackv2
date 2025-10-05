/**
 * Test Supabase Connection
 * Quick test to verify database connection and table structure
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('🔍 Testing Supabase connection...');
  console.log(`📡 URL: ${supabaseUrl}`);
  
  try {
    // Test basic connection
    const { data, error } = await supabase
      .from('pokemon_cards')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.log('❌ Error connecting to pokemon_cards table:', error.message);
      
      // Check if table exists
      console.log('🔍 Checking if tables exist...');
      
      // Try to create a simple query to test connection
      const { data: testData, error: testError } = await supabase
        .from('pokemon_expansions')
        .select('count', { count: 'exact', head: true });
      
      if (testError) {
        console.log('❌ Tables may not exist yet. Please run the SQL from create-optimized-tables.sql in your Supabase dashboard.');
        console.log('📁 SQL file location: create-optimized-tables.sql');
        return false;
      }
      
      console.log('✅ Connection successful, but pokemon_cards table needs to be created');
      return false;
    }
    
    console.log(`✅ Connection successful!`);
    console.log(`📊 Current card count: ${data || 0}`);
    return true;
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    return false;
  }
}

async function checkTables() {
  console.log('\n🔍 Checking required tables...');
  
  const tables = ['pokemon_cards', 'pokemon_expansions', 'api_cache', 'image_cache', 'pricing_cache'];
  const results = {};
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('count', { count: 'exact', head: true });
      
      if (error) {
        results[table] = { exists: false, error: error.message };
      } else {
        results[table] = { exists: true, count: data || 0 };
      }
    } catch (error) {
      results[table] = { exists: false, error: error.message };
    }
  }
  
  console.log('\n📊 Table Status:');
  for (const [table, result] of Object.entries(results)) {
    if (result.exists) {
      console.log(`   ✅ ${table}: ${result.count} records`);
    } else {
      console.log(`   ❌ ${table}: ${result.error}`);
    }
  }
  
  return results;
}

async function main() {
  console.log('🚀 Supabase Connection Test\n');
  
  const connected = await testConnection();
  const tableResults = await checkTables();
  
  const allTablesExist = Object.values(tableResults).every(result => result.exists);
  
  console.log('\n📋 Summary:');
  console.log(`   🔗 Connection: ${connected ? '✅ Working' : '❌ Failed'}`);
  console.log(`   📊 Tables: ${allTablesExist ? '✅ All exist' : '❌ Some missing'}`);
  
  if (!allTablesExist) {
    console.log('\n🔧 Next Steps:');
    console.log('   1. Go to your Supabase Dashboard → SQL Editor');
    console.log('   2. Copy the contents of create-optimized-tables.sql');
    console.log('   3. Paste and run the SQL to create the required tables');
    console.log('   4. Then run: npm run import-scrydex');
  } else {
    console.log('\n🎉 Ready to import! Run: npm run import-scrydex');
  }
}

main().catch(console.error);

