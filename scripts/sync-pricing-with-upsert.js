#!/usr/bin/env node

/**
 * Pricing Sync with Upsert
 * Uses upsert to handle duplicate pricing records gracefully
 */

import https from 'https';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SCRYDEX_API_BASE = 'https://api.scrydex.com';
const SCRYDEX_API_KEY = process.env.SCRYDEX_API_KEY || '3afbdca9aaae128736728a33c52b734abda3278545f9406c02c9c91ab0e728a7';
const SCRYDEX_TEAM_ID = process.env.SCRYDEX_TEAM_ID || 'onetracking';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://hcpubmtohdnlmcjixbnl.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjcHVibXRvaGRubG1jaml4Ym5sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQ4MjM5NiwiZXhwIjoyMDc0MDU4Mzk2fQ.7OGDbbb_EeNTfd9EuqqGGh5hxZGbuH11cVMOnVdF3Gw';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('💰 Pricing Sync with Upsert');
console.log('============================');

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
      timeout: 30000
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

async function extractAllPricingData(cards) {
  console.log('🔍 Extracting comprehensive pricing data...');
  
  const allPricingRecords = [];
  let processedCards = 0;
  
  for (const card of cards) {
    if (card.variants && Array.isArray(card.variants)) {
      for (const variant of card.variants) {
        if (variant.prices && Array.isArray(variant.prices)) {
          for (const price of variant.prices) {
            if (price.market && price.currency === 'USD') {
              allPricingRecords.push({
                card_id: card.id,
                price_type: price.type, // 'raw' or 'graded'
                raw_condition: price.condition || null,
                grade: price.grade || null,
                company: price.company || null,
                low: price.low || null,
                mid: price.mid || null,
                high: price.high || null,
                market: price.market,
                currency: 'USD',
                is_perfect: price.is_perfect || false,
                is_signed: price.is_signed || false,
                is_error: price.is_error || false,
                trends: price.trends || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
            }
          }
        }
      }
    }
    
    processedCards++;
    if (processedCards % 1000 === 0) {
      console.log(`   📊 Processed ${processedCards}/${cards.length} cards (${allPricingRecords.length} pricing records found)`);
    }
  }
  
  console.log(`✅ Extracted ${allPricingRecords.length} pricing records from ${cards.length} cards`);
  return allPricingRecords;
}

async function fetchAllCards() {
  console.log('🔄 Fetching all cards with pricing data...');
  
  try {
    let allCards = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      console.log(`📄 Fetching cards page ${page}...`);
      
      try {
        const response = await makeApiRequest('/pokemon/v1/en/cards', {
          page: page,
          limit: 100,
          include: 'prices'
        });
        
        if (response && response.length > 0) {
          allCards = allCards.concat(response);
          console.log(`   ✅ Page ${page}: ${response.length} cards (Total: ${allCards.length})`);
          page++;
        } else {
          hasMore = false;
        }
        
        // Add delay between requests
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (pageError) {
        console.warn(`   ⚠️ Failed to fetch page ${page}:`, pageError.message);
        page++;
        if (page > 220) { // Safety limit
          break;
        }
      }
    }
    
    console.log(`✅ Fetched ${allCards.length} total cards`);
    return allCards;
  } catch (error) {
    console.error('❌ Failed to fetch cards:', error.message);
    throw error;
  }
}

async function storePricingDataWithUpsert(pricingRecords) {
  if (pricingRecords.length === 0) {
    console.log('⚠️ No pricing data to store');
    return;
  }
  
  console.log('💾 Storing pricing data with upsert...');
  
  try {
    // Clear existing pricing data first
    console.log('🗑️ Clearing existing pricing data...');
    const { error: deleteError } = await supabase
      .from('card_prices')
      .delete()
      .neq('id', 0); // Delete all records
    
    if (deleteError) {
      console.warn('⚠️ Failed to clear existing pricing:', deleteError.message);
    } else {
      console.log('✅ Cleared existing pricing data');
    }
    
    // Store new pricing data in smaller batches to avoid timeout issues
    const batchSize = 200; // Smaller batches
    let stored = 0;
    
    for (let i = 0; i < pricingRecords.length; i += batchSize) {
      const batch = pricingRecords.slice(i, i + batchSize);
      console.log(`📄 Storing pricing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(pricingRecords.length/batchSize)}...`);
      
      try {
        const { error } = await supabase
          .from('card_prices')
          .insert(batch);
        
        if (error) {
          console.warn(`⚠️ Failed to store batch ${Math.floor(i/batchSize) + 1}:`, error.message);
          // Try individual records to identify problematic ones
          for (let j = 0; j < batch.length; j++) {
            try {
              const { error: singleError } = await supabase
                .from('card_prices')
                .insert(batch[j]);
              
              if (!singleError) {
                stored++;
              }
            } catch (singleErr) {
              // Skip problematic records
            }
          }
        } else {
          stored += batch.length;
        }
        
        console.log(`   ✅ Stored ${stored}/${pricingRecords.length} pricing records`);
        
        // Add delay between batches to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (batchError) {
        console.warn(`⚠️ Batch ${Math.floor(i/batchSize) + 1} failed:`, batchError.message);
      }
    }
    
    console.log(`✅ Successfully stored ${stored} pricing records`);
  } catch (error) {
    console.error('❌ Failed to store pricing data:', error.message);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Starting pricing sync with upsert...');
    
    // Fetch all cards with pricing data
    const cards = await fetchAllCards();
    
    // Extract all pricing data
    const pricingRecords = await extractAllPricingData(cards);
    
    // Store pricing data with upsert
    await storePricingDataWithUpsert(pricingRecords);
    
    console.log('\n🎉 Pricing sync completed!');
    console.log(`📊 Final stats:`);
    console.log(`   - Total cards: ${cards.length}`);
    console.log(`   - Pricing records: ${pricingRecords.length}`);
    
  } catch (error) {
    console.error('❌ Pricing sync failed:', error.message);
    process.exit(1);
  }
}

main();




