#!/usr/bin/env node

/**
 * Daily Pricing Sync Script
 * Updates pricing data for all cards in the database
 * Should be run daily via cron job or scheduled task
 */

import { createClient } from '@supabase/supabase-js';
import scrydexHybridService from '../src/services/scrydexHybridService.js';

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   VITE_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

class DailyPricingSync {
  constructor() {
    this.batchSize = 50; // Process cards in batches
    this.delayBetweenBatches = 1000; // 1 second delay between batches
    this.totalProcessed = 0;
    this.totalUpdated = 0;
    this.totalErrors = 0;
  }

  async run() {
    console.log('🚀 Starting daily pricing sync...');
    console.log(`📅 Date: ${new Date().toISOString()}`);
    
    try {
      // Initialize the Scrydex service
      await scrydexHybridService.initialize();
      
      // Get all cards that need pricing updates
      const cards = await this.getCardsForPricingUpdate();
      console.log(`📊 Found ${cards.length} cards to update pricing for`);
      
      if (cards.length === 0) {
        console.log('✅ No cards need pricing updates');
        return;
      }
      
      // Process cards in batches
      await this.processCardsInBatches(cards);
      
      // Update sync status
      await this.updateSyncStatus();
      
      console.log('🎉 Daily pricing sync completed!');
      console.log(`📊 Summary:`);
      console.log(`   - Total processed: ${this.totalProcessed}`);
      console.log(`   - Total updated: ${this.totalUpdated}`);
      console.log(`   - Total errors: ${this.totalErrors}`);
      
    } catch (error) {
      console.error('❌ Daily pricing sync failed:', error);
      process.exit(1);
    }
  }

  async getCardsForPricingUpdate() {
    try {
      // Get cards that haven't been updated in the last 24 hours
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('pokemon_cards')
        .select('id, name, expansion_name')
        .or(`updated_at.is.null,updated_at.lt.${oneDayAgo}`)
        .order('updated_at', { ascending: true, nullsFirst: true })
        .limit(1000); // Limit to prevent overwhelming the API
      
      if (error) {
        throw new Error(`Failed to get cards for pricing update: ${error.message}`);
      }
      
      return data || [];
      
    } catch (error) {
      console.error('❌ Failed to get cards for pricing update:', error);
      return [];
    }
  }

  async processCardsInBatches(cards) {
    const batches = this.createBatches(cards, this.batchSize);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`🔄 Processing batch ${i + 1}/${batches.length} (${batch.length} cards)...`);
      
      try {
        await this.processBatch(batch);
        
        // Delay between batches to respect rate limits
        if (i < batches.length - 1) {
          console.log(`⏳ Waiting ${this.delayBetweenBatches}ms before next batch...`);
          await new Promise(resolve => setTimeout(resolve, this.delayBetweenBatches));
        }
        
      } catch (error) {
        console.error(`❌ Batch ${i + 1} failed:`, error);
        this.totalErrors += batch.length;
      }
    }
  }

  createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  async processBatch(cards) {
    const promises = cards.map(card => this.updateCardPricing(card));
    const results = await Promise.allSettled(promises);
    
    results.forEach((result, index) => {
      this.totalProcessed++;
      if (result.status === 'fulfilled' && result.value) {
        this.totalUpdated++;
      } else {
        this.totalErrors++;
        console.error(`❌ Failed to update pricing for card ${cards[index].id}:`, 
          result.reason || result.value);
      }
    });
  }

  async updateCardPricing(card) {
    try {
      // Get fresh pricing data from Scrydex API
      const cardData = await scrydexHybridService.getCard(card.id, {
        includePrices: true
      });
      
      if (!cardData || !cardData.prices) {
        console.log(`⚠️ No pricing data available for card ${card.id}`);
        return false;
      }
      
      // Extract pricing information
      const prices = cardData.prices;
      let marketPrice = null;
      let lowPrice = null;
      let midPrice = null;
      let highPrice = null;
      
      if (prices.raw && Array.isArray(prices.raw) && prices.raw.length > 0) {
        const rawPrice = prices.raw[0];
        marketPrice = rawPrice.market || null;
        lowPrice = rawPrice.low || null;
        midPrice = rawPrice.mid || null;
        highPrice = rawPrice.high || null;
      } else if (typeof prices === 'object') {
        marketPrice = prices.market || null;
        lowPrice = prices.low || null;
        midPrice = prices.mid || null;
        highPrice = prices.high || null;
      }
      
      // Update the card in the database
      const { error } = await supabase
        .from('pokemon_cards')
        .update({
          market_price: marketPrice,
          low_price: lowPrice,
          mid_price: midPrice,
          high_price: highPrice,
          updated_at: new Date().toISOString()
        })
        .eq('id', card.id);
      
      if (error) {
        throw new Error(`Database update failed: ${error.message}`);
      }
      
      console.log(`✅ Updated pricing for ${card.name}: $${marketPrice || 'N/A'}`);
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to update pricing for card ${card.id}:`, error.message);
      return false;
    }
  }

  async updateSyncStatus() {
    try {
      const now = new Date().toISOString();
      
      const { error } = await supabase
        .from('sync_status')
        .upsert({
          id: 1,
          cards: now,
          expansions: now, // Also update expansions timestamp
          updated_at: now
        }, { onConflict: 'id' });
      
      if (error) {
        throw new Error(`Failed to update sync status: ${error.message}`);
      }
      
      console.log('✅ Updated sync status');
      
    } catch (error) {
      console.error('❌ Failed to update sync status:', error);
    }
  }
}

// Run the sync
const sync = new DailyPricingSync();
sync.run().catch(error => {
  console.error('❌ Daily pricing sync failed:', error);
  process.exit(1);
});
