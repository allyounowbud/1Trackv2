#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://hcpubmtohdnlmcjixbnl.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjcHVibXRvaGRubG1jaml4Ym5sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQ4MjM5NiwiZXhwIjoyMDc0MDU4Mzk2fQ.7OGDbbb_EeNTfd9EuqqGGh5hxZGbuH11cVMOnVdF3Gw'
);

async function checkCounts() {
  try {
    console.log('🔍 Checking database counts...');
    
    const { count: cardCount } = await supabase
      .from('pokemon_cards')
      .select('*', { count: 'exact', head: true });
    
    const { count: expansionCount } = await supabase
      .from('pokemon_expansions')
      .select('*', { count: 'exact', head: true });
    
    const { count: priceCount } = await supabase
      .from('card_prices')
      .select('*', { count: 'exact', head: true });
    
    console.log('📊 Database Status:');
    console.log(`   Cards: ${cardCount || 0}`);
    console.log(`   Expansions: ${expansionCount || 0}`);
    console.log(`   Prices: ${priceCount || 0}`);
    
    if (cardCount >= 21000) {
      console.log('✅ Sync appears to be complete!');
    } else {
      console.log('⚠️ Sync may be incomplete');
    }
    
  } catch (error) {
    console.error('❌ Error checking counts:', error.message);
  }
}

checkCounts();




