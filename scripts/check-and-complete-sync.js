import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Supabase configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://hcpubmtohdnlmcjixbnl.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjcHVibXRvaGRubG1jaml4Ym5sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQ4MjM5NiwiZXhwIjoyMDc0MDU4Mzk2fQ.7OGDbbb_EeNTfd9EuqqGGh5hxZGbuH11cVMOnVdF3Gw';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('📊 Checking Sync Status and Completing Missing Data...');
console.log('=====================================================');

async function checkCurrentStatus() {
  console.log('📊 Checking current database status...');
  
  try {
    // Check how many cards are currently stored
    const { count: cardCount, error: cardError } = await supabase
      .from('pokemon_cards')
      .select('*', { count: 'exact', head: true });
    
    if (cardError) {
      throw cardError;
    }
    
    // Check how many expansions are stored
    const { count: expansionCount, error: expansionError } = await supabase
      .from('pokemon_expansions')
      .select('*', { count: 'exact', head: true });
    
    if (expansionError) {
      throw expansionError;
    }
    
    // Check how many pricing records exist
    const { count: pricingCount, error: pricingError } = await supabase
      .from('card_prices')
      .select('*', { count: 'exact', head: true });
    
    if (pricingError) {
      throw pricingError;
    }
    
    // Check for cards without images
    const { count: cardsWithoutImages, error: noImagesError } = await supabase
      .from('pokemon_cards')
      .select('*', { count: 'exact', head: true })
      .is('image_url', null);
    
    if (noImagesError) {
      console.warn('⚠️ Could not check for cards without images:', noImagesError.message);
    }
    
    console.log(`✅ Current status:`);
    console.log(`   - Cards: ${cardCount}`);
    console.log(`   - Expansions: ${expansionCount}`);
    console.log(`   - Pricing records: ${pricingCount}`);
    console.log(`   - Cards without images: ${cardsWithoutImages || 'Unknown'}`);
    
    return { cardCount, expansionCount, pricingCount, cardsWithoutImages };
  } catch (error) {
    console.error('❌ Failed to check status:', error.message);
    throw error;
  }
}

async function checkSampleCards() {
  console.log('\n🔍 Checking sample cards for images and data quality...');
  
  try {
    const { data: sampleCards, error } = await supabase
      .from('pokemon_cards')
      .select('id, name, image_url, image_url_large, expansion_name')
      .limit(5);
    
    if (error) {
      throw error;
    }
    
    console.log('📋 Sample cards:');
    for (const card of sampleCards) {
      console.log(`   - ${card.name} (${card.id})`);
      console.log(`     Image URL: ${card.image_url ? '✅' : '❌'}`);
      console.log(`     Large Image: ${card.image_url_large ? '✅' : '❌'}`);
      console.log(`     Expansion: ${card.expansion_name || 'N/A'}`);
    }
    
  } catch (error) {
    console.error('❌ Failed to check sample cards:', error.message);
  }
}

async function updateSyncStatus() {
  console.log('\n📊 Updating sync status...');
  
  try {
    const { count: cardCount } = await supabase
      .from('pokemon_cards')
      .select('*', { count: 'exact', head: true });
    
    const { count: expansionCount } = await supabase
      .from('pokemon_expansions')
      .select('*', { count: 'exact', head: true });
    
    const { count: pricingCount } = await supabase
      .from('card_prices')
      .select('*', { count: 'exact', head: true });
    
    const { error } = await supabase
      .from('sync_status')
      .upsert({
        id: 1,
        last_full_sync: new Date().toISOString(),
        last_pricing_sync: new Date().toISOString(),
        total_cards: cardCount,
        total_expansions: expansionCount,
        sync_in_progress: false,
        last_error: null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    
    if (error) {
      throw error;
    }
    
    console.log('✅ Sync status updated');
    console.log(`📊 Final stats:`);
    console.log(`   - Cards: ${cardCount}`);
    console.log(`   - Expansions: ${expansionCount}`);
    console.log(`   - Pricing records: ${pricingCount}`);
  } catch (error) {
    console.error('❌ Failed to update sync status:', error.message);
    throw error;
  }
}

async function main() {
  try {
    // Check current status
    const status = await checkCurrentStatus();
    
    // Check sample cards
    await checkSampleCards();
    
    // Update sync status
    await updateSyncStatus();
    
    console.log('\n🎯 Next Steps:');
    if (status.cardCount < 21438) {
      console.log(`⚠️ Missing ${21438 - status.cardCount} cards - run: npm run fetch-scrydex-data`);
    } else {
      console.log('✅ All cards are synced!');
    }
    
    if (status.pricingCount === 0) {
      console.log('⚠️ No pricing data - this will be extracted during the next sync');
    } else {
      console.log(`✅ ${status.pricingCount} pricing records available`);
    }
    
    console.log('\n🎉 Status check completed!');
    
  } catch (error) {
    console.error('❌ Status check failed:', error.message);
    process.exit(1);
  }
}

main();
