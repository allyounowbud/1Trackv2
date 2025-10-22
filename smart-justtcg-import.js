import { createClient } from '@supabase/supabase-js';
import JustTCGService from './src/services/justtcgService.js';

// Supabase configuration
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

class SmartJustTCGImporter {
  constructor() {
    this.justtcg = new JustTCGService();
    this.totalCards = 0;
    this.totalSets = 0;
    this.processedSets = 0;
    this.errors = [];
    this.isRunning = false;
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async checkQuota() {
    const quota = await this.justtcg.getQuotaStatus();
    console.log(`📊 API Quota Status:`);
    console.log(`   Daily: ${quota.daily.used}/${quota.daily.limit} (${quota.daily.remaining} remaining)`);
    console.log(`   Monthly: ${quota.monthly.used}/${quota.monthly.limit} (${quota.monthly.remaining} remaining)`);
    
    if (quota.daily.remaining <= 0) {
      throw new Error('Daily quota exhausted. Please try again tomorrow.');
    }
    
    if (quota.monthly.remaining <= 0) {
      throw new Error('Monthly quota exhausted. Please upgrade your plan.');
    }
    
    return quota;
  }

  // Smart strategy: Focus on latest English Pokemon sets first
  async getLatestEnglishSets() {
    console.log('🔄 Fetching Pokemon sets from JustTCG...');
    
    try {
      const response = await this.justtcg.getSets();
      
      if (response.error) {
        throw new Error(`API Error: ${response.error}`);
      }
      
      if (!response.data) {
        throw new Error('No sets data received from API');
      }
      
      // Filter and prioritize latest English sets
      const latestEnglishSets = response.data
        .filter(set => {
          // Focus on English sets only
          const isEnglish = set.language === 'en' || 
                          set.language === 'English' || 
                          !set.language; // Default to English if not specified
          
          // Exclude promotional/special sets, focus on main expansions
          const name = set.name.toLowerCase();
          const isMainSet = !name.includes('promo') && 
                           !name.includes('special') && 
                           !name.includes('collection') &&
                           !name.includes('box') &&
                           !name.includes('deck') &&
                           !name.includes('theme deck') &&
                           !name.includes('starter deck');
          
          return isEnglish && isMainSet;
        })
        .sort((a, b) => {
          // Sort by release date (newest first)
          const dateA = new Date(a.releaseDate || a.publishedOn || 0);
          const dateB = new Date(b.releaseDate || b.publishedOn || 0);
          return dateB - dateA;
        });
      
      console.log(`📦 Found ${latestEnglishSets.length} latest English Pokemon sets`);
      console.log(`📊 API Usage: ${response.usage.apiDailyRequestsRemaining} daily requests remaining`);
      
      // Show the top 10 most recent sets
      console.log('\n🎯 Top 10 Most Recent English Sets:');
      latestEnglishSets.slice(0, 10).forEach((set, index) => {
        const releaseDate = set.releaseDate || set.publishedOn || 'Unknown';
        console.log(`   ${index + 1}. ${set.name} (${set.code}) - ${releaseDate}`);
      });
      
      this.totalSets = latestEnglishSets.length;
      
      return latestEnglishSets;
    } catch (error) {
      console.error('❌ Error fetching sets:', error.message);
      throw error;
    }
  }

  async importSetCards(set) {
    console.log(`\n📦 Processing set: ${set.name} (${set.code})`);
    
    try {
      let offset = 0;
      let hasMorePages = true;
      let setCards = 0;
      const limit = 20; // Max cards per request
      
      while (hasMorePages) {
        // Check quota before each request
        const quota = await this.justtcg.getQuotaStatus();
        if (quota.daily.remaining <= 0) {
          console.log('⚠️  Daily quota reached. Stopping for today.');
          break;
        }
        
        console.log(`   📄 Fetching cards (offset: ${offset})...`);
        
        try {
          const response = await this.justtcg.getCardsFromSet(set.code, { 
            limit, 
            offset 
          });
          
          if (response.error) {
            throw new Error(`API Error: ${response.error}`);
          }
          
          if (!response.data || response.data.length === 0) {
            hasMorePages = false;
            break;
          }
          
          // Import cards to database
          const imported = await this.justtcg.importCards(response.data);
          setCards += imported;
          
          console.log(`   ✅ Imported ${imported} cards (${response.usage.apiDailyRequestsRemaining} requests remaining)`);
          
          // Check if there are more pages using pagination info
          if (response.pagination) {
            hasMorePages = response.pagination.hasMore;
            offset += limit;
          } else {
            // Fallback: if no pagination info, check if we got a full page
            hasMorePages = response.data.length === limit;
            offset += limit;
          }
          
          // Rate limiting - wait between requests
          await this.sleep(2000); // 2 second delay between requests
          
        } catch (error) {
          console.error(`   ❌ Error fetching cards:`, error.message);
          this.errors.push({ set: set.name, offset, error: error.message });
          
          // If it's a rate limit error, stop for today
          if (error.message.includes('rate limit') || error.message.includes('quota')) {
            hasMorePages = false;
            break;
          }
          
          // For other errors, continue to next batch
          offset += limit;
          await this.sleep(5000); // Wait longer on errors
        }
      }
      
      this.totalCards += setCards;
      this.processedSets++;
      
      console.log(`✅ Completed ${set.name}: ${setCards} cards (${this.processedSets}/${this.totalSets})`);
      
      return setCards;
      
    } catch (error) {
      console.error(`❌ Error processing set ${set.name}:`, error.message);
      this.errors.push({ set: set.name, error: error.message });
      return 0;
    }
  }

  // Smart import: Focus on latest English Pokemon sets first
  async importLatestEnglishSets() {
    console.log('🎯 Starting smart import - focusing on latest English Pokemon sets...');
    
    try {
      // Check initial quota
      await this.checkQuota();
      
      // Get latest English sets
      const sets = await this.getLatestEnglishSets();
      
      if (sets.length === 0) {
        console.log('❌ No English Pokemon sets found');
        return;
      }
      
      // Process only the first 5 most recent English sets today
      const setsToProcess = sets.slice(0, 5);
      console.log(`🎯 Processing top ${setsToProcess.length} latest English sets today`);
      
      // Process each set
      for (const set of setsToProcess) {
        // Check quota before each set
        const quota = await this.justtcg.getQuotaStatus();
        if (quota.daily.remaining <= 0) {
          console.log('\n⚠️  Daily quota exhausted. Stopping for today.');
          console.log('🔄 Run the script again tomorrow to continue importing.');
          break;
        }
        
        await this.importSetCards(set);
        
        // Wait between sets to be respectful
        await this.sleep(3000);
      }
      
      // Update sync status
      await this.updateSyncStatus();
      
      // Print summary
      console.log('\n🎉 Smart import session completed!');
      console.log('📊 Summary:');
      console.log(`   - Sets processed: ${this.processedSets}/${setsToProcess.length}`);
      console.log(`   - Cards imported: ${this.totalCards}`);
      
      const finalQuota = await this.justtcg.getQuotaStatus();
      console.log(`   - Daily requests used: ${finalQuota.daily.used}/${finalQuota.daily.limit}`);
      console.log(`   - Monthly requests used: ${finalQuota.monthly.used}/${finalQuota.monthly.limit}`);
      
      if (this.errors.length > 0) {
        console.log(`\n⚠️  Errors encountered: ${this.errors.length}`);
        this.errors.slice(0, 5).forEach(error => {
          console.log(`   - ${error.set || 'Unknown'}: ${error.error}`);
        });
      }
      
      console.log('\n💡 Next steps:');
      console.log('   - Run again tomorrow to import more recent sets');
      console.log('   - Use "sync" command for price updates only');
      console.log('   - Check database: SELECT COUNT(*) FROM justtcg_cards;');
      
    } catch (error) {
      console.error('❌ Smart import failed:', error.message);
      process.exit(1);
    }
  }

  async updateSyncStatus() {
    console.log('🔄 Updating sync status...');
    
    const { error } = await supabase
      .from('justtcg_sync_status')
      .upsert({
        id: 1,
        total_cards: this.totalCards,
        cards_imported: this.totalCards,
        last_full_sync: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
      
    if (error) {
      console.error('❌ Error updating sync status:', error);
    } else {
      console.log('✅ Sync status updated');
    }
  }

  // Method to sync only pricing data (for ongoing updates)
  async syncPricing() {
    console.log('🔄 Starting pricing sync...');
    
    try {
      // Get cards that need pricing updates (older than 24 hours)
      const { data: cards, error } = await supabase
        .from('justtcg_cards')
        .select('id, name, set_name')
        .or('last_synced_at.is.null,last_synced_at.lt.' + new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(20); // Process 20 cards at a time
      
      if (error) {
        throw error;
      }
      
      if (!cards || cards.length === 0) {
        console.log('✅ No cards need pricing updates');
        return;
      }
      
      console.log(`📊 Found ${cards.length} cards needing pricing updates`);
      
      for (const card of cards) {
        try {
          // Check quota
          const quota = await this.justtcg.getQuotaStatus();
          if (quota.daily.remaining <= 0) {
            console.log('⚠️  Daily quota reached. Stopping pricing sync.');
            break;
          }
          
          // Get updated pricing
          const pricingData = await this.justtcg.getCardPricing(card.id.replace('justtcg-', ''));
          
          if (pricingData && pricingData.data) {
            // Update pricing in database
            const { error: updateError } = await supabase
              .from('justtcg_cards')
              .update({
                justtcg_market_price: pricingData.data.pricing?.marketPrice,
                justtcg_low_price: pricingData.data.pricing?.lowPrice,
                justtcg_mid_price: pricingData.data.pricing?.midPrice,
                justtcg_high_price: pricingData.data.pricing?.highPrice,
                justtcg_foil_price: pricingData.data.pricing?.foilPrice,
                justtcg_normal_price: pricingData.data.pricing?.normalPrice,
                last_synced_at: new Date().toISOString()
              })
              .eq('id', card.id);
            
            if (updateError) {
              console.error(`❌ Error updating pricing for ${card.name}:`, updateError);
            } else {
              console.log(`✅ Updated pricing for ${card.name}`);
            }
          }
          
          // Rate limiting
          await this.sleep(2000);
          
        } catch (error) {
          console.error(`❌ Error syncing pricing for ${card.name}:`, error.message);
        }
      }
      
      console.log('✅ Pricing sync completed');
      
    } catch (error) {
      console.error('❌ Pricing sync failed:', error.message);
    }
  }
}

// CLI interface
const command = process.argv[2];

if (command === 'smart') {
  const importer = new SmartJustTCGImporter();
  importer.importLatestEnglishSets();
} else if (command === 'sync') {
  const importer = new SmartJustTCGImporter();
  importer.syncPricing();
} else {
  console.log('JustTCG Smart Import Tool');
  console.log('');
  console.log('Usage:');
  console.log('  node smart-justtcg-import.js smart  # Smart import (latest English sets first)');
  console.log('  node smart-justtcg-import.js sync   # Sync pricing for existing cards');
  console.log('');
  console.log('Smart import strategy:');
  console.log('  - Focuses on latest English Pokemon sets first');
  console.log('  - Processes 5 most recent sets per day (respects rate limits)');
  console.log('  - Prioritizes sets by release date (newest first)');
  console.log('  - Excludes promotional/special sets');
  console.log('  - Takes ~25 days to import all Pokemon cards');
}
