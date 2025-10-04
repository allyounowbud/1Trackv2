#!/usr/bin/env node

/**
 * Fetch Real Scrydex API Data Script
 * Fetches all Pokemon expansions, cards, and pricing data from Scrydex API
 * and stores it in Supabase database
 */

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

if (!SCRYDEX_API_KEY || !SCRYDEX_TEAM_ID) {
  console.error('❌ Missing Scrydex API credentials!');
  console.error('Please set SCRYDEX_API_KEY and SCRYDEX_TEAM_ID environment variables');
  process.exit(1);
}

if (!SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials!');
  console.error('Please set VITE_SUPABASE_ANON_KEY environment variable');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('🎮 Fetching Real Scrydex Pokemon Data...');
console.log('==========================================');
console.log(`🔑 API Key: ${SCRYDEX_API_KEY.substring(0, 8)}...`);
console.log(`👥 Team ID: ${SCRYDEX_TEAM_ID}`);
console.log(`🗄️ Supabase URL: ${SUPABASE_URL}`);
console.log('');

// Helper function to make API requests
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
            // Handle the response structure - data is in jsonData.data
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

// Fetch all Pokemon expansions
async function fetchExpansions() {
  console.log('🔄 Fetching ALL Pokemon expansions...');
  
  try {
    let allExpansions = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      console.log(`📄 Fetching expansions page ${page}...`);
      const response = await makeApiRequest('/pokemon/v1/expansions', {
        page: page,
        limit: 100
      });
      
      if (response && response.length > 0) {
        allExpansions = allExpansions.concat(response);
        page++;
        console.log(`✅ Page ${page - 1}: ${response.length} expansions (Total: ${allExpansions.length})`);
      } else {
        hasMore = false;
      }
      
      // Add a small delay to be respectful to the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`✅ Found ${allExpansions.length} total expansions`);
    return allExpansions;
  } catch (error) {
    console.error('❌ Failed to fetch expansions:', error.message);
    return [];
  }
}

// Fetch all Pokemon cards with maximum batch size to save API credits
async function fetchCards() {
  console.log('🔄 Fetching ALL Pokemon cards with LARGE batches to save API credits...');
  
  try {
    let allCards = [];
    let page = 1;
    let hasMore = true;
    const BATCH_SIZE = 250; // Request 250, but API max is 100
    
    while (hasMore) {
      console.log(`📄 Fetching cards page ${page} (requesting: ${BATCH_SIZE})...`);
      const response = await makeApiRequest('/pokemon/v1/en/cards', {
        page: page,
        limit: BATCH_SIZE,
        include: 'prices'
      });
      
      if (response && response.length > 0) {
        allCards = allCards.concat(response);
        console.log(`✅ Page ${page}: ${response.length} cards (Total: ${allCards.length})`);
        page++;
        
        // Keep going until we get 0 results (don't stop based on batch size)
      } else {
        hasMore = false;
        console.log(`🏁 Reached end of data (empty response on page ${page})`);
      }
      
      // Add a small delay to be respectful to the API
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log(`✅ Found ${allCards.length} total cards`);
    return allCards;
  } catch (error) {
    console.error('❌ Failed to fetch cards:', error.message);
    throw error;
  }
}


// Store expansions in database
async function storeExpansions(expansions) {
  console.log('💾 Storing expansions in database...');
  
  try {
    const batchSize = 100;
    let stored = 0;
    
    for (let i = 0; i < expansions.length; i += batchSize) {
      const batch = expansions.slice(i, i + batchSize);
      console.log(`📄 Storing expansions batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(expansions.length/batchSize)}...`);
      
      const { error } = await supabase
        .from('pokemon_expansions')
        .upsert(batch.map(exp => ({
          id: exp.id,
          name: exp.name,
          series: exp.series,
          code: exp.code,
          total: exp.total,
          printed_total: exp.printed_total,
          language: exp.language_code || 'en',
          language_code: exp.language_code || 'en',
          release_date: exp.release_date,
          is_online_only: exp.is_online_only || false,
          logo_url: exp.logo,
          symbol_url: exp.symbol,
          translation: exp.translation,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })), { onConflict: 'id' });
      
      if (error) {
        throw error;
      }
      
      stored += batch.length;
      console.log(`✅ Stored ${stored}/${expansions.length} expansions`);
    }
    
    console.log(`✅ Successfully stored ${expansions.length} expansions`);
  } catch (error) {
    console.error('❌ Failed to store expansions:', error.message);
    throw error;
  }
}

// Store cards in database and extract pricing data
async function storeCards(cards) {
  console.log('💾 Storing cards in database...');
  
  try {
    const batchSize = 100;
    let stored = 0;
    let pricingRecords = [];
    
    for (let i = 0; i < cards.length; i += batchSize) {
      const batch = cards.slice(i, i + batchSize);
      console.log(`📄 Storing cards batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(cards.length/batchSize)}...`);
      
      // Prepare card data for storage
      const cardData = batch.map(card => ({
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
      }));
      
      // Store cards
      const { error } = await supabase
        .from('pokemon_cards')
        .upsert(cardData, { onConflict: 'id' });
      
      if (error) {
        throw error;
      }
      
      // Extract pricing data from variants
      for (const card of batch) {
        if (card.variants && Array.isArray(card.variants)) {
          for (const variant of card.variants) {
            if (variant.prices && Array.isArray(variant.prices) && variant.prices.length > 0) {
              // Find the best market price from all pricing entries
              let bestRawPrice = null;
              let bestGradedPrice = null;
              
              for (const price of variant.prices) {
                if (price.market && price.currency === 'USD') {
                  if (price.type === 'raw') {
                    // For raw cards, prefer NM condition or take the first available
                    if (!bestRawPrice || price.condition === 'NM') {
                      bestRawPrice = price;
                    }
                  } else if (price.type === 'graded') {
                    // For graded cards, prefer PSA 10 or take the highest grade
                    if (!bestGradedPrice || 
                        (price.company === 'PSA' && price.grade === '10') ||
                        (price.company === 'PSA' && parseInt(price.grade) > parseInt(bestGradedPrice.grade || '0'))) {
                      bestGradedPrice = price;
                    }
                  }
                }
              }
              
              // Store the best available price (prefer raw, fallback to graded)
              const bestPrice = bestRawPrice || bestGradedPrice;
              if (bestPrice) {
                pricingRecords.push({
                  card_id: card.id,
                  price_type: bestPrice.type, // 'raw' or 'graded'
                  market_price_usd: bestPrice.market,
                  low: bestPrice.low || null,
                  mid: bestPrice.mid || null,
                  high: bestPrice.high || null,
                  grade: bestPrice.grade || null,
                  company: bestPrice.company || null,
                  condition: bestPrice.condition || null,
                  is_perfect: bestPrice.is_perfect || false,
                  is_signed: bestPrice.is_signed || false,
                  is_error: bestPrice.is_error || false,
                  trends: bestPrice.trends || null
                });
                break; // Only take the first variant with pricing
              }
            }
          }
        }
      }
      
      stored += batch.length;
      console.log(`✅ Stored ${stored}/${cards.length} cards (${pricingRecords.length} pricing records extracted)`);
    }
    
    console.log(`✅ Successfully stored ${cards.length} cards`);
    console.log(`💰 Extracted ${pricingRecords.length} pricing records`);
    
    return pricingRecords;
  } catch (error) {
    console.error('❌ Failed to store cards:', error.message);
    throw error;
  }
}

// Store pricing in database
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
      
      const { error} = await supabase
        .from('card_prices')
        .insert(batch.map(price => ({
          card_id: price.card_id,
          price_type: price.price_type,
          raw_condition: price.condition || null,
          grade: price.grade || null,
          company: price.company || null,
          low: price.low || null,
          mid: price.mid || null,
          high: price.high || null,
          market: price.market_price_usd,
          currency: 'USD',
          is_perfect: price.is_perfect || false,
          is_signed: price.is_signed || false,
          is_error: price.is_error || false,
          trends: price.trends || null
        })));
      
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

// Update sync status
async function updateSyncStatus(totalCards, totalExpansions) {
  console.log('📊 Updating sync status...');
  
  try {
    const { error } = await supabase
      .from('sync_status')
      .upsert({
        id: 1,
        total_cards: totalCards,
        total_expansions: totalExpansions,
        last_full_sync: new Date().toISOString(),
        last_pricing_sync: new Date().toISOString(),
        sync_in_progress: false,
        last_error: null,
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

// Main execution
async function main() {
  try {
    console.log('🚀 Starting Scrydex data fetch...');
    console.log('');
    
    // Set sync in progress
    await supabase
      .from('sync_status')
      .upsert({
        id: 1,
        sync_in_progress: true,
        last_error: null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    
    // Fetch and store expansions
    const expansions = await fetchExpansions();
    await storeExpansions(expansions);
    console.log('');
    
    // Fetch and store cards (extracts pricing data during storage)
    const cards = await fetchCards();
    const pricing = await storeCards(cards);
    console.log('');
    
    // Store the extracted pricing data
    await storePricing(pricing);
    console.log('');
    
    // Update sync status
    await updateSyncStatus(cards.length, expansions.length);
    console.log('');
    
    console.log('🎉 Scrydex data fetch completed successfully!');
    console.log(`📊 Final Stats:`);
    console.log(`   - ${expansions.length} expansions`);
    console.log(`   - ${cards.length} cards`);
    console.log(`   - ${pricing.length} cards with pricing`);
    console.log('');
    console.log('✅ Your Pokemon app now has real Scrydex data!');
    
  } catch (error) {
    console.error('❌ Scrydex data fetch failed:', error.message);
    
    // Update sync status with error
    await supabase
      .from('sync_status')
      .upsert({
        id: 1,
        sync_in_progress: false,
        last_error: error.message,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    
    process.exit(1);
  }
}

// Run the script
main();
