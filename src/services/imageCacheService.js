/**
 * Image Cache Service
 * Implements Scrydex image caching best practices for optimal performance
 * 
 * Key Features:
 * - Local image caching with TTL
 * - Fallback image handling
 * - CDN optimization
 * - Copyright compliance
 * - Performance monitoring
 */

class ImageCacheService {
  constructor() {
    // Image cache storage
    this.imageCache = new Map();
    this.cacheMetadata = new Map();
    
    // Cache policies based on Scrydex best practices
    this.cachePolicies = {
      // Card images - cache for weeks (rarely change)
      'card': {
        ttl: 30 * 24 * 60 * 60 * 1000, // 30 days
        description: 'Card images - rarely change'
      },
      
      // Expansion logos - cache for months (rarely change)
      'expansion': {
        ttl: 90 * 24 * 60 * 60 * 1000, // 90 days
        description: 'Expansion logos - rarely change'
      },
      
      // Game logos - cache for months (rarely change)
      'game': {
        ttl: 90 * 24 * 60 * 60 * 1000, // 90 days
        description: 'Game logos - rarely change'
      },
      
      // Default policy
      'default': {
        ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
        description: 'Generic images'
      }
    };
    
    // Cache statistics
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      errors: 0,
      bandwidthSaved: 0, // Track bandwidth savings
      lastReset: Date.now()
    };
    
    // Maximum cache size (in MB)
    this.maxCacheSize = 100; // 100MB
    this.currentCacheSize = 0;
    
    // Fallback images
    this.fallbackImages = {
      card: '/icons/icon-192x192.svg',
      expansion: '/icons/icon-192x192.svg',
      game: '/icons/icon-192x192.svg',
      default: '/icons/icon-192x192.svg'
    };
  }

  /**
   * Get cache policy for image type
   * @param {string} imageType - Type of image (card, expansion, game)
   * @returns {Object} Cache policy
   */
  getCachePolicy(imageType) {
    return this.cachePolicies[imageType] || this.cachePolicies['default'];
  }

  /**
   * Generate cache key for image
   * @param {string} imageUrl - Image URL
   * @param {string} imageType - Type of image
   * @returns {string} Cache key
   */
  generateCacheKey(imageUrl, imageType = 'default') {
    return `${imageType}:${imageUrl}`;
  }

  /**
   * Check if image is cached and valid
   * @param {string} imageUrl - Image URL
   * @param {string} imageType - Type of image
   * @returns {Object|null} Cached image data or null
   */
  getCachedImage(imageUrl, imageType = 'default') {
    const cacheKey = this.generateCacheKey(imageUrl, imageType);
    const metadata = this.cacheMetadata.get(cacheKey);
    
    if (!metadata) {
      this.stats.misses++;
      return null;
    }
    
    // Check if cache is expired
    if (Date.now() > metadata.expiresAt) {
      this.removeCachedImage(cacheKey);
      this.stats.misses++;
      return null;
    }
    
    const cachedData = this.imageCache.get(cacheKey);
    if (cachedData) {
      this.stats.hits++;
      return {
        ...cachedData,
        cached: true,
        cachedAt: metadata.cachedAt
      };
    }
    
    this.stats.misses++;
    return null;
  }

  /**
   * Cache image data
   * @param {string} imageUrl - Image URL
   * @param {string} imageType - Type of image
   * @param {Object} imageData - Image data to cache
   * @returns {boolean} Success status
   */
  setCachedImage(imageUrl, imageType = 'default', imageData) {
    try {
      const cacheKey = this.generateCacheKey(imageUrl, imageType);
      const policy = this.getCachePolicy(imageType);
      
      // Check cache size limit
      if (this.currentCacheSize >= this.maxCacheSize * 1024 * 1024) {
        this.cleanupOldestCache();
      }
      
      // Store image data
      this.imageCache.set(cacheKey, {
        url: imageUrl,
        type: imageType,
        data: imageData,
        size: JSON.stringify(imageData).length
      });
      
      // Store metadata
      this.cacheMetadata.set(cacheKey, {
        cachedAt: Date.now(),
        expiresAt: Date.now() + policy.ttl,
        imageType,
        size: JSON.stringify(imageData).length
      });
      
      this.currentCacheSize += JSON.stringify(imageData).length;
      this.stats.sets++;
      
      return true;
    } catch (error) {
      console.error('Error caching image:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Remove cached image
   * @param {string} cacheKey - Cache key
   */
  removeCachedImage(cacheKey) {
    const metadata = this.cacheMetadata.get(cacheKey);
    if (metadata) {
      this.currentCacheSize -= metadata.size;
    }
    
    this.imageCache.delete(cacheKey);
    this.cacheMetadata.delete(cacheKey);
  }

  /**
   * Clean up oldest cache entries
   */
  cleanupOldestCache() {
    const entries = Array.from(this.cacheMetadata.entries())
      .sort((a, b) => a[1].cachedAt - b[1].cachedAt);
    
    // Remove oldest 10% of cache
    const toRemove = Math.ceil(entries.length * 0.1);
    for (let i = 0; i < toRemove; i++) {
      this.removeCachedImage(entries[i][0]);
    }
  }

  /**
   * Get fallback image for type
   * @param {string} imageType - Type of image
   * @returns {string} Fallback image URL
   */
  getFallbackImage(imageType = 'default') {
    return this.fallbackImages[imageType] || this.fallbackImages.default;
  }

  /**
   * Validate image URL
   * @param {string} imageUrl - Image URL to validate
   * @returns {boolean} Valid status
   */
  isValidImageUrl(imageUrl) {
    if (!imageUrl || typeof imageUrl !== 'string') {
      return false;
    }
    
    try {
      new URL(imageUrl);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests * 100).toFixed(2) : 0;
    
    return {
      ...this.stats,
      totalRequests,
      hitRate: `${hitRate}%`,
      cacheSize: `${(this.currentCacheSize / 1024 / 1024).toFixed(2)}MB`,
      maxCacheSize: `${this.maxCacheSize}MB`,
      uptime: Date.now() - this.stats.lastReset
    };
  }

  /**
   * Clear all cache
   */
  clearCache() {
    this.imageCache.clear();
    this.cacheMetadata.clear();
    this.currentCacheSize = 0;
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      errors: 0,
      bandwidthSaved: 0,
      lastReset: Date.now()
    };
  }

  /**
   * Clean up expired cache entries
   */
  cleanupExpiredCache() {
    const now = Date.now();
    const expiredKeys = [];
    
    for (const [key, metadata] of this.cacheMetadata.entries()) {
      if (now > metadata.expiresAt) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => this.removeCachedImage(key));
    
    if (expiredKeys.length > 0) {
      console.log(`🗑️ Cleaned up ${expiredKeys.length} expired image cache entries`);
    }
  }
}

// Export singleton instance
const imageCacheService = new ImageCacheService();

// Clean up expired cache every hour
setInterval(() => {
  imageCacheService.cleanupExpiredCache();
}, 60 * 60 * 1000);

export default imageCacheService;

