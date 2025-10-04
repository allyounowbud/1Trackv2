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

console.log('💰 Fetching Pokemon Card Pricing Data...');
console.log('==========================================');
console.log(`🔑 API Key: ${SCRYDEX_API_KEY.substring(0, 8)}...`);
console.log(`👥 Team ID: ${SCRYDEX_TEAM_ID}`);
console.log(`🗄️ Supabase URL: ${SUPABASE_URL}`);
console.log('');

async function makeApiRequest(endpoint, params = {}) {
  return new Promise((resolve, reject) => {
    const queryString = new URLSearchParams(params).toString();
    const url = `${SCRYDEX_API_BASE}${endpoint}${queryString ? '?' + queryString : ''}`;
    
    console.log(`📡 API Request: ${url}`);
    
    const options = {
      headers: {
        'X-Api-Key': SCRYDEX_API_KEY,
        'X-Team-ID': SCRYDEX_TEAM_ID,
        'Content-Type': 'application/json'
      }
    };

    https.get(url, options, (res) => {
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
    }).on('error', (error) => {
      reject(error);
    });
  });
}

async function getCardIds() {
  console.log('🔄 Getting card IDs from database...');
  
  try {
    const { data: cards, error } = await supabase
      .from('pokemon_cards')
      .select('id')
      .limit(1000); // Start with first 1000 cards
    
    if (error) {
      throw error;
    }
    
    console.log(`✅ Found ${cards.length} cards in database`);
    return cards.map(card => card.id);
  } catch (error) {
    console.error('❌ Failed to get card IDs:', error.message);
    throw error;
  }
}

async function fetchPricing(cardIds) {
  console.log('🔄 Fetching pricing data for cards...');
  
  try {
    let allPricing = [];
    const batchSize = 50; // Process in smaller batches
    
    for (let i = 0; i < cardIds.length; i += batchSize) {
      const batch = cardIds.slice(i, i + batchSize);
      console.log(`📄 Fetching pricing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(cardIds.length/batchSize)} (${batch.length} cards)...`);
      
      try {
        const pricing = await makeApiRequest('/pokemon/v1/en/prices', {
          select: 'card_id,market_price_usd,market_price_eur,market_price_gbp,tcgplayer_price_usd,tcgplayer_price_eur,tcgplayer_price_gbp,cardmarket_price_eur,cardmarket_price_usd,cardmarket_price_gbp',
          card_id: `in.(${batch.join(',')})`
        });
        
        if (pricing && pricing.length > 0) {
          allPricing = allPricing.concat(pricing);
          console.log(`✅ Found pricing for ${pricing.length} cards in this batch`);
        } else {
          console.log(`⚠️ No pricing found for this batch`);
        }
        
        // Add a small delay between batches
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (batchError) {
        console.warn(`⚠️ Failed to fetch pricing for batch ${Math.floor(i/batchSize) + 1}:`, batchError.message);
        // Continue with next batch
      }
    }
    
    console.log(`✅ Found pricing for ${allPricing.length} total cards`);
    return allPricing;
  } catch (error) {
    console.error('❌ Failed to fetch pricing:', error.message);
    return [];
  }
}

async function storePricing(pricing) {
  if (pricing.length === 0) {
    console.log('⚠️ No pricing data to store');
    return;
  }
  
  console.log('💾 Storing pricing data...');
  
  try {
    const batchSize = 100;
    let stored = 0;
    
    for (let i = 0; i < pricing.length; i += batchSize) {
      const batch = pricing.slice(i, i + batchSize);
      console.log(`📄 Storing pricing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(pricing.length/batchSize)}...`);
      
      const { error } = await supabase
        .from('card_prices')
        .upsert(batch.map(price => ({
          card_id: price.card_id,
          market_price_usd: price.market_price_usd,
          market_price_eur: price.market_price_eur,
          market_price_gbp: price.market_price_gbp,
          tcgplayer_price_usd: price.tcgplayer_price_usd,
          tcgplayer_price_eur: price.tcgplayer_price_eur,
          tcgplayer_price_gbp: price.tcgplayer_price_gbp,
          cardmarket_price_eur: price.cardmarket_price_eur,
          cardmarket_price_usd: price.cardmarket_price_usd,
          cardmarket_price_gbp: price.cardmarket_price_gbp,
          last_updated: new Date().toISOString(),
          created_at: new Date().toISOString()
        })), { onConflict: 'card_id' });
      
      if (error) {
        throw error;
      }
      
      stored += batch.length;
      console.log(`✅ Stored pricing for ${stored}/${pricing.length} cards`);
    }
    
    console.log(`✅ Successfully stored pricing for ${pricing.length} cards`);
  } catch (error) {
    console.error('❌ Failed to store pricing:', error.message);
    throw error;
  }
}

async function updateSyncStatus() {
  console.log('📊 Updating sync status...');
  
  try {
    const { error } = await supabase
      .from('sync_status')
      .upsert({
        id: 1,
        last_pricing_sync: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    
    if (error) {
      throw error;
    }
    
    console.log('✅ Sync status updated');
  } catch (error) {
    console.error('❌ Failed to update sync status:', error.message);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Starting pricing data fetch...');
    
    // Get card IDs from database
    const cardIds = await getCardIds();
    
    if (cardIds.length === 0) {
      console.log('⚠️ No cards found in database. Run the main sync first.');
      return;
    }
    
    // Fetch pricing data
    const pricing = await fetchPricing(cardIds);
    
    // Store pricing data
    await storePricing(pricing);
    
    // Update sync status
    await updateSyncStatus();
    
    console.log('');
    console.log('🎉 Pricing data fetch completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Cards processed: ${cardIds.length}`);
    console.log(`   - Pricing records found: ${pricing.length}`);
    
  } catch (error) {
    console.error('❌ Pricing data fetch failed:', error.message);
    process.exit(1);
  }
}

main();
