/**
 * Pricing Sync Service
 * Handles dedicated pricing updates every 12 hours
 * Optimized for minimal API usage while keeping prices fresh
 */

import { supabase } from '../lib/supabaseClient';

class PricingSyncService {
  constructor() {
    this.syncInProgress = false;
    this.lastSyncTime = null;
    this.syncInterval = 12 * 60 * 60 * 1000; // 12 hours in milliseconds
  }

  /**
   * Check if pricing sync is needed
   * @returns {boolean} True if sync is needed
   */
  async isPricingSyncNeeded() {
    try {
      // Check last sync time from database (try pricing-specific columns first, then fall back to general sync)
      const { data: syncStatus, error } = await supabase
        .from('sync_status')
        .select('pricing_last_updated, cards, expansions')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking pricing sync status:', error);
        return true; // Default to needing sync if we can't check
      }

      // Use pricing-specific timestamp if available, otherwise fall back to general sync time
      const lastSyncTime = syncStatus?.pricing_last_updated || syncStatus?.cards || syncStatus?.expansions;
      
      if (!lastSyncTime) {
        return true; // No previous sync, need to sync
      }

      const lastSync = new Date(lastSyncTime);
      const now = new Date();
      const hoursSinceSync = (now - lastSync) / (1000 * 60 * 60);

      console.log(`🕐 Hours since last pricing sync: ${hoursSinceSync.toFixed(1)}`);
      return hoursSinceSync >= 12;
    } catch (error) {
      console.error('Error checking pricing sync status:', error);
      return true; // Default to needing sync
    }
  }

  /**
   * Trigger pricing-only sync
   * Updates pricing data without syncing card metadata
   */
  async triggerPricingSync() {
    if (this.syncInProgress) {
      console.log('⏳ Pricing sync already in progress');
      return { success: false, message: 'Sync already in progress' };
    }

    try {
      this.syncInProgress = true;
      console.log('💰 Triggering pricing-only sync...');

      // Call Supabase Edge Function for pricing sync
      const { data, error } = await supabase.functions.invoke('scrydex-sync?action=pricing-sync', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (error) {
        throw error;
      }

      // Update sync status
      await this.updatePricingSyncStatus();

      console.log('✅ Pricing sync completed successfully:', data);
      return { success: true, data };

    } catch (error) {
      console.error('❌ Pricing sync failed:', error);
      return { success: false, error: error.message };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Update pricing sync status in database
   */
  async updatePricingSyncStatus() {
    try {
      const { error } = await supabase
        .from('sync_status')
        .upsert({
          id: 1, // Assuming single row for sync status
          pricing_last_updated: new Date().toISOString(),
          pricing_sync_count: supabase.sql`pricing_sync_count + 1`
        }, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error('Failed to update pricing sync status:', error);
      } else {
        console.log('✅ Updated pricing sync status');
      }
    } catch (error) {
      console.error('Error updating pricing sync status:', error);
    }
  }

  /**
   * Auto-sync pricing if needed
   * @returns {boolean} True if sync was triggered
   */
  async autoSyncIfNeeded() {
    try {
      const needsSync = await this.isPricingSyncNeeded();
      if (needsSync) {
        console.log('💰 Auto-pricing sync needed, triggering...');
        const result = await this.triggerPricingSync();
        return result.success;
      }
      console.log('💰 Pricing is up to date, no sync needed');
      return false;
    } catch (error) {
      console.error('Auto-pricing sync failed:', error);
      return false;
    }
  }

  /**
   * Get pricing freshness info for a card
   * @param {string} apiId - Card API ID
   * @returns {Object} Pricing freshness information
   */
  async getPricingFreshness(apiId) {
    try {
      const { data, error } = await supabase
        .from('pokemon_cards')
        .select('updated_at, raw_market, graded_market')
        .eq('id', apiId)
        .single();

      if (error || !data) {
        return { isFresh: false, age: null, lastUpdated: null };
      }

      const lastUpdated = new Date(data.updated_at);
      const now = new Date();
      const ageHours = (now - lastUpdated) / (1000 * 60 * 60);

      return {
        isFresh: ageHours < 12,
        age: ageHours,
        lastUpdated: lastUpdated.toISOString(),
        hasPricingData: !!(data.raw_market || data.graded_market)
      };
    } catch (error) {
      console.error('Error checking pricing freshness:', error);
      return { isFresh: false, age: null, lastUpdated: null };
    }
  }

  /**
   * Get pricing sync statistics
   */
  async getPricingSyncStats() {
    try {
      const [syncStatusResult, pricingStatsResult] = await Promise.all([
        supabase
          .from('sync_status')
          .select('pricing_last_updated, pricing_sync_count, cards, expansions')
          .single(),
        supabase
          .from('pokemon_cards')
          .select('updated_at', { count: 'exact', head: true })
      ]);

      const syncStatus = syncStatusResult.data;
      const totalCards = pricingStatsResult.count || 0;

      // Count cards with pricing data
      const { count: cardsWithPricing } = await supabase
        .from('pokemon_cards')
        .select('*', { count: 'exact', head: true })
        .not('raw_market', 'is', null);

      // Count stale pricing (older than 12 hours)
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
      const { count: stalePricing } = await supabase
        .from('pokemon_cards')
        .select('*', { count: 'exact', head: true })
        .lt('updated_at', twelveHoursAgo)
        .not('raw_market', 'is', null);

      // Use pricing-specific timestamp if available, otherwise fall back to general sync time
      const lastSyncTime = syncStatus?.pricing_last_updated || syncStatus?.cards || syncStatus?.expansions;

      return {
        lastPricingSync: lastSyncTime,
        pricingSyncCount: syncStatus?.pricing_sync_count || 0,
        totalCards,
        cardsWithPricing: cardsWithPricing || 0,
        stalePricing: stalePricing || 0,
        pricingCoverage: totalCards > 0 ? ((cardsWithPricing || 0) / totalCards * 100).toFixed(1) + '%' : '0%',
        needsSync: await this.isPricingSyncNeeded()
      };
    } catch (error) {
      console.error('Error getting pricing sync stats:', error);
      return {
        lastPricingSync: null,
        pricingSyncCount: 0,
        totalCards: 0,
        cardsWithPricing: 0,
        stalePricing: 0,
        pricingCoverage: '0%',
        needsSync: true
      };
    }
  }

  /**
   * Schedule automatic pricing syncs
   * @param {number} intervalHours - Hours between syncs (default 12)
   */
  scheduleAutoSync(intervalHours = 12) {
    const intervalMs = intervalHours * 60 * 60 * 1000;
    
    console.log(`⏰ Scheduling automatic pricing sync every ${intervalHours} hours`);
    
    // Run immediately if needed
    this.autoSyncIfNeeded();
    
    // Then schedule regular intervals
    setInterval(() => {
      this.autoSyncIfNeeded();
    }, intervalMs);
  }
}

// Create and export singleton instance
const pricingSyncService = new PricingSyncService();
export default pricingSyncService;
