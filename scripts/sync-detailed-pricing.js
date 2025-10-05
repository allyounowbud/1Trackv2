import https from 'https';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Configuration
const SCRYDEX_API_BASE = 'https://api.scrydex.com';
const SCRYDEX_API_KEY = process.env.SCRYDEX_API_KEY || '3afbdca9aaae128736728a33c52b734abda3278545f9406c02c9c91ab0e728a7';
const SCRYDEX_TEAM_ID = process.env.SCRYDEX_TEAM_ID || 'onetracking';

// Supabase configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://hcpubmtohdnlmcjixbnl.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjcHVibXRvaGRubG1jaml4Ym5sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQ4MjM5NiwiZXhwIjoyMDc0MDU4Mzk2fQ.7OGDbbb_EeNTfd9EuqqGGh5hxZGbuH11cVMOnVdF3Gw';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

console.log('🔄 Detailed Pricing Sync - Extracting Raw & Graded Data...');
console.log('========================================================');

// Make API request with retry logic
async function makeApiRequest(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'X-Api-Key': SCRYDEX_API_KEY,
          'X-Team-ID': SCRYDEX_TEAM_ID,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`API Error ${response.status}: ${response.statusText}`);
      }

      const jsonData = await response.json();
      return jsonData.data || jsonData;
    } catch (error) {
      console.log(`   Attempt ${attempt}/${retries} failed: ${error.message}`);
      if (attempt === retries) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

// Extract detailed pricing data from card variants
function extractDetailedPricing(card) {
  const pricingRecords = [];
  
  if (!card.variants || !Array.isArray(card.variants)) {
    return pricingRecords;
  }

  for (const variant of card.variants) {
    if (variant.prices && Array.isArray(variant.prices) && variant.prices.length > 0) {
      for (const price of variant.prices) {
        if (price.market && price.currency === 'USD') {
          const pricingRecord = {
            card_id: card.id,
            price_type: price.type,
            market: price.market,
            currency: price.currency || 'USD',
            is_perfect: price.is_perfect || false,
            is_signed: price.is_signed || false,
            is_error: price.is_error || false,
            trends: price.trends || null
          };

          if (price.type === 'raw') {
            pricingRecord.raw_condition = price.condition;
            pricingRecord.low = price.low;
          } else if (price.type === 'graded') {
            pricingRecord.grade = price.grade;
            pricingRecord.company = price.company;
            pricingRecord.low = price.low;
            pricingRecord.mid = price.mid;
            pricingRecord.high = price.high;
          }

          pricingRecords.push(pricingRecord);
        }
      }
    }
  }

  return pricingRecords;
}

// Store detailed pricing data
async function storeDetailedPricing(pricingRecords) {
  if (pricingRecords.length === 0) return;

  try {
    // Insert the new pricing records (ignore duplicates)
    const { error } = await supabase
      .from('card_prices')
      .insert(pricingRecords)
      .select();

    if (error) {
      // If it's a duplicate key error, that's okay - just log it
      if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
        console.log(`   ⚠️  Some duplicates skipped (${pricingRecords.length} records processed)`);
        return;
      }
      throw error;
    }

    console.log(`   ✅ Stored ${pricingRecords.length} pricing records`);
  } catch (error) {
    console.error(`   ❌ Error storing pricing: ${error.message}`);
    throw error;
  }
}

// Process cards in batches
async function processCardsBatch(cardIds, batchSize = 50) {
  console.log(`\n📦 Processing ${cardIds.length} cards in batches of ${batchSize}...`);
  
  let totalPricingRecords = 0;
  
  for (let i = 0; i < cardIds.length; i += batchSize) {
    const batch = cardIds.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(cardIds.length / batchSize);
    
    console.log(`\n🔄 Processing batch ${batchNumber}/${totalBatches} (${batch.length} cards)...`);
    
    try {
      // Fetch cards with pricing data
      const cardPromises = batch.map(async (cardId) => {
        const url = `${SCRYDEX_API_BASE}/pokemon/v1/cards/${cardId}?include=prices`;
        return makeApiRequest(url);
      });

      const cards = await Promise.all(cardPromises);
      
      // Extract pricing data from all cards in batch
      const allPricingRecords = [];
      for (const card of cards) {
        if (card && card.id) {
          const pricingRecords = extractDetailedPricing(card);
          allPricingRecords.push(...pricingRecords);
        }
      }

      // Store all pricing records for this batch
      if (allPricingRecords.length > 0) {
        await storeDetailedPricing(allPricingRecords);
        totalPricingRecords += allPricingRecords.length;
      }

      // Small delay between batches to be respectful to the API
      if (i + batchSize < cardIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

    } catch (error) {
      console.error(`   ❌ Error processing batch ${batchNumber}: ${error.message}`);
      // Continue with next batch instead of failing completely
    }
  }

  return totalPricingRecords;
}

// Main sync function
async function syncDetailedPricing() {
  try {
    console.log('🚀 Starting detailed pricing sync...');
    
    // Clear existing pricing data
    console.log('\n🗑️  Clearing existing pricing data...');
    const { error: deleteError } = await supabase
      .from('card_prices')
      .delete()
      .neq('id', 0); // Delete all records
    
    if (deleteError) {
      console.log(`   ⚠️  Could not clear existing data: ${deleteError.message}`);
    } else {
      console.log('   ✅ Cleared existing pricing data');
    }
    
    // Get all card IDs from the database
    console.log('\n📋 Fetching card IDs from database...');
    const { data: cards, error: cardsError } = await supabase
      .from('pokemon_cards')
      .select('id')
      .order('id');

    if (cardsError) {
      throw new Error(`Failed to fetch cards: ${cardsError.message}`);
    }

    const cardIds = cards.map(card => card.id);
    console.log(`✅ Found ${cardIds.length} cards to process`);

    // Process all cards
    const totalPricingRecords = await processCardsBatch(cardIds);

    console.log(`\n🎉 Detailed pricing sync completed!`);
    console.log(`📊 Total pricing records stored: ${totalPricingRecords}`);
    
    // Show some statistics
    const { data: rawCount } = await supabase
      .from('card_prices')
      .select('*', { count: 'exact', head: true })
      .eq('price_type', 'raw');
    
    const { data: gradedCount } = await supabase
      .from('card_prices')
      .select('*', { count: 'exact', head: true })
      .eq('price_type', 'graded');

    console.log(`📈 Raw pricing records: ${rawCount || 0}`);
    console.log(`📈 Graded pricing records: ${gradedCount || 0}`);

  } catch (error) {
    console.error('❌ Detailed pricing sync failed:', error.message);
    process.exit(1);
  }
}

// Run the sync
syncDetailedPricing();
