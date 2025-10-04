import https from 'https';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const SCRYDEX_API_BASE = 'https://api.scrydex.com';
const SCRYDEX_API_KEY = process.env.SCRYDEX_API_KEY || '3afbdca9aaae128736728a33c52b734abda3278545f9406c02c9c91ab0e728a7';
const SCRYDEX_TEAM_ID = process.env.SCRYDEX_TEAM_ID || 'onetracking';

// Supabase configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://hcpubmtohdnlmcjixbnl.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjcHVibXRvaGRubG1jaml4Ym5sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQ4MjM5NiwiZXhwIjoyMDc0MDU4Mzk2fQ.7OGDbbb_EeNTfd9EuqqGGh5hxZGbuH11cVMOnVdF3Gw';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('🔄 Robust Scrydex Sync - Handling Network Issues...');
console.log('==================================================');

async function makeApiRequest(endpoint, params = {}) {
  return new Promise((resolve, reject) => {
    const queryString = new URLSearchParams(params).toString();
    const url = `${SCRYDEX_API_BASE}${endpoint}${queryString ? '?' + queryString : ''}`;
    
    const options = {
      headers: {
        'X-Api-Key': SCRYDEX_API_KEY,
        'X-Team-ID': SCRYDEX_TEAM_ID,
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    };

    const req = https.get(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          if (data.trim() === '') {
            reject(new Error(`Empty response from API`));
            return;
          }
          
          const jsonData = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(jsonData.data || jsonData);
          } else {
            reject(new Error(`API Error ${res.statusCode}: ${jsonData.message || data}`));
          }
        } catch (error) {
          reject(new Error(`JSON Parse Error: ${error.message}. Response: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function getCurrentCardCount() {
  try {
    const { count, error } = await supabase
      .from('pokemon_cards')
      .select('*', { count: 'exact', head: true });
    
    if (error) throw error;
    return count;
  } catch (error) {
    console.error('❌ Failed to get current card count:', error.message);
    return 0;
  }
}

async function fetchAndStoreCardsBatch(startPage, batchSize = 50) {
  console.log(`📄 Fetching cards batch starting from page ${startPage}...`);
  
  try {
    const cards = [];
    let currentPage = startPage;
    let hasMore = true;
    let batchCount = 0;
    
    while (hasMore && batchCount < batchSize) {
      console.log(`   📡 Fetching page ${currentPage}...`);
      
      try {
        const response = await makeApiRequest('/pokemon/v1/en/cards', {
          page: currentPage,
          limit: 100,
          include: 'prices'
        });
        
        if (response && response.length > 0) {
          cards.push(...response);
          currentPage++;
          batchCount++;
          console.log(`   ✅ Page ${currentPage - 1}: ${response.length} cards (Batch total: ${cards.length})`);
        } else {
          hasMore = false;
        }
        
        // Add delay between requests
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (pageError) {
        console.warn(`   ⚠️ Failed to fetch page ${currentPage}:`, pageError.message);
        // Try next page
        currentPage++;
        batchCount++;
        if (batchCount >= batchSize) {
          break;
        }
      }
    }
    
    if (cards.length === 0) {
      console.log('   ⚠️ No cards fetched in this batch');
      return { success: false, cards: [], nextPage: currentPage };
    }
    
    // Store cards with pricing extraction
    const pricingRecords = [];
    const cardData = cards.map(card => {
      // Extract pricing data from variants
      if (card.variants && Array.isArray(card.variants)) {
        for (const variant of card.variants) {
          if (variant.prices && Array.isArray(variant.prices) && variant.prices.length > 0) {
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
      
      return {
        id: card.id,
        name: card.name,
        supertype: card.supertype,
        types: card.types || [],
        subtypes: card.subtypes || [],
        hp: card.hp,
        number: card.number,
        rarity: card.rarity,
        expansion_id: card.expansion?.id || card.expansion_id,
        expansion_name: card.expansion?.name || card.expansion_name,
        image_url: card.images?.[0]?.small || card.images?.[0]?.medium || card.image_url || card.image,
        image_url_large: card.images?.[0]?.large || card.images?.[0]?.medium || card.image_url_large || card.image_large,
        abilities: card.abilities,
        attacks: card.attacks,
        weaknesses: card.weaknesses,
        resistances: card.resistances,
        retreat_cost: card.retreat_cost || [],
        converted_retreat_cost: card.converted_retreat_cost,
        artist: card.artist,
        flavor_text: card.flavor_text,
        regulation_mark: card.regulation_mark,
        language: card.language_code || 'en',
        language_code: card.language_code || 'en',
        national_pokedex_numbers: card.national_pokedex_numbers || [],
        legalities: card.legalities,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });
    
    // Store cards
    const { error: cardError } = await supabase
      .from('pokemon_cards')
      .upsert(cardData, { onConflict: 'id' });
    
    if (cardError) {
      throw new Error(`Failed to store cards: ${cardError.message}`);
    }
    
    // Store pricing
    if (pricingRecords.length > 0) {
      const { error: pricingError } = await supabase
        .from('card_prices')
        .upsert(pricingRecords, { onConflict: 'card_id' });
      
      if (pricingError) {
        console.warn('⚠️ Failed to store pricing:', pricingError.message);
      } else {
        console.log(`   💰 Stored ${pricingRecords.length} pricing records`);
      }
    }
    
    console.log(`   ✅ Successfully stored ${cards.length} cards`);
    return { success: true, cards: cards.length, pricing: pricingRecords.length, nextPage: currentPage };
    
  } catch (error) {
    console.error(`   ❌ Batch failed:`, error.message);
    return { success: false, error: error.message, nextPage: startPage + 1 };
  }
}

async function main() {
  try {
    console.log('🚀 Starting robust sync...');
    
    const currentCount = await getCurrentCardCount();
    console.log(`📊 Current cards in database: ${currentCount}`);
    
    if (currentCount >= 21438) {
      console.log('✅ All cards already synced!');
      return;
    }
    
    const totalNeeded = 21438;
    const remaining = totalNeeded - currentCount;
    console.log(`📋 Need to sync ${remaining} more cards`);
    
    // Start from where we left off (roughly)
    let startPage = Math.floor(currentCount / 100) + 1;
    let totalProcessed = 0;
    let totalPricing = 0;
    let batchNumber = 1;
    
    while (totalProcessed < remaining) {
      console.log(`\n🔄 Processing batch ${batchNumber}...`);
      
      const result = await fetchAndStoreCardsBatch(startPage, 10); // Smaller batches
      
      if (result.success) {
        totalProcessed += result.cards;
        totalPricing += result.pricing;
        startPage = result.nextPage;
        console.log(`✅ Batch ${batchNumber} completed: ${result.cards} cards, ${result.pricing} pricing records`);
        console.log(`📊 Progress: ${totalProcessed}/${remaining} cards processed`);
      } else {
        console.log(`⚠️ Batch ${batchNumber} failed: ${result.error}`);
        startPage = result.nextPage;
      }
      
      batchNumber++;
      
      // Add delay between batches
      console.log('⏳ Waiting 2 seconds before next batch...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Safety check
      if (batchNumber > 50) {
        console.log('⚠️ Reached maximum batch limit, stopping for safety');
        break;
      }
    }
    
    console.log('\n🎉 Robust sync completed!');
    console.log(`📊 Final stats:`);
    console.log(`   - Cards processed: ${totalProcessed}`);
    console.log(`   - Pricing records: ${totalPricing}`);
    
    // Update sync status
    const finalCount = await getCurrentCardCount();
    await supabase
      .from('sync_status')
      .upsert({
        id: 1,
        last_full_sync: new Date().toISOString(),
        total_cards: finalCount,
        sync_in_progress: false,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    
    console.log(`✅ Final card count: ${finalCount}`);
    
  } catch (error) {
    console.error('❌ Robust sync failed:', error.message);
    process.exit(1);
  }
}

main();
