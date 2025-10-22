import { createClient } from '@supabase/supabase-js';
import JustTCGService from './src/services/justtcgService.js';

// Supabase configuration
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

class JustTCGImporter {
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

  async getSets() {
    console.log('🔄 Fetching Pokemon sets from JustTCG...');
    
    try {
      const response = await this.justtcg.getSets();
      
      if (response.error) {
        throw new Error(`API Error: ${response.error}`);
      }
      
      if (!response.data) {
        throw new Error('No sets data received from API');
      }
      
      console.log(`📦 Found ${response.data.length} Pokemon sets`);
      console.log(`📊 API Usage: ${response.usage.apiDailyRequestsRemaining} daily requests remaining`);
      this.totalSets = response.data.length;
      
      return response.data;
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

  async importAllSets() {
    console.log('🚀 Starting JustTCG Pokemon cards import...');
    console.log('⚠️  This will respect API rate limits (100 requests/day, 1000/month)');
    console.log('📊 Import will be spread across multiple days if needed\n');
    
    try {
      // Check initial quota
      await this.checkQuota();
      
      // Get all Pokemon sets
      const sets = await this.getSets();
      
      if (sets.length === 0) {
        console.log('❌ No Pokemon sets found');
        return;
      }
      
      // Process each set
      for (const set of sets) {
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
      console.log('\n🎉 Import session completed!');
      console.log('📊 Summary:');
      console.log(`   - Sets processed: ${this.processedSets}/${this.totalSets}`);
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
      
      if (this.processedSets < this.totalSets) {
        console.log('\n🔄 Some sets were not processed due to quota limits.');
        console.log('   Run the script again tomorrow to continue importing.');
      }
      
    } catch (error) {
      console.error('❌ Import failed:', error.message);
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
                justtcg_market_price: pricingData.data.market_price,
                justtcg_low_price: pricingData.data.low_price,
                justtcg_mid_price: pricingData.data.mid_price,
                justtcg_high_price: pricingData.data.high_price,
                justtcg_foil_price: pricingData.data.foil_price,
                justtcg_normal_price: pricingData.data.normal_price,
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

if (command === 'import') {
  const importer = new JustTCGImporter();
  importer.importAllSets();
} else if (command === 'sync') {
  const importer = new JustTCGImporter();
  importer.syncPricing();
} else {
  console.log('Usage:');
  console.log('  node import-justtcg-cards.js import  # Import all cards (respects rate limits)');
  console.log('  node import-justtcg-cards.js sync   # Sync pricing for existing cards');
}
