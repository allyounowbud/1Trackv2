/**
 * Database Cleanup Script
 * Removes old cache tables and creates new optimized schema for Scrydex integration
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanDatabase() {
  console.log('🧹 Starting database cleanup...');
  
  try {
    // Drop old cache tables if they exist
    const tablesToDrop = [
      'api_cache',
      'pokemon_cards_cache',
      'pokemon_expansions_cache',
      'image_cache',
      'pricing_cache',
      'search_cache',
      'old_pokemon_cards',
      'old_pokemon_expansions'
    ];

    for (const table of tablesToDrop) {
      try {
        console.log(`🗑️ Dropping table: ${table}`);
        const { error } = await supabase.rpc('drop_table_if_exists', { table_name: table });
        if (error) {
          console.warn(`⚠️ Could not drop ${table}: ${error.message}`);
        } else {
          console.log(`✅ Dropped ${table}`);
        }
      } catch (err) {
        console.warn(`⚠️ Error dropping ${table}: ${err.message}`);
      }
    }

    // Create new optimized API cache table
    console.log('🏗️ Creating optimized API cache table...');
    const { error: cacheError } = await supabase.rpc('create_api_cache_table');
    if (cacheError) {
      console.error('❌ Failed to create API cache table:', cacheError);
    } else {
      console.log('✅ API cache table created');
    }

    // Create optimized Pokemon cards table
    console.log('🏗️ Creating optimized Pokemon cards table...');
    const { error: cardsError } = await supabase.rpc('create_pokemon_cards_table');
    if (cardsError) {
      console.error('❌ Failed to create Pokemon cards table:', cardsError);
    } else {
      console.log('✅ Pokemon cards table created');
    }

    // Create optimized Pokemon expansions table
    console.log('🏗️ Creating optimized Pokemon expansions table...');
    const { error: expansionsError } = await supabase.rpc('create_pokemon_expansions_table');
    if (expansionsError) {
      console.error('❌ Failed to create Pokemon expansions table:', expansionsError);
    } else {
      console.log('✅ Pokemon expansions table created');
    }

    console.log('🎉 Database cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Database cleanup failed:', error);
    process.exit(1);
  }
}

// Run cleanup
cleanDatabase();