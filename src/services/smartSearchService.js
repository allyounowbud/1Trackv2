/**
 * Smart Search Service - Intelligent API coordination for complete search functionality
 * 
 * This service coordinates multiple APIs to provide:
 * - Complete expansion data (all cards + sealed products)
 * - Accurate pricing from multiple sources
 * - High-quality images
 * - Smart caching and rate limiting
 * - Fallback strategies for API failures
 */

import tcgGoApiService from './tcgGoApiService.js';
import { marketDataService } from './marketDataService.js';
import { getProductImages } from './hybridImageService.js';

class SmartSearchService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 6 * 60 * 60 * 1000; // 6 hours
    this.apiCallQueue = [];
    this.isProcessingQueue = false;
    this.rateLimitDelay = 100; // 100ms between API calls
    
    // API priorities and fallbacks
    this.apiConfig = {
      expansions: {
        primary: 'tcgGo',
        fallbacks: []
      },
      cards: {
        primary: 'tcgGo',
        fallbacks: ['marketData']
      },
      products: {
        primary: 'tcgGo', 
        fallbacks: ['marketData']
      },
      pricing: {
        primary: 'tcgGo', // TCG Go has TCGPlayer + CardMarket data
        fallbacks: ['marketData']
      },
      sealedPricing: {
        primary: 'priceCharting', // PriceCharting has most accurate sealed product pricing
        fallbacks: ['tcgGo', 'marketData']
      },
      images: {
        primary: 'hybrid', // Hybrid service with multiple sources
        fallbacks: []
      }
    };
  }

  /**
   * Get all available expansions with complete metadata
   */
  async getAllExpansions() {
    const cacheKey = 'all_expansions';
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log('📦 Using cached expansions');
      return cached;
    }

    try {
      console.log('🔍 Fetching all expansions...');
      const expansions = await tcgGoApiService.getAllExpansions();
      
      // Enhance with additional metadata
      const enhancedExpansions = expansions.map(expansion => ({
        ...expansion,
        // Add estimated counts for better UX
        estimatedCards: expansion.cardCount || 0,
        estimatedProducts: expansion.productCount || 0,
        // Add release date formatting
        releaseDate: expansion.released_at ? new Date(expansion.released_at).toLocaleDateString() : 'Unknown',
        // Add popularity score based on name patterns
        popularity: this.calculatePopularityScore(expansion.name)
      }));

      // Sort by popularity and release date
      const sortedExpansions = enhancedExpansions.sort((a, b) => {
        if (b.popularity !== a.popularity) {
          return b.popularity - a.popularity;
        }
        return new Date(b.released_at || 0) - new Date(a.released_at || 0);
      });

      this.setCache(cacheKey, sortedExpansions);
      console.log(`✅ Loaded ${sortedExpansions.length} expansions`);
      return sortedExpansions;
    } catch (error) {
      console.error('❌ Error fetching expansions:', error);
      throw error;
    }
  }

  /**
   * Get complete expansion data (all cards + products) with smart loading
   */
  async getExpansionData(expansionId, options = {}) {
    const {
      sort = 'relevance',
      filter = 'all',
      maxCards = 1000,
      maxProducts = 500,
      includeImages = true,
      includePricing = true
    } = options;

    const cacheKey = `expansion_${expansionId}_${sort}_${filter}_${maxCards}_${maxProducts}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log(`📦 Using cached expansion data for ${expansionId}`);
      return cached;
    }

    try {
      console.log(`🔍 Loading complete expansion data for ${expansionId}...`);
      
      // Fetch cards and products in parallel
      const [cardsResult, productsResult] = await Promise.allSettled([
        this.getExpansionCards(expansionId, { sort, maxResults: maxCards, includeImages, includePricing }),
        this.getExpansionProducts(expansionId, { sort, maxResults: maxProducts, includeImages, includePricing })
      ]);

      const cards = cardsResult.status === 'fulfilled' ? cardsResult.value : [];
      const products = productsResult.status === 'fulfilled' ? productsResult.value : [];

      // Log any failures
      if (cardsResult.status === 'rejected') {
        console.warn('⚠️ Failed to load cards:', cardsResult.reason);
      }
      if (productsResult.status === 'rejected') {
        console.warn('⚠️ Failed to load products:', productsResult.reason);
      }

      // Combine and process results
      let allItems = [...cards, ...products];

      // Apply filtering
      if (filter !== 'all') {
        allItems = allItems.filter(item => {
          if (filter === 'sealed') return item.type === 'sealed';
          if (filter === 'singles') return item.type === 'singles';
          return true;
        });
      }

      // Apply sorting
      allItems = this.sortItems(allItems, sort);

      const result = {
        cards: cards,
        products: products,
        allItems: allItems,
        totalCards: cards.length,
        totalProducts: products.length,
        totalItems: allItems.length,
        expansionId: expansionId,
        sort: sort,
        filter: filter,
        loadedAt: new Date().toISOString()
      };

      this.setCache(cacheKey, result);
      console.log(`✅ Loaded expansion data: ${cards.length} cards, ${products.length} products`);
      return result;
    } catch (error) {
      console.error('❌ Error loading expansion data:', error);
      throw error;
    }
  }

  /**
   * Get expansion cards with enhanced data
   */
  async getExpansionCards(expansionId, options = {}) {
    const { sort = 'relevance', maxResults = 1000, includeImages = true, includePricing = true } = options;
    
    try {
      console.log(`🃏 Loading cards for expansion ${expansionId}...`);
      
      // Get cards from TCG Go API
      const cards = await tcgGoApiService.getExpansionCards(expansionId, sort, maxResults);
      
      if (!includeImages && !includePricing) {
        return cards;
      }

      // Enhance cards with additional data in batches to avoid overwhelming APIs
      const enhancedCards = await this.enhanceItemsBatch(cards, {
        includeImages,
        includePricing,
        itemType: 'cards'
      });

      return enhancedCards;
    } catch (error) {
      console.error('❌ Error loading expansion cards:', error);
      throw error;
    }
  }

  /**
   * Get expansion products with enhanced data
   */
  async getExpansionProducts(expansionId, options = {}) {
    const { sort = 'relevance', maxResults = 500, includeImages = true, includePricing = true } = options;
    
    try {
      console.log(`📦 Loading products for expansion ${expansionId}...`);
      
      // Get products from TCG Go API
      const products = await tcgGoApiService.getExpansionProducts(expansionId, sort, maxResults);
      
      if (!includeImages && !includePricing) {
        return products;
      }

      // Enhance products with additional data
      const enhancedProducts = await this.enhanceItemsBatch(products, {
        includeImages,
        includePricing,
        itemType: 'products'
      });

      return enhancedProducts;
    } catch (error) {
      console.error('❌ Error loading expansion products:', error);
      throw error;
    }
  }

  /**
   * Enhance items with images and pricing in batches
   */
  async enhanceItemsBatch(items, options = {}) {
    const { includeImages = true, includePricing = true, itemType = 'items' } = options;
    const batchSize = 10; // Process 10 items at a time
    const enhancedItems = [];
    
    // Check if image service is available (avoid 503 errors)
    let imageServiceAvailable = true;
    if (includeImages) {
      try {
        // Quick test to see if image service is responding
        const testResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/price-charting/search?q=test`, {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
        });
        imageServiceAvailable = testResponse.ok;
        if (!imageServiceAvailable) {
          console.warn('⚠️ Image service unavailable (503), skipping image enhancement');
        }
      } catch (error) {
        imageServiceAvailable = false;
        console.warn('⚠️ Image service test failed, skipping image enhancement:', error.message);
      }
    }

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      console.log(`🔄 Enhancing ${itemType} batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(items.length/batchSize)}`);

      const batchPromises = batch.map(async (item) => {
        try {
          const enhancedItem = { ...item };

          // Add images if requested and service is available
          if (includeImages && item.name && imageServiceAvailable) {
            try {
              const images = await getProductImages(item.name);
              if (images && images.length > 0) {
                enhancedItem.imageUrl = images[0];
                enhancedItem.additionalImages = images.slice(1);
              }
            } catch (error) {
              // If we get a 503 or similar error, disable image service for this session
              if (error.message.includes('503') || error.message.includes('Service Unavailable')) {
                imageServiceAvailable = false;
                console.warn('⚠️ Image service became unavailable, disabling for remaining items');
              }
              // Don't log individual failures to avoid spam
            }
          }

          // Add enhanced pricing if requested
          if (includePricing && item.name) {
            try {
              const pricingData = await this.getEnhancedPricing(item.name, item);
              if (pricingData) {
                enhancedItem.enhancedPricing = pricingData;
                // Update market value if we got better pricing
                if (pricingData.bestPrice && pricingData.bestPrice > 0) {
                  enhancedItem.marketValue = pricingData.bestPrice;
                  enhancedItem.priceSource = pricingData.bestSource;
                  
                  // For sealed products, also update the prices object with PriceCharting data
                  if (pricingData.priceCharting && (item.type === 'product' || item.type === 'sealed')) {
                    enhancedItem.prices = {
                      ...enhancedItem.prices,
                      priceCharting: pricingData.priceCharting
                    };
                  }
                }
              }
            } catch (error) {
              // Don't log individual pricing failures to avoid spam
            }
          }

          return enhancedItem;
        } catch (error) {
          return item; // Return original item if enhancement fails
        }
      });

      const enhancedBatch = await Promise.allSettled(batchPromises);
      enhancedItems.push(...enhancedBatch.map(result => 
        result.status === 'fulfilled' ? result.value : items[i + enhancedItems.length]
      ));

      // Rate limiting delay between batches
      if (i + batchSize < items.length) {
        await this.delay(this.rateLimitDelay * 2);
      }
    }

    return enhancedItems;
  }

  /**
   * Get enhanced pricing from multiple sources
   */
  async getEnhancedPricing(itemName, existingItem = null) {
    try {
      // Determine if this is a sealed product
      const isSealedProduct = existingItem?.type === 'product' || 
                             existingItem?.type === 'sealed' ||
                             itemName.toLowerCase().includes('booster') ||
                             itemName.toLowerCase().includes('box') ||
                             itemName.toLowerCase().includes('pack') ||
                             itemName.toLowerCase().includes('case') ||
                             itemName.toLowerCase().includes('bundle');

      // Start with existing pricing from TCG Go
      const pricing = {
        tcgPlayer: existingItem?.prices?.tcgPlayer || {},
        cardMarket: existingItem?.prices?.cardMarket || {},
        sources: ['tcgGo'],
        bestPrice: existingItem?.marketValue || 0,
        bestSource: existingItem?.priceSource || 'tcgGo'
      };

      // For sealed products, prioritize PriceCharting API
      if (isSealedProduct) {
        try {
          console.log(`🔍 Getting PriceCharting pricing for sealed product: ${itemName}`);
          const priceChartingData = await marketDataService.getProductMarketData(itemName);
          
          if (priceChartingData.success && priceChartingData.data) {
            const pcData = priceChartingData.data;
            pricing.priceCharting = {
              loose: pcData.prices?.loose || 0,
              cib: pcData.prices?.cib || 0,
              new: pcData.prices?.new || 0,
              source: 'pricecharting'
            };
            pricing.sources.push('pricecharting');

            // Use the most appropriate price for sealed products (new > cib > loose)
            const sealedPrice = pcData.prices?.new || pcData.prices?.cib || pcData.prices?.loose || 0;
            
            if (sealedPrice > 0) {
              pricing.bestPrice = sealedPrice;
              pricing.bestSource = 'pricecharting';
              console.log(`✅ PriceCharting pricing found: $${sealedPrice} for ${itemName}`);
            }
          }
        } catch (error) {
          console.warn(`⚠️ PriceCharting pricing failed for ${itemName}:`, error.message);
        }
      }

      // Try to get additional pricing from Market Data Service (Card Market)
      try {
        const marketData = await marketDataService.searchCardMarketAll(itemName, 1);
        if (marketData.success && marketData.data.cards.length > 0) {
          const marketCard = marketData.data.cards[0];
          pricing.marketData = {
            price: marketCard.price || 0,
            currency: marketCard.currency || 'USD',
            source: 'cardMarket'
          };
          pricing.sources.push('marketData');

          // Update best price if market data is better (but don't override PriceCharting for sealed)
          if (marketCard.price && marketCard.price > 0) {
            if (pricing.bestPrice === 0 || (!isSealedProduct && marketCard.price < pricing.bestPrice)) {
              pricing.bestPrice = marketCard.price;
              pricing.bestSource = 'marketData';
            }
          }
        }
      } catch (error) {
        console.warn(`⚠️ Market data pricing failed for ${itemName}:`, error.message);
      }

      return pricing;
    } catch (error) {
      console.warn(`⚠️ Enhanced pricing failed for ${itemName}:`, error.message);
      return null;
    }
  }

  /**
   * Get PriceCharting pricing specifically for sealed products
   */
  async getSealedProductPricing(productName) {
    try {
      console.log(`🔍 Getting PriceCharting pricing for sealed product: ${productName}`);
      const priceChartingData = await marketDataService.getProductMarketData(productName);
      
      if (priceChartingData.success && priceChartingData.data) {
        const pcData = priceChartingData.data;
        const pricing = {
          priceCharting: {
            loose: pcData.prices?.loose || 0,
            cib: pcData.prices?.cib || 0,
            new: pcData.prices?.new || 0,
            source: 'pricecharting'
          },
          bestPrice: pcData.prices?.new || pcData.prices?.cib || pcData.prices?.loose || 0,
          bestSource: 'pricecharting',
          sources: ['pricecharting']
        };
        
        console.log(`✅ PriceCharting pricing found: $${pricing.bestPrice} for ${productName}`);
        return pricing;
      }
      
      return null;
    } catch (error) {
      console.warn(`⚠️ PriceCharting pricing failed for ${productName}:`, error.message);
      return null;
    }
  }

  /**
   * Search across all content types
   */
  async searchAll(query, options = {}) {
    const {
      sort = 'relevance',
      maxResults = 100,
      includeImages = true,
      includePricing = true
    } = options;

    const cacheKey = `search_all_${query}_${sort}_${maxResults}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log(`📦 Using cached search results for "${query}"`);
      return cached;
    }

    try {
      console.log(`🔍 Searching all content for "${query}"...`);
      
      // Search across all content types in parallel
      const [expansionsResult, cardsResult, productsResult] = await Promise.allSettled([
        tcgGoApiService.searchExpansions(query),
        tcgGoApiService.searchCards(query, sort, Math.floor(maxResults * 0.6)), // 60% cards
        tcgGoApiService.searchProducts(query, sort, Math.floor(maxResults * 0.4)) // 40% products
      ]);

      const expansions = expansionsResult.status === 'fulfilled' ? expansionsResult.value : [];
      const cards = cardsResult.status === 'fulfilled' ? cardsResult.value : [];
      const products = productsResult.status === 'fulfilled' ? productsResult.value : [];

      // Enhance results if requested
      let enhancedCards = cards;
      let enhancedProducts = products;

      if (includeImages || includePricing) {
        [enhancedCards, enhancedProducts] = await Promise.all([
          this.enhanceItemsBatch(cards, { includeImages, includePricing, itemType: 'cards' }),
          this.enhanceItemsBatch(products, { includeImages, includePricing, itemType: 'products' })
        ]);
      }

      const result = {
        query: query,
        expansions: expansions,
        cards: enhancedCards,
        products: enhancedProducts,
        totalResults: expansions.length + enhancedCards.length + enhancedProducts.length,
        loadedAt: new Date().toISOString()
      };

      this.setCache(cacheKey, result);
      console.log(`✅ Search complete: ${expansions.length} expansions, ${enhancedCards.length} cards, ${enhancedProducts.length} products`);
      return result;
    } catch (error) {
      console.error('❌ Error searching all content:', error);
      throw error;
    }
  }

  /**
   * Sort items based on sort option
   */
  sortItems(items, sortOption) {
    if (!items || items.length === 0) return items;

    const sortedItems = [...items];

    switch (sortOption) {
      case 'price-high':
        return sortedItems.sort((a, b) => (b.marketValue || 0) - (a.marketValue || 0));
      case 'price-low':
        return sortedItems.sort((a, b) => (a.marketValue || 0) - (b.marketValue || 0));
      case 'alphabetical':
        return sortedItems.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      case 'recent':
        return sortedItems.sort((a, b) => new Date(b.released_at || 0) - new Date(a.released_at || 0));
      case 'relevance':
      default:
        // Smart default sorting
        return sortedItems.sort((a, b) => {
          // Singles first, then sealed
          if (a.type !== 'sealed' && b.type === 'sealed') return -1;
          if (a.type === 'sealed' && b.type !== 'sealed') return 1;
          
          // Within singles, sort by card number (highest first)
          if (a.type !== 'sealed' && b.type !== 'sealed') {
            const aCardNumber = parseInt(a.details?.cardNumber) || 0;
            const bCardNumber = parseInt(b.details?.cardNumber) || 0;
            return bCardNumber - aCardNumber;
          }
          
          // Within sealed, sort by price (lowest first)
          if (a.type === 'sealed' && b.type === 'sealed') {
            return (a.marketValue || 0) - (b.marketValue || 0);
          }
          
          return 0;
        });
    }
  }

  /**
   * Calculate popularity score for expansions
   */
  calculatePopularityScore(expansionName) {
    const name = expansionName.toLowerCase();
    let score = 0;

    // Popular expansion keywords
    const popularKeywords = [
      'evolving skies', 'brilliant stars', 'lost origin', 'silver tempest',
      'crown zenith', 'scarlet & violet', '151', 'prismatic', 'fusion strike',
      'chilling reign', 'astral radiance', 'darkness ablaze', 'rebel clash'
    ];

    popularKeywords.forEach(keyword => {
      if (name.includes(keyword)) {
        score += 10;
      }
    });

    // Recent releases get higher scores
    const currentYear = new Date().getFullYear();
    if (name.includes(currentYear.toString()) || name.includes((currentYear - 1).toString())) {
      score += 5;
    }

    return score;
  }

  /**
   * Cache management
   */
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Utility function for delays
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    console.log('🧹 Smart search cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Create and export singleton instance
const smartSearchService = new SmartSearchService();
export default smartSearchService;
