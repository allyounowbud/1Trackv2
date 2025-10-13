/**
 * TCGCSV Service
 * Integrates with TCGCSV.com for Pokemon TCG pricing and product data
 * Used as a fallback/complementary source alongside Scrydex
 * Data updates daily at 20:00 UTC
 * API Docs: https://tcgcsv.com/
 */

class TcgcsvService {
  constructor() {
    this.baseUrl = 'https://tcgcsv.com';
    this.categoryId = 3; // Pokemon category ID
    this.cache = new Map();
    this.cacheTimeout = 24 * 60 * 60 * 1000; // 24 hours (since TCGCSV updates daily)
    this.isInitialized = false;
  }

  /**
   * Initialize the service
   */
  async initialize() {
    if (this.isInitialized) return true;
    
    try {
      console.log('🎴 Initializing TCGCSV Service...');
      // Test connection by fetching Pokemon groups
      const testUrl = `${this.baseUrl}/tcgplayer/${this.categoryId}/groups`;
      const response = await fetch(testUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': '1Track-Pokemon-Tracker'
        }
      });
      
      if (!response.ok) {
        console.warn('⚠️ TCGCSV API test failed, but continuing...');
        this.isInitialized = true;
        return true;
      }
      
      this.isInitialized = true;
      console.log('✅ TCGCSV Service initialized');
      return true;
    } catch (error) {
      console.warn('⚠️ TCGCSV initialization warning:', error.message);
      this.isInitialized = true; // Still mark as initialized to allow fallback attempts
      return true;
    }
  }

  /**
   * Get cache key for a request
   */
  getCacheKey(type, id = null) {
    return id ? `${type}_${id}` : type;
  }

  /**
   * Check if cached data is still valid
   */
  isCacheValid(cacheKey) {
    if (!this.cache.has(cacheKey)) return false;
    
    const cached = this.cache.get(cacheKey);
    const age = Date.now() - cached.timestamp;
    return age < this.cacheTimeout;
  }

  /**
   * Get cached data if valid
   */
  getCached(cacheKey) {
    if (this.isCacheValid(cacheKey)) {
      console.log(`💾 Using cached TCGCSV data for ${cacheKey}`);
      return this.cache.get(cacheKey).data;
    }
    return null;
  }

  /**
   * Set cache data
   */
  setCache(cacheKey, data) {
    // Implement LRU cache by removing oldest entries when full
    const maxCacheSize = 100;
    if (this.cache.size >= maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Get all Pokemon groups (sets)
   * @returns {Promise<Array>} Array of Pokemon sets
   */
  async getGroups() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const cacheKey = this.getCacheKey('groups');
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const url = `${this.baseUrl}/tcgplayer/${this.categoryId}/groups`;
      console.log(`🔍 Fetching Pokemon groups from TCGCSV: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': '1Track-Pokemon-Tracker'
        }
      });
      
      if (!response.ok) {
        console.warn(`⚠️ TCGCSV API returned ${response.status}, may need different access method`);
        throw new Error(`TCGCSV API error: ${response.status}`);
      }

      const data = await response.json();
      
      // TCGCSV returns category data with groups
      const groups = data.groups || [];
      
      console.log(`✅ Found ${groups.length} Pokemon groups from TCGCSV`);
      
      this.setCache(cacheKey, groups);
      return groups;
    } catch (error) {
      console.error('❌ Error fetching TCGCSV groups:', error);
      return [];
    }
  }

  /**
   * Get products for a specific group (set)
   * @param {number} groupId - TCGplayer group ID
   * @returns {Promise<Array>} Array of products
   */
  async getProductsByGroup(groupId) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const cacheKey = this.getCacheKey('group', groupId);
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const url = `${this.baseUrl}/tcgplayer/${this.categoryId}/${groupId}/products`;
      console.log(`🔍 Fetching products for group ${groupId} from TCGCSV`);
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': '1Track-Pokemon-Tracker'
        }
      });
      
      if (!response.ok) {
        console.warn(`⚠️ TCGCSV API returned ${response.status} for group ${groupId}`);
        throw new Error(`TCGCSV API error: ${response.status}`);
      }

      const data = await response.json();
      
      // TCGCSV returns products with prices
      const products = data.results || [];
      
      console.log(`✅ Found ${products.length} products for group ${groupId}`);
      
      this.setCache(cacheKey, products);
      return products;
    } catch (error) {
      console.error(`❌ Error fetching TCGCSV products for group ${groupId}:`, error);
      return [];
    }
  }

  /**
   * Search for a card by name across all Pokemon sets
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results
   */
  async searchCards(query, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const { limit = 30, groupId = null } = options;

    try {
      console.log(`🔍 Searching TCGCSV for: "${query}"`);
      
      let products = [];
      
      if (groupId) {
        // Search within specific group
        products = await this.getProductsByGroup(groupId);
      } else {
        // Search across all groups (expensive, use cached groups)
        const groups = await this.getGroups();
        
        // Only search recent groups to avoid too many API calls
        const recentGroups = groups.slice(0, 10);
        
        for (const group of recentGroups) {
          const groupProducts = await this.getProductsByGroup(group.groupId);
          products.push(...groupProducts);
          
          // Stop if we have enough results
          if (products.length >= limit * 2) break;
        }
      }

      // Filter products by search query
      const normalizedQuery = query.toLowerCase();
      const filteredProducts = products.filter(product => 
        product.name?.toLowerCase().includes(normalizedQuery)
      );

      // Limit results
      const limitedResults = filteredProducts.slice(0, limit);

      console.log(`✅ Found ${limitedResults.length} matching cards in TCGCSV`);

      return {
        data: limitedResults.map(product => this.formatProduct(product)),
        total: limitedResults.length,
        source: 'tcgcsv',
        cached: false
      };
    } catch (error) {
      console.error('❌ Error searching TCGCSV:', error);
      return {
        data: [],
        total: 0,
        source: 'tcgcsv',
        error: error.message
      };
    }
  }

  /**
   * Get pricing for a specific card by product ID
   * @param {number} productId - TCGplayer product ID
   * @returns {Promise<Object|null>} Pricing data
   */
  async getCardPricing(productId) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const cacheKey = this.getCacheKey('pricing', productId);
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      // TCGCSV doesn't have a direct product lookup endpoint
      // We need to search through groups or use the CSV files
      // For now, return null and rely on group-based searches
      console.log(`⚠️ Direct pricing lookup not supported for product ${productId}`);
      return null;
    } catch (error) {
      console.error(`❌ Error fetching TCGCSV pricing for product ${productId}:`, error);
      return null;
    }
  }

  /**
   * Get pricing by card name
   * @param {string} cardName - Card name
   * @param {string} setName - Set name (optional)
   * @returns {Promise<Object|null>} Pricing data
   */
  async getPricingByName(cardName, setName = null) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      console.log(`🔍 Looking up pricing for "${cardName}" in TCGCSV`);
      
      // Search for the card
      const results = await this.searchCards(cardName, { limit: 10 });
      
      if (!results.data || results.data.length === 0) {
        console.log(`⚠️ No pricing found for "${cardName}"`);
        return null;
      }

      // If set name provided, try to match it
      let matchedCard = null;
      if (setName) {
        matchedCard = results.data.find(card => 
          card.set_name?.toLowerCase().includes(setName.toLowerCase())
        );
      }

      // Otherwise use first result
      matchedCard = matchedCard || results.data[0];

      console.log(`✅ Found pricing for "${cardName}": $${matchedCard.marketPrice}`);
      
      return {
        marketPrice: matchedCard.marketPrice,
        lowPrice: matchedCard.lowPrice,
        midPrice: matchedCard.midPrice,
        highPrice: matchedCard.highPrice,
        source: 'tcgcsv',
        lastUpdated: new Date().toISOString(),
        cardName: matchedCard.name,
        setName: matchedCard.set_name
      };
    } catch (error) {
      console.error(`❌ Error getting TCGCSV pricing by name:`, error);
      return null;
    }
  }

  /**
   * Format a TCGCSV product to match our internal structure
   * @param {Object} product - Raw TCGCSV product
   * @returns {Object} Formatted product
   */
  formatProduct(product) {
    // TCGCSV product structure (from their API):
    // {
    //   productId, name, cleanName, imageUrl, categoryId, groupId,
    //   url, modifiedOn, imageCount, 
    //   extendedData: [{ name, value }],
    //   marketPrice, lowPrice, midPrice, highPrice
    // }

    // Extract extended data
    const extendedData = {};
    if (product.extendedData && Array.isArray(product.extendedData)) {
      product.extendedData.forEach(item => {
        if (item.name && item.value) {
          extendedData[item.name] = item.value;
        }
      });
    }

    return {
      id: product.productId,
      name: product.name || product.cleanName,
      image_url: product.imageUrl,
      image: product.imageUrl,
      number: extendedData['Number'] || null,
      rarity: extendedData['Rarity'] || null,
      set_name: product.groupName || null,
      expansion_name: product.groupName || null,
      
      // Pricing data
      marketPrice: product.marketPrice || 0,
      market_value_cents: product.marketPrice ? Math.round(product.marketPrice * 100) : 0,
      raw_market: product.marketPrice || 0,
      raw_price: product.marketPrice || 0,
      lowPrice: product.lowPrice || 0,
      midPrice: product.midPrice || 0,
      highPrice: product.highPrice || 0,
      
      // Pricing structure for UI
      raw_pricing: product.marketPrice ? {
        market: parseFloat(product.marketPrice).toFixed(2),
        low: parseFloat(product.lowPrice || 0).toFixed(2),
        mid: parseFloat(product.midPrice || 0).toFixed(2),
        high: parseFloat(product.highPrice || 0).toFixed(2),
        trends: {
          days_7: { percent_change: 0 },
          days_30: { percent_change: 0 },
          days_90: { percent_change: 0 },
          days_180: { percent_change: 0 }
        }
      } : null,
      
      // Metadata
      source: 'tcgcsv',
      itemType: 'singles',
      type: 'card',
      tcgplayerId: product.productId,
      tcgplayerUrl: product.url,
      lastUpdated: product.modifiedOn || new Date().toISOString(),
      
      // Extended data
      ...extendedData
    };
  }

  /**
   * Clear all cache
   */
  clearCache() {
    this.cache.clear();
    console.log('🗑️ TCGCSV cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      timeout: this.cacheTimeout,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Get sealed products for a specific expansion/group
   * @param {number} groupId - TCGCSV group ID (expansion ID)
   * @param {Object} options - Options for filtering and pagination
   * @returns {Promise<Object>} Sealed products data
   */
  async getSealedProductsByGroup(groupId, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const {
      page = 1,
      pageSize = 30,
      sortBy = 'name',
      sortOrder = 'asc'
    } = options;

    const cacheKey = this.getCacheKey('sealed-group', groupId, JSON.stringify(options));
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      console.log(`📦 Fetching sealed products for group ${groupId} from TCGCSV`);
      
      // Get all products for the group
      const allProducts = await this.getProductsByGroup(groupId);
      
      // Filter for sealed products only
      const sealedProducts = this.filterSealedProducts(allProducts);
      
      // Apply sorting
      sealedProducts.sort((a, b) => {
        const aValue = a[sortBy] || '';
        const bValue = b[sortBy] || '';
        
        if (sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });

      // Apply pagination
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedProducts = sealedProducts.slice(startIndex, endIndex);

      // Format products for our app
      const formattedProducts = paginatedProducts.map(product => this.formatSealedProduct(product, groupId));

      const result = {
        data: formattedProducts,
        total: sealedProducts.length,
        page,
        pageSize,
        totalPages: Math.ceil(sealedProducts.length / pageSize),
        hasMore: endIndex < sealedProducts.length
      };

      console.log(`✅ Found ${sealedProducts.length} sealed products for group ${groupId}`);
      
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error(`❌ Error fetching sealed products for group ${groupId}:`, error);
      return { data: [], total: 0, page, pageSize, totalPages: 0, hasMore: false };
    }
  }

  /**
   * Filter products to only include sealed items
   * PRIMARY METHOD: Sealed products do NOT have a "Number" field in extendedData
   * Individual cards ALWAYS have a "Number" field (e.g., "001/162")
   * @param {Array} products - All products from TCGCSV
   * @returns {Array} Filtered sealed products
   */
  filterSealedProducts(products) {
    return products.filter(product => {
      // PRIMARY METHOD: Check extendedData for Number field
      // Sealed products don't have card numbers, singles do
      if (Array.isArray(product.extendedData)) {
        const hasNumber = product.extendedData.some(item => 
          item.name === 'Number' && item.value
        );
        
        // If it has a Number field, it's a single card, not sealed
        if (hasNumber) {
          return false;
        }
      }

      // SECONDARY CHECK: Exclude code cards explicitly
      // Code cards don't have numbers but are still not physical sealed products
      const name = (product.name || '').toLowerCase();
      const cleanName = (product.cleanName || '').toLowerCase();
      
      const excludeKeywords = [
        'code card', 'digital', 'online code'
      ];

      const isExcluded = excludeKeywords.some(keyword =>
        name.includes(keyword) || cleanName.includes(keyword)
      );

      // If no Number field and not a code card, it's sealed
      return !isExcluded;
    });
  }

  /**
   * Format a TCGCSV sealed product for our app
   * @param {Object} product - TCGCSV product data
   * @param {number} groupId - Group ID for reference
   * @returns {Object} Formatted sealed product
   */
  formatSealedProduct(product, groupId) {
    const marketPrice = product.marketPrice || product.lowPrice || 0;
    
    return {
      id: product.productId || product.id,
      name: product.name,
      image_url: product.imageUrl || null,
      image: product.imageUrl || null,
      marketValue: marketPrice,
      market_value: marketPrice,
      market_value_cents: Math.round(marketPrice * 100),
      rarity: 'Sealed',
      trend: product.trend || null,
      
      // Pricing data structure
      raw_market: marketPrice,
      raw_price: marketPrice ? parseFloat(marketPrice) : null,
      raw_pricing: marketPrice ? {
        market: parseFloat(marketPrice).toFixed(2),
        trends: {
          days_7: { percent_change: product.trend || 0 },
          days_30: { percent_change: 0 },
          days_90: { percent_change: 0 },
          days_180: { percent_change: 0 }
        }
      } : null,
      
      // TCGCSV specific data
      productId: product.productId || product.id,
      groupId: groupId,
      setName: product.setName || product.groupName || 'Unknown Set',
      expansion_name: product.setName || product.groupName || 'Unknown Set',
      set_name: product.setName || product.groupName || 'Unknown Set',
      episode_name: product.setName || product.groupName || 'Unknown Set',
      
      // Source identification
      source: 'tcgcsv',
      itemType: 'sealed',
      type: 'sealed',
      gameId: 'pokemon',
      
      // Additional TCGCSV data
      categoryId: product.categoryId || this.categoryId,
      groupId: groupId,
      rawData: product // Keep original data for reference
    };
  }
}

// Create and export singleton instance
const tcgcsvService = new TcgcsvService();
export default tcgcsvService;

