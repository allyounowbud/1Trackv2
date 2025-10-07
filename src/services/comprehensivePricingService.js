/**
 * Comprehensive Pricing Service
 * Main pricing service that orchestrates all pricing strategies:
 * - Database pricing (fast, cached)
 * - Smart caching with stale-while-revalidate
 * - Real-time API fallback
 * - Automatic background sync
 */

import smartPricingService from './smartPricingService.js';
import databasePricingService from './databasePricingService.js';
import pricingSyncService from './pricingSyncService.js';
import realTimePricingService from './realTimePricingService.js';

class ComprehensivePricingService {
  constructor() {
    this.isInitialized = false;
    this.autoSyncEnabled = true;
    this.autoSyncInterval = null;
  }

  /**
   * Initialize the comprehensive pricing service
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log('🚀 Initializing Comprehensive Pricing Service...');

      // Initialize all sub-services
      await Promise.all([
        smartPricingService.initialize(),
        databasePricingService.initialize(),
        realTimePricingService.initialize()
      ]);

      // Check if pricing sync is needed and trigger if necessary
      const needsSync = await pricingSyncService.isPricingSyncNeeded();
      if (needsSync) {
        console.log('💰 Auto-triggering pricing sync on initialization...');
        pricingSyncService.triggerPricingSync();
      }

      // Start automatic pricing sync if enabled
      if (this.autoSyncEnabled) {
        this.startAutoSync();
      }

      this.isInitialized = true;
      console.log('✅ Comprehensive Pricing Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Comprehensive Pricing Service:', error);
      throw error;
    }
  }

  /**
   * Get pricing data for a single card
   * @param {string} apiId - Card API ID
   * @param {Object} options - Pricing options
   * @returns {Object|null} Pricing data
   */
  async getCardPricing(apiId, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const {
      forceRefresh = false,
      backgroundRefresh = true,
      fallbackToApi = true,
      priority = 'balanced' // 'speed', 'balanced', 'freshness'
    } = options;

    console.log(`💰 Getting pricing for ${apiId} (priority: ${priority})`);

    try {
      switch (priority) {
        case 'speed':
          // Fastest: database only, no API fallback
          return await this.getFastPricing(apiId);
        
        case 'freshness':
          // Freshest: real-time API first, then database
          return await this.getFreshPricing(apiId, options);
        
        case 'balanced':
        default:
          // Balanced: smart caching with fallbacks
          return await smartPricingService.getCardPricing(apiId, {
            forceRefresh,
            backgroundRefresh,
            fallbackToApi
          });
      }
    } catch (error) {
      console.error(`❌ Error getting pricing for ${apiId}:`, error);
      return null;
    }
  }

  /**
   * Get fastest pricing (database only)
   * @param {string} apiId - Card API ID
   * @returns {Object|null} Pricing data
   */
  async getFastPricing(apiId) {
    try {
      console.log(`⚡ Fast pricing lookup for ${apiId}`);
      return await databasePricingService.getCardPricing(apiId);
    } catch (error) {
      console.error(`❌ Fast pricing failed for ${apiId}:`, error);
      return null;
    }
  }

  /**
   * Get freshest pricing (API first)
   * @param {string} apiId - Card API ID
   * @param {Object} options - Options
   * @returns {Object|null} Pricing data
   */
  async getFreshPricing(apiId, options = {}) {
    try {
      console.log(`🌐 Fresh pricing lookup for ${apiId}`);
      
      // Check availability first
      const availability = await realTimePricingService.checkPricingAvailability(apiId);
      
      if (availability.needsRealTime) {
        console.log(`🔄 Fetching real-time pricing for ${apiId}`);
        const realTimePricing = await realTimePricingService.fetchRealTimePricing(apiId);
        if (realTimePricing) {
          return realTimePricing;
        }
      }

      // Fallback to database
      console.log(`📦 Fallback to database pricing for ${apiId}`);
      return await databasePricingService.getCardPricing(apiId);
    } catch (error) {
      console.error(`❌ Fresh pricing failed for ${apiId}:`, error);
      return null;
    }
  }

  /**
   * Get pricing for multiple cards
   * @param {Array<string>} apiIds - Array of card API IDs
   * @param {Object} options - Pricing options
   * @returns {Object} Object with apiId as key and pricing data as value
   */
  async getMultipleCardPricing(apiIds, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!apiIds || apiIds.length === 0) {
      return {};
    }

    const {
      priority = 'balanced',
      maxConcurrent = 5
    } = options;

    console.log(`💰 Getting pricing for ${apiIds.length} cards (priority: ${priority})`);

    try {
      switch (priority) {
        case 'speed':
          return await databasePricingService.getMultipleCardPricing(apiIds);
        
        case 'freshness':
          return await realTimePricingService.fetchMultipleRealTimePricing(apiIds, {
            maxConcurrent
          });
        
        case 'balanced':
        default:
          return await smartPricingService.getMultipleCardPricing(apiIds, options);
      }
    } catch (error) {
      console.error(`❌ Error getting multiple card pricing:`, error);
      return {};
    }
  }

  /**
   * Get pricing for sealed products
   * @param {string} apiId - Product API ID
   * @param {Object} options - Pricing options
   * @returns {Object|null} Pricing data
   */
  async getSealedProductPricing(apiId, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      console.log(`📦 Getting sealed product pricing for ${apiId}`);
      return await databasePricingService.getSealedProductPricing(apiId);
    } catch (error) {
      console.error(`❌ Error getting sealed product pricing for ${apiId}:`, error);
      return null;
    }
  }

  /**
   * Start automatic pricing sync
   * @param {number} intervalHours - Hours between syncs (default 12)
   */
  startAutoSync(intervalHours = 12) {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
    }

    console.log(`⏰ Starting automatic pricing sync every ${intervalHours} hours`);
    
    // Run immediately if needed
    pricingSyncService.autoSyncIfNeeded();

    // Schedule regular intervals
    const intervalMs = intervalHours * 60 * 60 * 1000;
    this.autoSyncInterval = setInterval(() => {
      pricingSyncService.autoSyncIfNeeded();
    }, intervalMs);

    this.autoSyncEnabled = true;
  }

  /**
   * Stop automatic pricing sync
   */
  stopAutoSync() {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = null;
    }
    this.autoSyncEnabled = false;
    console.log('⏹️ Stopped automatic pricing sync');
  }

  /**
   * Manually trigger pricing sync
   * @param {Object} options - Sync options
   * @returns {Object} Sync result
   */
  async triggerPricingSync(options = {}) {
    try {
      console.log('💰 Manually triggering pricing sync...');
      const result = await pricingSyncService.triggerPricingSync();
      
      // Clear smart cache after sync to ensure fresh data
      smartPricingService.clearCache();
      
      return result;
    } catch (error) {
      console.error('❌ Manual pricing sync failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get comprehensive pricing statistics
   * @returns {Object} Statistics from all services
   */
  async getPricingStats() {
    try {
      const [
        syncStats,
        cacheStats,
        realTimeStats
      ] = await Promise.all([
        pricingSyncService.getPricingSyncStats(),
        smartPricingService.getCacheStats(),
        realTimePricingService.getStats()
      ]);

      return {
        sync: syncStats,
        cache: cacheStats,
        realTime: realTimeStats,
        autoSync: {
          enabled: this.autoSyncEnabled,
          interval: this.autoSyncInterval ? 'active' : 'inactive'
        },
        services: {
          initialized: this.isInitialized,
          smartPricing: 'active',
          databasePricing: 'active',
          realTimePricing: 'active'
        }
      };
    } catch (error) {
      console.error('❌ Error getting pricing stats:', error);
      return {
        error: error.message,
        sync: {},
        cache: {},
        realTime: {},
        autoSync: { enabled: false, interval: 'inactive' },
        services: { initialized: false }
      };
    }
  }

  /**
   * Clear all caches
   */
  clearAllCaches() {
    console.log('🗑️ Clearing all pricing caches...');
    smartPricingService.clearCache();
    console.log('✅ All pricing caches cleared');
  }

  /**
   * Check pricing health and availability
   * @param {string} apiId - Test card API ID
   * @returns {Object} Health check results
   */
  async healthCheck(apiId = 'sv1-025') {
    try {
      console.log(`🏥 Running pricing health check with ${apiId}...`);
      
      const startTime = Date.now();
      
      // Test database pricing
      const dbPricing = await this.getFastPricing(apiId);
      const dbTime = Date.now() - startTime;
      
      // Test smart pricing
      const smartPricing = await this.getCardPricing(apiId, { priority: 'balanced' });
      const smartTime = Date.now() - startTime;
      
      // Test real-time pricing availability
      const availability = await realTimePricingService.checkPricingAvailability(apiId);
      
      return {
        healthy: true,
        database: {
          available: !!dbPricing,
          responseTime: dbTime,
          hasData: !!dbPricing?.raw || !!dbPricing?.graded
        },
        smart: {
          available: !!smartPricing,
          responseTime: smartTime,
          hasData: !!smartPricing?.raw || !!smartPricing?.graded
        },
        realTime: {
          available: availability.available,
          needsRealTime: availability.needsRealTime,
          ageHours: availability.ageHours
        },
        overall: {
          databaseWorking: !!dbPricing,
          smartCacheWorking: !!smartPricing,
          realTimeAvailable: availability.available
        }
      };
    } catch (error) {
      console.error('❌ Pricing health check failed:', error);
      return {
        healthy: false,
        error: error.message,
        database: { available: false },
        smart: { available: false },
        realTime: { available: false },
        overall: {
          databaseWorking: false,
          smartCacheWorking: false,
          realTimeAvailable: false
        }
      };
    }
  }
}

// Create and export singleton instance
const comprehensivePricingService = new ComprehensivePricingService();
export default comprehensivePricingService;
