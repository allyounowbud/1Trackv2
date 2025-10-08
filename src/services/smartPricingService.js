/**
 * Smart Pricing Service
 * Implements stale-while-revalidate pattern for optimal pricing performance
 * - Serves cached pricing instantly
 * - Updates stale data in background
 * - Falls back to real-time API when needed
 */

import databasePricingService from './databasePricingService.js';
import pricingSyncService from './pricingSyncService.js';
import realTimePricingService from './realTimePricingService.js';

class SmartPricingService {
  constructor() {
    this.cache = new Map(); // In-memory cache for frequently accessed pricing
    this.pendingRequests = new Map(); // Prevent duplicate requests
    this.cacheTimeout = 2 * 60 * 60 * 1000; // 2 hours in-memory cache
    this.staleThreshold = 12 * 60 * 60 * 1000; // 12 hours stale threshold
    this.maxCacheSize = 1000; // Maximum cached items
  }

  /**
   * Get pricing data with smart caching
   * @param {string} apiId - Card API ID
   * @param {Object} options - Options for pricing fetch
   * @returns {Object|null} Pricing data
   */
  async getCardPricing(apiId, options = {}) {
    if (!apiId) {
      console.warn('No API ID provided for pricing');
      return null;
    }

    const {
      forceRefresh = false,
      backgroundRefresh = true,
      fallbackToApi = true
    } = options;

    // Check in-memory cache first
    if (!forceRefresh && this.cache.has(apiId)) {
      const cached = this.cache.get(apiId);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        
        // Background refresh if stale
        if (backgroundRefresh && this.isStale(cached.data)) {
          this.backgroundRefresh(apiId);
        }
        
        return cached.data;
      } else {
        // Remove expired cache entry
        this.cache.delete(apiId);
      }
    }

    // Check if request is already pending
    if (this.pendingRequests.has(apiId)) {
      return await this.pendingRequests.get(apiId);
    }

    // Create pending request promise
    const pendingPromise = this.fetchPricingData(apiId, {
      forceRefresh,
      fallbackToApi
    });

    this.pendingRequests.set(apiId, pendingPromise);

    try {
      const result = await pendingPromise;
      return result;
    } finally {
      this.pendingRequests.delete(apiId);
    }
  }

  /**
   * Fetch pricing data from database or API
   * @param {string} apiId - Card API ID
   * @param {Object} options - Fetch options
   * @returns {Object|null} Pricing data
   */
  async fetchPricingData(apiId, options = {}) {
    const { forceRefresh = false, fallbackToApi = true } = options;

    try {
      // First, try database
      const dbPricing = await databasePricingService.getCardPricing(apiId);

      if (dbPricing && !this.isStale(dbPricing)) {
        this.cachePricing(apiId, dbPricing);
        return dbPricing;
      }

      if (dbPricing && this.isStale(dbPricing)) {
        
        // Serve stale data but refresh in background
        this.backgroundRefresh(apiId);
        this.cachePricing(apiId, dbPricing);
        return dbPricing;
      }

      // No database data or fallback requested
      if (fallbackToApi) {
        const apiPricing = await this.fetchFromApi(apiId);
        
        if (apiPricing) {
          this.cachePricing(apiId, apiPricing);
          return apiPricing;
        }
      }

      return null;

    } catch (error) {
      console.error(`❌ Error fetching pricing for ${apiId}:`, error);
      return null;
    }
  }

  /**
   * Check if pricing data is stale
   * @param {Object} pricingData - Pricing data object
   * @returns {boolean} True if stale
   */
  isStale(pricingData) {
    if (!pricingData || !pricingData.lastUpdated) {
      return true;
    }

    const lastUpdated = new Date(pricingData.lastUpdated);
    const now = new Date();
    const age = now - lastUpdated;

    return age > this.staleThreshold;
  }

  /**
   * Background refresh of pricing data
   * @param {string} apiId - Card API ID
   */
  async backgroundRefresh(apiId) {
    try {
      
      // Check if pricing sync is needed globally
      // Auto-trigger pricing sync disabled
      // const needsSync = await pricingSyncService.isPricingSyncNeeded();
      // if (needsSync) {
      //   console.log(`💰 Triggering global pricing sync for stale data`);
      //   pricingSyncService.triggerPricingSync();
      // }

      // For individual card, we could implement a targeted refresh
      // but for now, rely on the global sync
      
    } catch (error) {
      console.error(`❌ Background refresh failed for ${apiId}:`, error);
    }
  }

  /**
   * Cache pricing data in memory
   * @param {string} apiId - Card API ID
   * @param {Object} pricingData - Pricing data
   */
  cachePricing(apiId, pricingData) {
    // Implement LRU cache by removing oldest entries when full
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(apiId, {
      data: pricingData,
      timestamp: Date.now()
    });

  }

  /**
   * Fetch pricing from API using real-time service
   * @param {string} apiId - Card API ID
   * @returns {Object|null} Pricing data
   */
  async fetchFromApi(apiId) {
    try {
      return await realTimePricingService.fetchRealTimePricing(apiId);
    } catch (error) {
      console.error(`❌ API fetch failed for ${apiId}:`, error);
      return null;
    }
  }

  /**
   * Get multiple card pricing with smart caching
   * @param {Array<string>} apiIds - Array of card API IDs
   * @param {Object} options - Options for pricing fetch
   * @returns {Object} Object with apiId as key and pricing data as value
   */
  async getMultipleCardPricing(apiIds, options = {}) {
    if (!apiIds || apiIds.length === 0) {
      return {};
    }


    // Process in parallel with concurrency limit
    const results = {};
    const concurrency = 5;
    
    for (let i = 0; i < apiIds.length; i += concurrency) {
      const batch = apiIds.slice(i, i + concurrency);
      const batchPromises = batch.map(async (apiId) => {
        const pricing = await this.getCardPricing(apiId, options);
        return { apiId, pricing };
      });

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(({ apiId, pricing }) => {
        if (pricing) {
          results[apiId] = pricing;
        }
      });
    }

    return results;
  }

  /**
   * Clear cache for specific card or all cards
   * @param {string|null} apiId - Card API ID or null for all
   */
  clearCache(apiId = null) {
    if (apiId) {
      this.cache.delete(apiId);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    const now = Date.now();
    let fresh = 0;
    let stale = 0;
    let expired = 0;

    this.cache.forEach((entry) => {
      const age = now - entry.timestamp;
      if (age > this.cacheTimeout) {
        expired++;
      } else if (age > this.staleThreshold) {
        stale++;
      } else {
        fresh++;
      }
    });

    return {
      total: this.cache.size,
      fresh,
      stale,
      expired,
      pendingRequests: this.pendingRequests.size
    };
  }

  /**
   * Initialize smart pricing service
   */
  async initialize() {
    
    // Auto-trigger pricing sync disabled
    // const needsSync = await pricingSyncService.isPricingSyncNeeded();
    // if (needsSync) {
    //   console.log('💰 Pricing sync needed, triggering...');
    //   pricingSyncService.triggerPricingSync();
    // }

  }
}

// Create and export singleton instance
const smartPricingService = new SmartPricingService();
export default smartPricingService;
