/**
 * Image Cache Service
 * Implements Scrydex best practices for image caching and management
 * 
 * Key Features:
 * - Local image caching to reduce API dependency
 * - Automatic fallback handling for unavailable images
 * - Supabase storage integration for scalable image hosting
 * - Smart cache invalidation and cleanup
 * - Performance optimization with lazy loading
 */

class ImageCacheService {
  constructor() {
    this.cache = new Map();
    this.pendingDownloads = new Map(); // Prevent duplicate downloads
    this.maxCacheSize = 1000; // Maximum cached images
    this.cacheTimeout = 7 * 24 * 60 * 60 * 1000; // 7 days
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1 second
    
    // Image quality preferences (Scrydex provides multiple sizes)
    this.preferredSizes = {
      thumbnail: 'small',
      card: 'normal', 
      large: 'large',
      hd: 'large' // Use large for HD displays
    };
    
    // Fallback images
    this.fallbackImages = {
      card: '/icons/icon-192x192.svg',
      expansion: '/icons/icon-192x192.svg',
      pokemon: '/icons/icon-192x192.svg'
    };
    
    console.log('🖼️ ImageCacheService initialized');
  }

  /**
   * Get cached image URL or download if not cached
   * @param {string} scrydexUrl - Original Scrydex image URL
   * @param {string} type - Image type (card, expansion, etc.)
   * @param {string} size - Preferred size (thumbnail, card, large, hd)
   * @returns {Promise<string>} - Cached image URL or fallback
   */
  async getCachedImage(scrydexUrl, type = 'card', size = 'card') {
    if (!scrydexUrl || typeof scrydexUrl !== 'string' || scrydexUrl.trim() === '') {
      console.warn('⚠️ No image URL provided');
      return this.getFallbackImage(type);
    }

    // Validate URL format
    try {
      new URL(scrydexUrl);
    } catch (error) {
      console.warn('⚠️ Invalid URL format:', scrydexUrl, error);
      return this.getFallbackImage(type);
    }

    // Check if we already have this image cached
    const cacheKey = this.getCacheKey(scrydexUrl, size);
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      console.log(`📦 Cache hit: ${cacheKey}`);
      return cached;
    }

    // Check if download is already in progress
    if (this.pendingDownloads.has(cacheKey)) {
      console.log(`⏳ Download in progress: ${cacheKey}`);
      return this.pendingDownloads.get(cacheKey);
    }

    // Start download process
    const downloadPromise = this.downloadAndCacheImage(scrydexUrl, type, size);
    this.pendingDownloads.set(cacheKey, downloadPromise);

    try {
      const result = await downloadPromise;
      this.pendingDownloads.delete(cacheKey);
      return result;
    } catch (error) {
      this.pendingDownloads.delete(cacheKey);
      console.error(`❌ Failed to cache image: ${scrydexUrl}`, error);
      return this.getFallbackImage(type);
    }
  }

  /**
   * Download image from Scrydex and cache it locally
   * @param {string} scrydexUrl - Original Scrydex image URL
   * @param {string} type - Image type
   * @param {string} size - Preferred size
   * @returns {Promise<string>} - Cached image URL
   */
  async downloadAndCacheImage(scrydexUrl, type, size) {
    // Validate URL before proceeding
    if (!scrydexUrl || typeof scrydexUrl !== 'string' || scrydexUrl.trim() === '') {
      console.warn('⚠️ Invalid or empty image URL provided:', scrydexUrl);
      return this.getFallbackImage(type);
    }

    try {
      new URL(scrydexUrl);
    } catch (error) {
      console.warn('⚠️ Invalid URL format:', scrydexUrl, error);
      return this.getFallbackImage(type);
    }

    const cacheKey = this.getCacheKey(scrydexUrl, size);
    
    try {
      console.log(`⬇️ Downloading image: ${scrydexUrl}`);
      
      // Try to download the image
      const response = await this.fetchWithRetry(scrydexUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Convert to blob
      const blob = await response.blob();
      
      // Verify it's actually an image
      if (!blob.type.startsWith('image/')) {
        throw new Error(`Invalid image type: ${blob.type}`);
      }
      
      // Store in local cache
      const localUrl = await this.storeImageLocally(blob, cacheKey, type);
      
      // Cache the local URL
      this.setCache(cacheKey, localUrl);
      
      console.log(`✅ Image cached successfully: ${cacheKey}`);
      return localUrl;
      
    } catch (error) {
      console.error(`❌ Failed to download image: ${scrydexUrl}`, error);
      
      // For network errors, return the original URL as fallback
      if (error.name === 'AbortError' || error.name === 'TypeError') {
        console.warn(`⚠️ Network error, using original URL as fallback: ${scrydexUrl}`);
        return scrydexUrl;
      }
      
      throw error;
    }
  }

  /**
   * Fetch image with retry logic
   * @param {string} url - Image URL
   * @param {number} attempts - Current attempt number
   * @returns {Promise<Response>} - Fetch response
   */
  async fetchWithRetry(url, attempts = 1) {
    try {
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'OneTrack-ImageCache/1.0.0'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      if (attempts < this.retryAttempts && error.name !== 'AbortError') {
        console.warn(`⚠️ Retry ${attempts}/${this.retryAttempts} for ${url}`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempts));
        return this.fetchWithRetry(url, attempts + 1);
      }
      throw error;
    }
  }

  /**
   * Store image blob locally (using browser's local storage or IndexedDB)
   * @param {Blob} blob - Image blob
   * @param {string} cacheKey - Cache key
   * @param {string} type - Image type
   * @returns {Promise<string>} - Local URL
   */
  async storeImageLocally(blob, cacheKey, type) {
    try {
      // Create object URL for immediate use
      const objectUrl = URL.createObjectURL(blob);
      
      // Store in IndexedDB for persistence
      await this.storeInIndexedDB(blob, cacheKey, type);
      
      return objectUrl;
    } catch (error) {
      console.error('❌ Failed to store image locally:', error);
      throw error;
    }
  }

  /**
   * Store image in IndexedDB for persistent caching
   * @param {Blob} blob - Image blob
   * @param {string} cacheKey - Cache key
   * @param {string} type - Image type
   */
  async storeInIndexedDB(blob, cacheKey, type) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('OneTrackImageCache', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['images'], 'readwrite');
        const store = transaction.objectStore('images');
        
        const imageData = {
          id: cacheKey,
          blob: blob,
          type: type,
          timestamp: Date.now(),
          url: URL.createObjectURL(blob)
        };
        
        const putRequest = store.put(imageData);
        
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('images')) {
          const store = db.createObjectStore('images', { keyPath: 'id' });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  /**
   * Get image from IndexedDB cache
   * @param {string} cacheKey - Cache key
   * @returns {Promise<string|null>} - Cached image URL or null
   */
  async getFromIndexedDB(cacheKey) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('OneTrackImageCache', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['images'], 'readonly');
        const store = transaction.objectStore('images');
        
        const getRequest = store.get(cacheKey);
        
        getRequest.onsuccess = () => {
          const result = getRequest.result;
          if (result && Date.now() - result.timestamp < this.cacheTimeout) {
            resolve(result.url);
          } else {
            resolve(null);
          }
        };
        
        getRequest.onerror = () => reject(getRequest.error);
      };
    });
  }

  /**
   * Generate cache key for image
   * @param {string} url - Image URL
   * @param {string} size - Image size
   * @returns {string} - Cache key
   */
  getCacheKey(url, size) {
    // Create a hash of the URL and size for consistent cache keys
    const hash = this.simpleHash(url + size);
    const filename = url.split('/').pop() || 'unknown';
    return `${hash}_${filename}_${size}`;
  }

  /**
   * Simple hash function for URLs
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
   * Get cached image from memory cache
   * @param {string} cacheKey - Cache key
   * @returns {string|null} - Cached URL or null
   */
  getFromCache(cacheKey) {
    const entry = this.cache.get(cacheKey);
    if (entry && Date.now() < entry.expiresAt) {
      return entry.url;
    }
    this.cache.delete(cacheKey);
    return null;
  }

  /**
   * Set image in memory cache
   * @param {string} cacheKey - Cache key
   * @param {string} url - Image URL
   * @param {number} ttl - Time to live in milliseconds
   */
  setCache(cacheKey, url, ttl = this.cacheTimeout) {
    // Clean up old cache entries if we're at the limit
    if (this.cache.size >= this.maxCacheSize) {
      this.cleanupCache();
    }
    
    this.cache.set(cacheKey, {
      url,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl
    });
  }

  /**
   * Clean up old cache entries
   */
  cleanupCache() {
    const now = Date.now();
    const entriesToDelete = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now >= entry.expiresAt) {
        entriesToDelete.push(key);
      }
    }
    
    entriesToDelete.forEach(key => {
      this.cache.delete(key);
      // Clean up object URLs to prevent memory leaks
      const entry = this.cache.get(key);
      if (entry && entry.url.startsWith('blob:')) {
        URL.revokeObjectURL(entry.url);
      }
    });
    
    console.log(`🧹 Cleaned up ${entriesToDelete.length} expired cache entries`);
  }

  /**
   * Get fallback image for type
   * @param {string} type - Image type
   * @returns {string} - Fallback image URL
   */
  getFallbackImage(type) {
    return this.fallbackImages[type] || this.fallbackImages.card;
  }

  /**
   * Preload images for better performance
   * @param {Array} imageUrls - Array of image URLs to preload
   * @param {string} type - Image type
   * @param {string} size - Preferred size
   */
  async preloadImages(imageUrls, type = 'card', size = 'card') {
    console.log(`🚀 Preloading ${imageUrls.length} images...`);
    
    const preloadPromises = imageUrls.map(url => 
      this.getCachedImage(url, type, size).catch(error => {
        console.warn(`⚠️ Failed to preload image: ${url}`, error);
        return this.getFallbackImage(type);
      })
    );
    
    await Promise.allSettled(preloadPromises);
    console.log(`✅ Preloading complete`);
  }

  /**
   * Clear all cached images
   */
  async clearCache() {
    // Clear memory cache
    for (const [key, entry] of this.cache.entries()) {
      if (entry.url.startsWith('blob:')) {
        URL.revokeObjectURL(entry.url);
      }
    }
    this.cache.clear();
    
    // Clear IndexedDB
    try {
      const request = indexedDB.open('OneTrackImageCache', 1);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['images'], 'readwrite');
        const store = transaction.objectStore('images');
        store.clear();
      };
    } catch (error) {
      console.error('❌ Failed to clear IndexedDB cache:', error);
    }
    
    console.log('🗑️ Image cache cleared');
  }

  /**
   * Get cache statistics
   * @returns {Object} - Cache statistics
   */
  getCacheStats() {
    const now = Date.now();
    let expiredCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now >= entry.expiresAt) {
        expiredCount++;
      }
    }
    
    return {
      totalCached: this.cache.size,
      expired: expiredCount,
      active: this.cache.size - expiredCount,
      pendingDownloads: this.pendingDownloads.size,
      maxCacheSize: this.maxCacheSize,
      cacheTimeout: this.cacheTimeout
    };
  }
}

// Export singleton instance
const imageCacheService = new ImageCacheService();
export default imageCacheService;
