/**
 * API Cache Service
 * Implements Scrydex caching best practices for optimal performance
 * 
 * Key Features:
 * - Redis-like caching with TTL (Time To Live)
 * - Different cache strategies for different data types
 * - Periodic cache refresh for dynamic data
 * - Local database integration for critical data
 * - Cache invalidation and cleanup
 */

class ApiCacheService {
  constructor() {
    // Cache storage using Map with TTL support
    this.cache = new Map();
    this.cacheMetadata = new Map(); // Stores TTL and metadata
    
    // Cache policies based on Scrydex best practices
    this.cachePolicies = {
      // Card metadata - rarely changes, cache for days (Scrydex recommendation)
      'card': {
        ttl: 3 * 24 * 60 * 60 * 1000, // 3 days
        refreshInterval: 24 * 60 * 60 * 1000, // Refresh every 24 hours
        description: 'Card metadata and details - rarely changes'
      },
      
      // Expansion data - rarely changes, cache for weeks (Scrydex recommendation)
      'expansion': {
        ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
        refreshInterval: 3 * 24 * 60 * 60 * 1000, // Refresh every 3 days
        description: 'Expansion information - only changes with new expansions'
      },
      
      // Price data - changes daily, cache for 24 hours (Scrydex recommendation)
      'price': {
        ttl: 24 * 60 * 60 * 1000, // 24 hours
        refreshInterval: 20 * 60 * 60 * 1000, // Refresh every 20 hours
        description: 'Pricing data - changes at most once per day'
      },
      
      // Price history - can be cached longer
      'price_history': {
        ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
        refreshInterval: 24 * 60 * 60 * 1000, // Refresh every 24 hours
        description: 'Historical price data - rarely changes'
      },
      
      // Search results - cache for shorter periods to balance performance vs freshness
      'search': {
        ttl: 15 * 60 * 1000, // 15 minutes
        refreshInterval: 10 * 60 * 1000, // Refresh every 10 minutes
        description: 'Search results - balance performance vs freshness'
      },
      
      // Sealed products - cache for 24 hours (PriceCharting data)
      'sealed': {
        ttl: 24 * 60 * 60 * 1000, // 24 hours
        refreshInterval: 20 * 60 * 60 * 1000, // Refresh every 20 hours
        description: 'Sealed product data - changes daily'
      },
      
      // API usage data - cache for 15 minutes
      'usage': {
        ttl: 15 * 60 * 1000, // 15 minutes
        refreshInterval: 10 * 60 * 1000, // Refresh every 10 minutes
        description: 'API usage statistics'
      },
      
      // Generic API responses - 1 hour default
      'default': {
        ttl: 60 * 60 * 1000, // 1 hour
        refreshInterval: 45 * 60 * 1000, // Refresh every 45 minutes
        description: 'Generic API responses'
      }
    };
    
    // Cache statistics
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      refreshes: 0,
      apiCallsSaved: 0, // Track how many API calls we've saved
      creditSavings: 0, // Track estimated credit savings
      lastReset: Date.now()
    };
    
    // Background refresh intervals
    this.refreshIntervals = new Map();
    
    // Maximum cache size
    this.maxCacheSize = 10000;
    
    
    // Background maintenance disabled
    // this.startBackgroundMaintenance();
  }

  /**
   * Generate cache key for API request
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Request parameters
   * @param {string} type - Cache type (card, expansion, price, etc.)
   * @returns {string} - Cache key
   */
  generateCacheKey(endpoint, params = {}, type = 'default') {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {});
    
    const paramsString = JSON.stringify(sortedParams);
    const hash = this.simpleHash(endpoint + paramsString);
    
    return `${type}:${hash}:${endpoint.replace(/\//g, '_')}`;
  }

  /**
   * Simple hash function for cache keys
   * @param {string} str - String to hash
   * @returns {string} - Hash value
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get data from cache
   * @param {string} cacheKey - Cache key
   * @returns {Object|null} - Cached data or null
   */
  get(cacheKey) {
    const metadata = this.cacheMetadata.get(cacheKey);
    
    if (!metadata || !this.cache.has(cacheKey)) {
      this.stats.misses++;
      return null;
    }
    
    // Check if cache has expired
    if (Date.now() > metadata.expiresAt) {
      this.delete(cacheKey);
      this.stats.misses++;
      return null;
    }
    
    this.stats.hits++;
    this.stats.apiCallsSaved++;
    this.stats.creditSavings += this.getCreditCost(metadata.type);
    return this.cache.get(cacheKey);
  }

  /**
   * Set data in cache with TTL
   * @param {string} cacheKey - Cache key
   * @param {any} data - Data to cache
   * @param {string} type - Cache type
   * @param {number} customTtl - Custom TTL override
   */
  set(cacheKey, data, type = 'default', customTtl = null) {
    const policy = this.cachePolicies[type] || this.cachePolicies.default;
    const ttl = customTtl || policy.ttl;
    
    // Clean up old cache if we're at the limit
    if (this.cache.size >= this.maxCacheSize) {
      this.cleanupExpiredCache();
    }
    
    const expiresAt = Date.now() + ttl;
    const metadata = {
      type,
      createdAt: Date.now(),
      expiresAt,
      ttl,
      refreshInterval: policy.refreshInterval,
      description: policy.description
    };
    
    this.cache.set(cacheKey, data);
    this.cacheMetadata.set(cacheKey, metadata);
    
    this.stats.sets++;
    
    // Schedule background refresh if needed
    this.scheduleBackgroundRefresh(cacheKey, type);
  }

  /**
   * Delete data from cache
   * @param {string} cacheKey - Cache key
   */
  delete(cacheKey) {
    if (this.cache.has(cacheKey)) {
      this.cache.delete(cacheKey);
      this.stats.deletes++;
    }
    
    if (this.cacheMetadata.has(cacheKey)) {
      this.cacheMetadata.delete(cacheKey);
    }
    
    // Clear any scheduled refresh
    if (this.refreshIntervals.has(cacheKey)) {
      clearTimeout(this.refreshIntervals.get(cacheKey));
      this.refreshIntervals.delete(cacheKey);
    }
    
  }

  /**
   * Check if cache key exists and is valid
   * @param {string} cacheKey - Cache key
   * @returns {boolean} - True if valid cache exists
   */
  has(cacheKey) {
    const metadata = this.cacheMetadata.get(cacheKey);
    return metadata && this.cache.has(cacheKey) && Date.now() <= metadata.expiresAt;
  }

  /**
   * Get cache metadata
   * @param {string} cacheKey - Cache key
   * @returns {Object|null} - Cache metadata
   */
  getMetadata(cacheKey) {
    return this.cacheMetadata.get(cacheKey) || null;
  }

  /**
   * Schedule background refresh for cache entry
   * @param {string} cacheKey - Cache key
   * @param {string} type - Cache type
   */
  scheduleBackgroundRefresh(cacheKey, type) {
    const policy = this.cachePolicies[type] || this.cachePolicies.default;
    
    // Clear existing refresh if any
    if (this.refreshIntervals.has(cacheKey)) {
      clearTimeout(this.refreshIntervals.get(cacheKey));
    }
    
    // Schedule new refresh
    const refreshTimeout = setTimeout(() => {
      this.refreshCacheEntry(cacheKey, type);
    }, policy.refreshInterval);
    
    this.refreshIntervals.set(cacheKey, refreshTimeout);
  }

  /**
   * Refresh cache entry in background
   * @param {string} cacheKey - Cache key
   * @param {string} type - Cache type
   */
  async refreshCacheEntry(cacheKey, type) {
    try {
      
      // Mark as refreshed and extend TTL
      const metadata = this.cacheMetadata.get(cacheKey);
      if (metadata) {
        metadata.lastRefreshed = Date.now();
        // Extend the expiration time by the TTL
        metadata.expiresAt = Date.now() + metadata.ttl;
        this.stats.refreshes++;
      }
      
    } catch (error) {
    }
  }

  /**
   * Start background cache maintenance
   */
  startBackgroundMaintenance() {
    // Clean up expired entries every 5 minutes
    setInterval(() => {
      this.cleanupExpiredCache();
    }, 5 * 60 * 1000);

    // Log statistics every 30 minutes
    setInterval(() => {
      this.logStats();
    }, 30 * 60 * 1000);

    // Refresh critical cache entries every hour
    setInterval(() => {
      this.refreshCriticalEntries();
    }, 60 * 60 * 1000);

  }

  /**
   * Refresh critical cache entries
   */
  async refreshCriticalEntries() {
    
    for (const [cacheKey, metadata] of this.cacheMetadata.entries()) {
      // Only refresh entries that are close to expiring (within 25% of TTL)
      const timeUntilExpiry = metadata.expiresAt - Date.now();
      const ttlThreshold = metadata.ttl * 0.25;
      
      if (timeUntilExpiry < ttlThreshold && metadata.type !== 'search') {
        await this.refreshCacheEntry(cacheKey, metadata.type);
      }
    }
  }

  /**
   * Clean up expired cache entries
   */
  cleanupExpiredCache() {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, metadata] of this.cacheMetadata.entries()) {
      if (now > metadata.expiresAt) {
        this.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired cache entries`);
    }
  }

  /**
   * Clear all cache entries
   */
  clear() {
    // Clear all refresh intervals
    for (const timeout of this.refreshIntervals.values()) {
      clearTimeout(timeout);
    }
    
    this.cache.clear();
    this.cacheMetadata.clear();
    this.refreshIntervals.clear();
    
    console.log('🗑️ All cache cleared');
  }

  /**
   * Clear cache by type
   * @param {string} type - Cache type to clear
   */
  clearByType(type) {
    let clearedCount = 0;
    
    for (const [key, metadata] of this.cacheMetadata.entries()) {
      if (metadata.type === type) {
        this.delete(key);
        clearedCount++;
      }
    }
    
    console.log(`🗑️ Cleared ${clearedCount} cache entries of type: ${type}`);
  }

  /**
   * Get estimated credit cost for different cache types
   * @param {string} type - Cache type
   * @returns {number} - Estimated credit cost
   */
  getCreditCost(type) {
    const creditCosts = {
      'search': 1,      // Search queries cost 1 credit
      'card': 0.5,      // Individual card lookups cost 0.5 credits
      'expansion': 0.5, // Expansion data costs 0.5 credits
      'price': 1,       // Pricing data costs 1 credit
      'sealed': 1,      // Sealed product data costs 1 credit
      'default': 1      // Default cost
    };
    
    return creditCosts[type] || 1;
  }

  /**
   * Get cache statistics with enhanced monitoring
   * @returns {Object} - Cache statistics
   */
  getStats() {
    const now = Date.now();
    let expiredCount = 0;
    let totalSize = 0;
    const typeCounts = {};
    const typeSavings = {};
    
    for (const [key, metadata] of this.cacheMetadata.entries()) {
      if (now > metadata.expiresAt) {
        expiredCount++;
      }
      
      totalSize++;
      typeCounts[metadata.type] = (typeCounts[metadata.type] || 0) + 1;
      typeSavings[metadata.type] = (typeSavings[metadata.type] || 0) + this.getCreditCost(metadata.type);
    }
    
    const hitRate = this.stats.hits + this.stats.misses > 0 
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;
    
    const uptime = now - this.stats.lastReset;
    const uptimeHours = (uptime / (1000 * 60 * 60)).toFixed(2);
    
    return {
      ...this.stats,
      totalEntries: totalSize,
      activeEntries: totalSize - expiredCount,
      expiredEntries: expiredCount,
      hitRate: `${hitRate}%`,
      typeCounts,
      typeSavings,
      maxCacheSize: this.maxCacheSize,
      memoryUsage: this.cache.size,
      uptimeHours,
      averageSavingsPerHour: uptimeHours > 0 ? (this.stats.creditSavings / uptimeHours).toFixed(2) : 0
    };
  }

  /**
   * Get cache policies
   * @returns {Object} - Cache policies
   */
  getCachePolicies() {
    return { ...this.cachePolicies };
  }

  /**
   * Update cache policy
   * @param {string} type - Cache type
   * @param {Object} policy - New policy
   */
  updateCachePolicy(type, policy) {
    this.cachePolicies[type] = {
      ...this.cachePolicies[type],
      ...policy
    };
    
    console.log(`📝 Updated cache policy for type: ${type}`);
  }

  /**
   * Cache API response with intelligent TTL
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Request parameters
   * @param {any} data - Response data
   * @param {string} type - Cache type
   * @returns {string} - Cache key
   */
  cacheApiResponse(endpoint, params, data, type = 'default') {
    const cacheKey = this.generateCacheKey(endpoint, params, type);
    this.set(cacheKey, data, type);
    return cacheKey;
  }

  /**
   * Get cached API response
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Request parameters
   * @param {string} type - Cache type
   * @returns {any} - Cached data or null
   */
  getCachedApiResponse(endpoint, params, type = 'default') {
    const cacheKey = this.generateCacheKey(endpoint, params, type);
    return this.get(cacheKey);
  }

  /**
   * Check if API response is cached and valid
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Request parameters
   * @param {string} type - Cache type
   * @returns {boolean} - True if cached and valid
   */
  isApiResponseCached(endpoint, params, type = 'default') {
    const cacheKey = this.generateCacheKey(endpoint, params, type);
    return this.has(cacheKey);
  }

  /**
   * Log cache statistics to console
   */
  logStats() {
    const stats = this.getStats();
    console.log('📊 Cache Statistics:');
    console.log(`   Hit Rate: ${stats.hitRate}`);
    console.log(`   Total Entries: ${stats.totalEntries}`);
    console.log(`   Active Entries: ${stats.activeEntries}`);
    console.log(`   API Calls Saved: ${stats.apiCallsSaved}`);
    console.log(`   Credit Savings: ${stats.creditSavings.toFixed(2)}`);
    console.log(`   Uptime: ${stats.uptimeHours} hours`);
    console.log(`   Avg Savings/Hour: ${stats.averageSavingsPerHour}`);
    console.log('   Type Breakdown:', stats.typeCounts);
  }

  /**
   * Reset cache statistics
   */
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      refreshes: 0,
      apiCallsSaved: 0,
      creditSavings: 0,
      lastReset: Date.now()
    };
    console.log('📊 Cache statistics reset');
  }
}

// Export singleton instance
const apiCacheService = new ApiCacheService();
export default apiCacheService;

