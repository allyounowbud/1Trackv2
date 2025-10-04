/**
 * Image Preload Service
 * Preloads images for better user experience
 * Implements Scrydex best practices for image management
 */

import imageCacheService from './imageCacheService';
import scrydexApiService from './scrydexApiService';

class ImagePreloadService {
  constructor() {
    this.preloadQueue = [];
    this.isPreloading = false;
    this.preloadBatchSize = 10; // Preload 10 images at a time
    this.preloadDelay = 100; // 100ms delay between batches
    
    console.log('🚀 ImagePreloadService initialized');
  }

  /**
   * Preload images for search results
   * @param {Array} searchResults - Array of search results with image URLs
   * @param {string} type - Image type (card, expansion, etc.)
   * @param {string} size - Preferred size
   */
  async preloadSearchResults(searchResults, type = 'card', size = 'card') {
    if (!searchResults || searchResults.length === 0) return;

    console.log(`🚀 Preloading ${searchResults.length} images from search results...`);

    // Extract image URLs from search results
    const imageUrls = searchResults
      .map(result => {
        if (result.image_url) return result.image_url;
        if (result.images && result.images.small) return result.images.small;
        if (result.images && result.images.normal) return result.images.normal;
        if (result.images && result.images.large) return result.images.large;
        return null;
      })
      .filter(url => url !== null)
      .slice(0, 50); // Limit to first 50 images to avoid overwhelming

    if (imageUrls.length === 0) {
      console.log('⚠️ No image URLs found in search results');
      return;
    }

    await this.preloadImages(imageUrls, type, size);
  }

  /**
   * Preload images for expansion results
   * @param {Array} expansions - Array of expansion objects
   */
  async preloadExpansions(expansions) {
    if (!expansions || expansions.length === 0) return;

    console.log(`🚀 Preloading ${expansions.length} expansion images...`);

    const imageUrls = expansions
      .map(expansion => {
        if (expansion.logo) return expansion.logo;
        if (expansion.symbol) return expansion.symbol;
        return null;
      })
      .filter(url => url !== null);

    if (imageUrls.length === 0) {
      console.log('⚠️ No expansion image URLs found');
      return;
    }

    await this.preloadImages(imageUrls, 'expansion', 'card');
  }

  /**
   * Preload images in batches to avoid overwhelming the system
   * @param {Array} imageUrls - Array of image URLs to preload
   * @param {string} type - Image type
   * @param {string} size - Preferred size
   */
  async preloadImages(imageUrls, type = 'card', size = 'card') {
    if (this.isPreloading) {
      console.log('⏳ Preloading already in progress, queuing images...');
      this.preloadQueue.push(...imageUrls);
      return;
    }

    this.isPreloading = true;

    try {
      // Process images in batches
      for (let i = 0; i < imageUrls.length; i += this.preloadBatchSize) {
        const batch = imageUrls.slice(i, i + this.preloadBatchSize);
        
        console.log(`📦 Preloading batch ${Math.floor(i / this.preloadBatchSize) + 1}/${Math.ceil(imageUrls.length / this.preloadBatchSize)} (${batch.length} images)`);
        
        // Preload batch in parallel
        const batchPromises = batch.map(url => 
          imageCacheService.getCachedImage(url, type, size).catch(error => {
            console.warn(`⚠️ Failed to preload image: ${url}`, error.message);
            return null;
          })
        );

        await Promise.allSettled(batchPromises);

        // Small delay between batches to be respectful to the API
        if (i + this.preloadBatchSize < imageUrls.length) {
          await new Promise(resolve => setTimeout(resolve, this.preloadDelay));
        }
      }

      console.log(`✅ Preloaded ${imageUrls.length} images successfully`);

      // Process any queued images
      if (this.preloadQueue.length > 0) {
        console.log(`🔄 Processing ${this.preloadQueue.length} queued images...`);
        const queuedUrls = [...this.preloadQueue];
        this.preloadQueue = [];
        await this.preloadImages(queuedUrls, type, size);
      }

    } catch (error) {
      console.error('❌ Error during image preloading:', error);
    } finally {
      this.isPreloading = false;
    }
  }

  /**
   * Preload images for a specific card's variants
   * @param {Object} card - Card object with variants
   */
  async preloadCardVariants(card) {
    if (!card || !card.variants) return;

    console.log(`🚀 Preloading variants for card: ${card.name}`);

    const variantUrls = card.variants
      .map(variant => {
        if (variant.image_url) return variant.image_url;
        if (variant.images && variant.images.large) return variant.images.large;
        return null;
      })
      .filter(url => url !== null);

    if (variantUrls.length === 0) {
      console.log('⚠️ No variant image URLs found');
      return;
    }

    await this.preloadImages(variantUrls, 'card', 'large');
  }

  /**
   * Preload images for trending/popular cards
   * @param {string} game - Game type (pokemon, magic, etc.)
   * @param {number} limit - Number of cards to preload
   */
  async preloadTrendingCards(game = 'pokemon', limit = 20) {
    try {
      console.log(`🚀 Preloading ${limit} trending ${game} cards...`);

      // Search for popular cards (you can customize this query)
      const searchResults = await scrydexApiService.searchCards('*', {
        game: game,
        page_size: limit,
        select: 'id,name,images,rarity',
        orderBy: 'release_date'
      });

      if (searchResults && searchResults.data) {
        await this.preloadSearchResults(searchResults.data, 'card', 'normal');
      }

    } catch (error) {
      console.error('❌ Failed to preload trending cards:', error);
    }
  }

  /**
   * Preload images for recent expansions
   * @param {string} game - Game type
   * @param {number} limit - Number of expansions to preload
   */
  async preloadRecentExpansions(game = 'pokemon', limit = 10) {
    try {
      console.log(`🚀 Preloading ${limit} recent ${game} expansions...`);

      const expansions = await scrydexApiService.getExpansions({
        game: game,
        page_size: limit,
        select: 'id,name,logo,symbol,release_date',
        orderBy: 'release_date'
      });

      if (expansions && expansions.data) {
        await this.preloadExpansions(expansions.data);
      }

    } catch (error) {
      console.error('❌ Failed to preload recent expansions:', error);
    }
  }

  /**
   * Smart preloading based on user behavior
   * @param {Object} userContext - User context (current page, search history, etc.)
   */
  async smartPreload(userContext = {}) {
    try {
      console.log('🧠 Smart preloading based on user context...');

      const preloadPromises = [];

      // Preload trending cards if user is on search page
      if (userContext.currentPage === 'search') {
        preloadPromises.push(this.preloadTrendingCards('pokemon', 15));
      }

      // Preload recent expansions if user is browsing expansions
      if (userContext.currentPage === 'expansions') {
        preloadPromises.push(this.preloadRecentExpansions('pokemon', 8));
      }

      // Preload based on search history
      if (userContext.recentSearches && userContext.recentSearches.length > 0) {
        const recentSearch = userContext.recentSearches[0];
        if (recentSearch.results) {
          preloadPromises.push(
            this.preloadSearchResults(recentSearch.results.slice(0, 10), 'card', 'normal')
          );
        }
      }

      await Promise.allSettled(preloadPromises);
      console.log('✅ Smart preloading complete');

    } catch (error) {
      console.error('❌ Smart preloading failed:', error);
    }
  }

  /**
   * Clear preload queue
   */
  clearPreloadQueue() {
    this.preloadQueue = [];
    console.log('🗑️ Preload queue cleared');
  }

  /**
   * Get preload statistics
   * @returns {Object} - Preload statistics
   */
  getPreloadStats() {
    return {
      isPreloading: this.isPreloading,
      queueSize: this.preloadQueue.length,
      batchSize: this.preloadBatchSize,
      batchDelay: this.preloadDelay
    };
  }
}

// Export singleton instance
const imagePreloadService = new ImagePreloadService();
export default imagePreloadService;

