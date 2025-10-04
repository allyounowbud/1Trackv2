import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

console.log('📊 Monitoring Scrydex Sync Progress...');
console.log('======================================\n');

async function checkProgress() {
  try {
    // Get total cards
    const { count: totalCards } = await supabase
      .from('pokemon_cards')
      .select('*', { count: 'exact', head: true });

    // Get total pricing records
    const { count: totalPricing } = await supabase
      .from('card_prices')
      .select('*', { count: 'exact', head: true });

    // Get total expansions
    const { count: totalExpansions } = await supabase
      .from('pokemon_expansions')
      .select('*', { count: 'exact', head: true });

    // Get raw pricing count
    const { count: rawPricing } = await supabase
      .from('card_prices')
      .select('*', { count: 'exact', head: true })
      .eq('price_type', 'raw');

    // Get graded pricing count
    const { count: gradedPricing } = await supabase
      .from('card_prices')
      .select('*', { count: 'exact', head: true })
      .eq('price_type', 'graded');

    // Calculate progress
    const targetCards = 41000;
    const cardProgress = ((totalCards / targetCards) * 100).toFixed(2);

    // Clear console and show progress
    console.clear();
    console.log('📊 Scrydex Sync Progress Monitor');
    console.log('================================\n');
    
    console.log(`🎴 Pokemon Cards:`);
    console.log(`   Current: ${totalCards.toLocaleString()} / ${targetCards.toLocaleString()}`);
    console.log(`   Progress: ${cardProgress}%`);
    console.log(`   Remaining: ${(targetCards - totalCards).toLocaleString()} cards\n`);
    
    console.log(`🏢 Expansions:`);
    console.log(`   Total: ${totalExpansions} / 394 expected\n`);
    
    console.log(`💰 Pricing Data:`);
    console.log(`   Total Records: ${totalPricing.toLocaleString()}`);
    console.log(`   Raw Pricing: ${(rawPricing || 0).toLocaleString()}`);
    console.log(`   Graded Pricing: ${(gradedPricing || 0).toLocaleString()}\n`);
    
    console.log(`📈 Estimated API Calls Used:`);
    const estimatedCalls = Math.ceil(totalCards / 250);
    console.log(`   ~${estimatedCalls} calls (batch size: 250)\n`);
    
    console.log(`🎯 Status:`);
    if (totalCards >= targetCards) {
      console.log(`   ✅ SYNC COMPLETE!`);
    } else {
      console.log(`   🔄 Syncing... (${(targetCards - totalCards).toLocaleString()} cards remaining)`);
    }
    
    console.log(`\n⏰ Last Updated: ${new Date().toLocaleTimeString()}`);
    console.log('   (Updates every 5 seconds - Press Ctrl+C to stop)\n');

  } catch (error) {
    console.error('❌ Error checking progress:', error.message);
  }
}

// Check progress immediately
checkProgress();

// Then check every 5 seconds
setInterval(checkProgress, 5000);

