#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://hcpubmtohdnlmcjixbnl.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjcHVibXRvaGRubG1jaml4Ym5sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQ4MjM5NiwiZXhwIjoyMDc0MDU4Mzk2fQ.7OGDbbb_EeNTfd9EuqqGGh5hxZGbuH11cVMOnVdF3Gw'
);

async function analyzePricing() {
  try {
    console.log('🔍 Analyzing pricing data...');
    
    // Get sample pricing data
    const { data: samplePrices } = await supabase
      .from('card_prices')
      .select('*')
      .limit(5);
    
    console.log('📊 Sample pricing records:');
    samplePrices?.forEach((price, i) => {
      console.log(`   ${i + 1}. Card: ${price.card_id}, Type: ${price.price_type}, Market: $${price.market}`);
    });
    
    // Get pricing breakdown by type
    const { data: priceBreakdown } = await supabase
      .from('card_prices')
      .select('price_type')
      .then(result => {
        const breakdown = {};
        result.data?.forEach(price => {
          breakdown[price.price_type] = (breakdown[price.price_type] || 0) + 1;
        });
        return { data: breakdown };
      });
    
    console.log('\n📈 Pricing breakdown:');
    Object.entries(priceBreakdown || {}).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} cards`);
    });
    
    // Check for cards without pricing
    const { data: cardsWithoutPricing } = await supabase
      .from('pokemon_cards')
      .select('id, name')
      .not('id', 'in', `(select card_id from card_prices)`)
      .limit(5);
    
    console.log('\n❌ Sample cards without pricing:');
    cardsWithoutPricing?.forEach((card, i) => {
      console.log(`   ${i + 1}. ${card.name} (${card.id})`);
    });
    
    // Get total counts
    const { count: totalCards } = await supabase
      .from('pokemon_cards')
      .select('*', { count: 'exact', head: true });
    
    const { count: totalPrices } = await supabase
      .from('card_prices')
      .select('*', { count: 'exact', head: true });
    
    console.log('\n📊 Summary:');
    console.log(`   Total cards: ${totalCards}`);
    console.log(`   Cards with pricing: ${totalPrices}`);
    console.log(`   Coverage: ${((totalPrices / totalCards) * 100).toFixed(1)}%`);
    
  } catch (error) {
    console.error('❌ Error analyzing pricing:', error.message);
  }
}

analyzePricing();




