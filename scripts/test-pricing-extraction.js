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

console.log('🔍 Testing Pricing Data Extraction...');
console.log('=====================================');

// Make API request
async function makeApiRequest(url) {
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
    console.error(`API Error: ${error.message}`);
    throw error;
  }
}

// Extract detailed pricing data from card variants
function extractDetailedPricing(card) {
  const pricingRecords = [];
  
  console.log(`\n📄 Processing card: ${card.name} (${card.id})`);
  
  if (!card.variants || !Array.isArray(card.variants)) {
    console.log('   ❌ No variants found');
    return pricingRecords;
  }

  console.log(`   📦 Found ${card.variants.length} variants`);

  for (const variant of card.variants) {
    if (variant.prices && Array.isArray(variant.prices) && variant.prices.length > 0) {
      console.log(`   💰 Variant "${variant.name}" has ${variant.prices.length} prices`);
      
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
            console.log(`     🔸 Raw: $${price.market} (${price.condition})`);
          } else if (price.type === 'graded') {
            pricingRecord.grade = price.grade;
            pricingRecord.company = price.company;
            pricingRecord.low = price.low;
            pricingRecord.mid = price.mid;
            pricingRecord.high = price.high;
            console.log(`     🔹 Graded: $${price.market} (${price.company} ${price.grade})`);
          }

          pricingRecords.push(pricingRecord);
        }
      }
    }
  }

  console.log(`   ✅ Extracted ${pricingRecords.length} pricing records`);
  return pricingRecords;
}

// Test with a specific card
async function testPricingExtraction() {
  try {
    console.log('🚀 Testing pricing extraction...');
    
    // Test with a known card that should have pricing
    const cardId = 'base1-4'; // Charizard
    const url = `${SCRYDEX_API_BASE}/pokemon/v1/cards/${cardId}?include=prices`;
    
    console.log(`\n📡 Fetching card: ${cardId}`);
    const card = await makeApiRequest(url);
    
    if (!card) {
      console.log('❌ No card data received');
      return;
    }
    
    console.log(`✅ Card received: ${card.name}`);
    
    // Extract pricing data
    const pricingRecords = extractDetailedPricing(card);
    
    if (pricingRecords.length === 0) {
      console.log('❌ No pricing records extracted');
      return;
    }
    
    console.log(`\n📊 Extracted ${pricingRecords.length} pricing records:`);
    pricingRecords.forEach((record, index) => {
      console.log(`\n   Record ${index + 1}:`);
      console.log(`     Type: ${record.price_type}`);
      console.log(`     Market: $${record.market}`);
      if (record.raw_condition) {
        console.log(`     Condition: ${record.raw_condition}`);
      }
      if (record.grade && record.company) {
        console.log(`     Grade: ${record.company} ${record.grade}`);
      }
      console.log(`     Low: $${record.low}`);
      if (record.mid) console.log(`     Mid: $${record.mid}`);
      if (record.high) console.log(`     High: $${record.high}`);
    });
    
    // Test storing one record
    console.log('\n💾 Testing database storage...');
    const { error } = await supabase
      .from('card_prices')
      .insert([pricingRecords[0]]);
    
    if (error) {
      console.log(`❌ Storage error: ${error.message}`);
    } else {
      console.log('✅ Successfully stored pricing record');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testPricingExtraction();