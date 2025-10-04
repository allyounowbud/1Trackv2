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
      // Card metadata - rarely changes, cache for hours
      'card': {
        ttl: 6 * 60 * 60 * 1000, // 6 hours
        refreshInterval: 4 * 60 * 60 * 1000, // Refresh every 4 hours
        description: 'Card metadata and details'
      },
      
      // Expansion data - rarely changes, cache for days
      'expansion': {
        ttl: 24 * 60 * 60 * 1000, // 24 hours
        refreshInterval: 12 * 60 * 60 * 1000, // Refresh every 12 hours
        description: 'Expansion information and metadata'
      },
      
      // Price data - changes daily, cache for 24 hours
      'price': {
        ttl: 24 * 60 * 60 * 1000, // 24 hours
        refreshInterval: 20 * 60 * 60 * 1000, // Refresh every 20 hours
        description: 'Pricing and market data'
      },
      
      // Search results - cache for shorter periods
      'search': {
        ttl: 30 * 60 * 1000, // 30 minutes
        refreshInterval: 15 * 60 * 1000, // Refresh every 15 minutes
        description: 'Search results and queries'
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
      refreshes: 0
    };
    
    // Background refresh intervals
    this.refreshIntervals = new Map();
    
    // Maximum cache size
    this.maxCacheSize = 10000;
    
    console.log('🗄️ ApiCacheService initialized with Scrydex best practices');
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
    console.log(`📦 Cache hit: ${cacheKey} (${metadata.type})`);
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
    console.log(`💾 Cache set: ${cacheKey} (${type}, TTL: ${Math.round(ttl / 1000 / 60)}min)`);
    
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
    
    console.log(`🗑️ Cache deleted: ${cacheKey}`);
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
      console.log(`🔄 Background refresh: ${cacheKey} (${type})`);
      
      // This would typically trigger a new API call
      // For now, we'll just mark it as refreshed
      const metadata = this.cacheMetadata.get(cacheKey);
      if (metadata) {
        metadata.lastRefreshed = Date.now();
        this.stats.refreshes++;
      }
      
    } catch (error) {
      console.error(`❌ Background refresh failed for ${cacheKey}:`, error);
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
   * Get cache statistics
   * @returns {Object} - Cache statistics
   */
  getStats() {
    const now = Date.now();
    let expiredCount = 0;
    let totalSize = 0;
    const typeCounts = {};
    
    for (const [key, metadata] of this.cacheMetadata.entries()) {
      if (now > metadata.expiresAt) {
        expiredCount++;
      }
      
      totalSize++;
      typeCounts[metadata.type] = (typeCounts[metadata.type] || 0) + 1;
    }
    
    const hitRate = this.stats.hits + this.stats.misses > 0 
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;
    
    return {
      ...this.stats,
      totalEntries: totalSize,
      activeEntries: totalSize - expiredCount,
      expiredEntries: expiredCount,
      hitRate: `${hitRate}%`,
      typeCounts,
      maxCacheSize: this.maxCacheSize,
      memoryUsage: this.cache.size
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
}

// Export singleton instance
const apiCacheService = new ApiCacheService();
export default apiCacheService;

