/**
 * Check Database Schema
 * See what columns actually exist in the database tables
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('🔍 Checking database schema...');
  
  try {
    // Try to get the table schema information
    const { data, error } = await supabase
      .from('information_schema.columns')
      .select('table_name, column_name, data_type, is_nullable, column_default')
      .eq('table_schema', 'public')
      .in('table_name', ['pokemon_cards', 'pokemon_expansions']);
    
    if (error) {
      console.log('❌ Error querying schema:', error.message);
      
      // Alternative: try to insert a record and see what happens
      console.log('\n🔄 Trying to insert minimal records to understand schema...');
      
      // Try expansions table
      try {
        const { data: expData, error: expError } = await supabase
          .from('pokemon_expansions')
          .insert({
            id: 'test-schema',
            name: 'Test',
            series: 'Test',
            code: 'TST'
          })
          .select();
        
        if (expError) {
          console.log('❌ Expansion insert error:', expError.message);
        } else {
          console.log('✅ Expansion insert successful:', expData);
          // Clean up
          await supabase.from('pokemon_expansions').delete().eq('id', 'test-schema');
        }
      } catch (error) {
        console.log('❌ Expansion test error:', error.message);
      }
      
      // Try cards table
      try {
        const { data: cardData, error: cardError } = await supabase
          .from('pokemon_cards')
          .insert({
            id: 'test-card-schema',
            name: 'Test Card',
            expansion_id: 'test-expansion',
            images: { small: 'test.png', large: 'test-large.png' }
          })
          .select();
        
        if (cardError) {
          console.log('❌ Card insert error:', cardError.message);
        } else {
          console.log('✅ Card insert successful:', cardData);
          // Clean up
          await supabase.from('pokemon_cards').delete().eq('id', 'test-card-schema');
        }
      } catch (error) {
        console.log('❌ Card test error:', error.message);
      }
      
    } else {
      console.log('\n📊 Database Schema:');
      
      const tables = {};
      data.forEach(row => {
        if (!tables[row.table_name]) {
          tables[row.table_name] = [];
        }
        tables[row.table_name].push({
          column: row.column_name,
          type: row.data_type,
          nullable: row.is_nullable === 'YES',
          default: row.column_default
        });
      });
      
      Object.entries(tables).forEach(([tableName, columns]) => {
        console.log(`\n📋 ${tableName}:`);
        columns.forEach(col => {
          console.log(`   ${col.column}: ${col.type} ${col.nullable ? '(nullable)' : '(required)'} ${col.default ? `default: ${col.default}` : ''}`);
        });
      });
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

async function main() {
  await checkSchema();
  console.log('\n✅ Schema check completed');
}

main().catch(console.error);

