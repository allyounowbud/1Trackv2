/**
 * Pricing Update Script
 * Updates pricing data for cards from Scrydex API
 * This script should be run frequently (daily/hourly) to keep prices current
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env.local first, then .env
dotenv.config({ path: '.env.local' });
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const BATCH_SIZE = 50; // Smaller batches for price updates
const DELAY_BETWEEN_BATCHES = 500; // Shorter delay for price updates

/**
 * Make request to Scrydex API via your proxy
 */
async function makeScrydexRequest(endpoint, params = {}) {
  try {
    const proxyUrl = `${supabaseUrl}/functions/v1/scrydex-proxy${endpoint}`;
    const url = new URL(proxyUrl);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'OneTrack/2.2.0'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Scrydex API proxy error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`❌ Error fetching ${endpoint}:`, error.message);
    throw error;
  }
}

/**
 * Update pricing for a batch of cards
 */
async function updatePricingBatch(cardIds) {
  try {
    // Get card details with pricing from Scrydex
    const result = await makeScrydexRequest('/pokemon/v1/en/cards', {
      q: cardIds.map(id => `id:${id}`).join(' OR '),
      page_size: BATCH_SIZE,
      select: 'id,prices',
      include: 'prices'
    });
    
    const cards = result.data || [];
    
    if (cards.length === 0) {
      return 0;
    }
    
    // Prepare pricing updates
    const updates = cards.map(card => ({
      id: card.id,
      market_value: card.prices?.market || null,
      raw_prices: card.prices?.raw || null,
      graded_prices: card.prices?.graded || null,
      price_updated_at: card.prices ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
      last_synced: new Date().toISOString()
    }));
    
    // Update cards in database
    const { error } = await supabase
      .from('pokemon_cards')
      .upsert(updates, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      });
    
    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    
    console.log(`✅ Updated pricing for ${updates.length} cards`);
    return updates.length;
    
  } catch (error) {
    console.error(`❌ Error updating pricing batch:`, error.message);
    return 0;
  }
}

/**
 * Update pricing for all cards or a subset
 */
async function updateAllPricing(limit = null) {
  console.log('\n💰 Starting pricing update...');
  
  try {
    // Get cards that need pricing updates
    let query = supabase
      .from('pokemon_cards')
      .select('id, price_updated_at')
      .order('price_updated_at', { ascending: true, nullsFirst: true });
    
    if (limit) {
      query = query.limit(limit);
    }
    
    const { data: cards, error } = await query;
    
    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    
    if (!cards || cards.length === 0) {
      console.log('📊 No cards found for pricing update');
      return;
    }
    
    console.log(`📊 Found ${cards.length} cards for pricing update`);
    
    // Process cards in batches
    let totalUpdated = 0;
    let totalErrors = 0;
    
    for (let i = 0; i < cards.length; i += BATCH_SIZE) {
      const batch = cards.slice(i, i + BATCH_SIZE);
      const cardIds = batch.map(card => card.id);
      
      try {
        console.log(`📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(cards.length / BATCH_SIZE)}`);
        
        const updated = await updatePricingBatch(cardIds);
        totalUpdated += updated;
        
        // Add delay between batches
        if (i + BATCH_SIZE < cards.length) {
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
        }
        
      } catch (error) {
        console.error(`❌ Batch error:`, error.message);
        totalErrors++;
      }
    }
    
    console.log(`\n✅ Pricing update completed:`);
    console.log(`   💰 Cards updated: ${totalUpdated}`);
    console.log(`   ❌ Batches with errors: ${totalErrors}`);
    
  } catch (error) {
    console.error('❌ Error updating pricing:', error.message);
    throw error;
  }
}

/**
 * Update pricing for specific expansions
 */
async function updatePricingForExpansions(expansionIds) {
  console.log('\n💰 Starting pricing update for specific expansions...');
  
  try {
    // Get cards from specified expansions
    const { data: cards, error } = await supabase
      .from('pokemon_cards')
      .select('id, expansion_name')
      .in('expansion_id', expansionIds);
    
    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    
    if (!cards || cards.length === 0) {
      console.log('📊 No cards found for specified expansions');
      return;
    }
    
    console.log(`📊 Found ${cards.length} cards for pricing update`);
    
    // Process cards in batches
    let totalUpdated = 0;
    
    for (let i = 0; i < cards.length; i += BATCH_SIZE) {
      const batch = cards.slice(i, i + BATCH_SIZE);
      const cardIds = batch.map(card => card.id);
      
      try {
        console.log(`📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(cards.length / BATCH_SIZE)}`);
        
        const updated = await updatePricingBatch(cardIds);
        totalUpdated += updated;
        
        // Add delay between batches
        if (i + BATCH_SIZE < cards.length) {
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
        }
        
      } catch (error) {
        console.error(`❌ Batch error:`, error.message);
      }
    }
    
    console.log(`\n✅ Pricing update completed for expansions:`);
    console.log(`   💰 Cards updated: ${totalUpdated}`);
    
  } catch (error) {
    console.error('❌ Error updating pricing for expansions:', error.message);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting pricing update...');
  console.log(`📅 Started at: ${new Date().toISOString()}`);
  
  const startTime = Date.now();
  
  try {
    // Check command line arguments
    const args = process.argv.slice(2);
    
    if (args.includes('--expansions')) {
      // Update pricing for specific expansions
      const expansionIndex = args.indexOf('--expansions');
      const expansionIds = args[expansionIndex + 1]?.split(',') || [];
      
      if (expansionIds.length === 0) {
        console.error('❌ Please specify expansion IDs: --expansions sv1,sv2,sv3');
        process.exit(1);
      }
      
      await updatePricingForExpansions(expansionIds);
    } else {
      // Update pricing for all cards (or limit if specified)
      const limitArg = args.find(arg => arg.startsWith('--limit='));
      const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;
      
      await updateAllPricing(limit);
    }
    
    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`\n🎉 Pricing update completed in ${duration} seconds!`);
    
  } catch (error) {
    console.error('\n❌ Pricing update failed:', error.message);
    process.exit(1);
  }
}

// Run the update if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export { updateAllPricing, updatePricingForExpansions };
