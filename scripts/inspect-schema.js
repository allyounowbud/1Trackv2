/**
 * Inspect Database Schema
 * Check what columns exist in the database tables
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectTable(tableName) {
  try {
    console.log(`\n🔍 Inspecting table: ${tableName}`);
    
    // Try to get one record to see the structure
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error) {
      console.log(`❌ Error: ${error.message}`);
      return;
    }
    
    if (data && data.length > 0) {
      console.log(`📊 Columns found:`, Object.keys(data[0]));
    } else {
      console.log(`📊 Table is empty, trying to insert a test record...`);
      
      // Try to insert a minimal record to see what columns are required
      const testRecord = {
        id: 'test-' + Date.now(),
        name: 'Test Record',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { data: insertData, error: insertError } = await supabase
        .from(tableName)
        .insert(testRecord)
        .select();
      
      if (insertError) {
        console.log(`❌ Insert error: ${insertError.message}`);
      } else {
        console.log(`✅ Test record inserted successfully`);
        console.log(`📊 Columns in test record:`, Object.keys(insertData[0]));
        
        // Clean up the test record
        await supabase
          .from(tableName)
          .delete()
          .eq('id', testRecord.id);
      }
    }
    
  } catch (error) {
    console.error(`❌ Error inspecting ${tableName}:`, error.message);
  }
}

async function main() {
  console.log('🔍 Database Schema Inspection\n');
  
  const tables = ['pokemon_cards', 'pokemon_expansions', 'api_cache', 'image_cache', 'pricing_cache'];
  
  for (const table of tables) {
    await inspectTable(table);
  }
  
  console.log('\n✅ Schema inspection completed');
}

main().catch(console.error);

