import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Supabase configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://hcpubmtohdnlmcjixbnl.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjcHVibXRvaGRubG1jaml4Ym5sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQ4MjM5NiwiZXhwIjoyMDc0MDU4Mzk2fQ.7OGDbbb_EeNTfd9EuqqGGh5hxZGbuH11cVMOnVdF3Gw';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('🔄 Resuming card storage and extracting pricing...');
console.log('==================================================');

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
    
    console.log(`✅ Current status:`);
    console.log(`   - Cards: ${cardCount}`);
    console.log(`   - Expansions: ${expansionCount}`);
    console.log(`   - Pricing records: ${pricingCount}`);
    
    return { cardCount, expansionCount, pricingCount };
  } catch (error) {
    console.error('❌ Failed to check status:', error.message);
    throw error;
  }
}

async function extractPricingFromStoredCards() {
  console.log('💰 Extracting pricing data from stored cards...');
  
  try {
    // Get all cards with their variants data
    const { data: cards, error } = await supabase
      .from('pokemon_cards')
      .select('id, variants')
      .not('variants', 'is', null);
    
    if (error) {
      throw error;
    }
    
    console.log(`📋 Found ${cards.length} cards with variants data`);
    
    let pricingRecords = [];
    
    for (const card of cards) {
      if (card.variants && Array.isArray(card.variants)) {
        for (const variant of card.variants) {
          if (variant.prices && Array.isArray(variant.prices) && variant.prices.length > 0) {
            // Extract pricing data from the first price entry
            const price = variant.prices[0];
            pricingRecords.push({
              card_id: card.id,
              market_price_usd: price.market_price_usd || null,
              market_price_eur: price.market_price_eur || null,
              market_price_gbp: price.market_price_gbp || null,
              tcgplayer_price_usd: price.tcgplayer_price_usd || null,
              tcgplayer_price_eur: price.tcgplayer_price_eur || null,
              tcgplayer_price_gbp: price.tcgplayer_price_gbp || null,
              cardmarket_price_eur: price.cardmarket_price_eur || null,
              cardmarket_price_usd: price.cardmarket_price_usd || null,
              cardmarket_price_gbp: price.cardmarket_price_gbp || null,
              last_updated: new Date().toISOString(),
              created_at: new Date().toISOString()
            });
            break; // Only take the first variant with pricing
          }
        }
      }
    }
    
    console.log(`✅ Extracted ${pricingRecords.length} pricing records`);
    return pricingRecords;
  } catch (error) {
    console.error('❌ Failed to extract pricing:', error.message);
    throw error;
  }
}

async function storePricing(pricingRecords) {
  if (pricingRecords.length === 0) {
    console.log('⚠️ No pricing records to store');
    return;
  }
  
  console.log('💾 Storing pricing data...');
  
  try {
    const batchSize = 100;
    let stored = 0;
    
    for (let i = 0; i < pricingRecords.length; i += batchSize) {
      const batch = pricingRecords.slice(i, i + batchSize);
      console.log(`📄 Storing pricing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(pricingRecords.length/batchSize)}...`);
      
      const { error } = await supabase
        .from('card_prices')
        .upsert(batch, { onConflict: 'card_id' });
      
      if (error) {
        throw error;
      }
      
      stored += batch.length;
      console.log(`✅ Stored pricing for ${stored}/${pricingRecords.length} cards`);
    }
    
    console.log(`✅ Successfully stored pricing for ${pricingRecords.length} cards`);
  } catch (error) {
    console.error('❌ Failed to store pricing:', error.message);
    throw error;
  }
}

async function updateSyncStatus() {
  console.log('📊 Updating sync status...');
  
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
    await checkCurrentStatus();
    
    // Extract and store pricing data
    const pricingRecords = await extractPricingFromStoredCards();
    await storePricing(pricingRecords);
    
    // Update sync status
    await updateSyncStatus();
    
    console.log('');
    console.log('🎉 Resume and pricing extraction completed successfully!');
    
  } catch (error) {
    console.error('❌ Resume failed:', error.message);
    process.exit(1);
  }
}

main();
