/**
 * Simple Data Import
 * Import sample data that matches the actual database schema
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function importSampleData() {
  console.log('🚀 Starting simple data import...');
  
  try {
    // Step 1: Import sample expansions
    console.log('\n📦 Importing sample expansions...');
    
    const sampleExpansions = [
      {
        id: 'base',
        name: 'Base Set',
        series: 'Base',
        code: 'BS',
        total: 102,
        printed_total: 102,
        language: 'en',
        release_date: '1999-01-09',
        logo: 'https://images.pokemontcg.io/base/logo.png',
        symbol: 'https://images.pokemontcg.io/base/symbol.png'
      },
      {
        id: 'jungle',
        name: 'Jungle',
        series: 'Base',
        code: 'JU',
        total: 64,
        printed_total: 64,
        language: 'en',
        release_date: '1999-06-16',
        logo: 'https://images.pokemontcg.io/jungle/logo.png',
        symbol: 'https://images.pokemontcg.io/jungle/symbol.png'
      },
      {
        id: 'swsh1',
        name: 'Sword & Shield',
        series: 'Sword & Shield',
        code: 'SSH',
        total: 202,
        printed_total: 202,
        language: 'en',
        release_date: '2020-02-07',
        logo: 'https://images.pokemontcg.io/swsh1/logo.png',
        symbol: 'https://images.pokemontcg.io/swsh1/symbol.png'
      }
    ];
    
    const { error: expError } = await supabase
      .from('pokemon_expansions')
      .upsert(sampleExpansions, { onConflict: 'id' });
    
    if (expError) {
      throw new Error(`Expansion error: ${expError.message}`);
    }
    
    console.log(`✅ Imported ${sampleExpansions.length} expansions`);
    
    // Step 2: Import sample cards
    console.log('\n🃏 Importing sample cards...');
    
    const sampleCards = [];
    
    sampleExpansions.forEach((expansion, expansionIndex) => {
      // Create 10 sample cards per expansion
      for (let i = 1; i <= 10; i++) {
        sampleCards.push({
          id: `${expansion.id}-${i}`,
          name: `Sample Pokemon ${i}`,
          expansion_id: expansion.id,
          expansion_name: expansion.name,
          images: {
            small: `https://images.pokemontcg.io/${expansion.id}/${i}.png`,
            large: `https://images.pokemontcg.io/${expansion.id}/${i}_hires.png`
          },
          number: i.toString().padStart(3, '0'),
          rarity: ['Common', 'Uncommon', 'Rare', 'Holo Rare'][i % 4],
          expansion_code: expansion.code,
          series: expansion.series,
          language: 'en',
          market_value: Math.random() * 100,
          supertype: 'Pokémon',
          subtypes: ['Basic'],
          types: ['Grass', 'Fire', 'Water', 'Lightning'][i % 4]
        });
      }
    });
    
    const { error: cardError } = await supabase
      .from('pokemon_cards')
      .upsert(sampleCards, { onConflict: 'id' });
    
    if (cardError) {
      throw new Error(`Card error: ${cardError.message}`);
    }
    
    console.log(`✅ Imported ${sampleCards.length} cards`);
    
    // Step 3: Verify the data
    console.log('\n🔍 Verifying imported data...');
    
    const { data: expansionCount } = await supabase
      .from('pokemon_expansions')
      .select('count', { count: 'exact', head: true });
    
    const { data: cardCount } = await supabase
      .from('pokemon_cards')
      .select('count', { count: 'exact', head: true });
    
    console.log(`📊 Final counts:`);
    console.log(`   📦 Expansions: ${expansionCount || 0}`);
    console.log(`   🃏 Cards: ${cardCount || 0}`);
    
    console.log('\n🎉 Import completed successfully!');
    console.log('\n💡 Your app should now be much faster with local data!');
    console.log('   Try searching for cards in your app now.');
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    process.exit(1);
  }
}

async function main() {
  await importSampleData();
}

main().catch(console.error);

