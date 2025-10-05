/**
 * Test Database Insert
 * Test what columns are actually available in the database
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  console.log('🔍 Testing database insert...');
  
  // Try to insert a minimal expansion record
  const testExpansion = {
    id: 'test-' + Date.now(),
    name: 'Test Expansion',
    series: 'Test Series'
  };
  
  try {
    const { data, error } = await supabase
      .from('pokemon_expansions')
      .insert(testExpansion)
      .select();
    
    if (error) {
      console.log('❌ Insert error:', error.message);
      
      // Try with just id and name
      const minimalExpansion = {
        id: 'test2-' + Date.now(),
        name: 'Test Expansion 2'
      };
      
      const { data: data2, error: error2 } = await supabase
        .from('pokemon_expansions')
        .insert(minimalExpansion)
        .select();
      
      if (error2) {
        console.log('❌ Minimal insert error:', error2.message);
      } else {
        console.log('✅ Minimal insert successful:', data2);
        // Clean up
        await supabase.from('pokemon_expansions').delete().eq('id', minimalExpansion.id);
      }
    } else {
      console.log('✅ Insert successful:', data);
      // Clean up
      await supabase.from('pokemon_expansions').delete().eq('id', testExpansion.id);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

async function testCardInsert() {
  console.log('\n🔍 Testing card insert...');
  
  // Try to insert a minimal card record
  const testCard = {
    id: 'test-card-' + Date.now(),
    name: 'Test Card',
    images: {
      small: 'https://example.com/test.png',
      large: 'https://example.com/test-large.png'
    }
  };
  
  try {
    const { data, error } = await supabase
      .from('pokemon_cards')
      .insert(testCard)
      .select();
    
    if (error) {
      console.log('❌ Card insert error:', error.message);
    } else {
      console.log('✅ Card insert successful:', data);
      // Clean up
      await supabase.from('pokemon_cards').delete().eq('id', testCard.id);
    }
    
  } catch (error) {
    console.error('❌ Unexpected card error:', error.message);
  }
}

async function main() {
  await testInsert();
  await testCardInsert();
  console.log('\n✅ Test completed');
}

main().catch(console.error);

