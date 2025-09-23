/**
 * TCG Go API Service - Complete implementation matching TCG Go website
 * Based on Card Market API documentation
 */

class TCGGoApiService {
  constructor() {
    this.rapidApiKey = import.meta.env.VITE_RAPIDAPI_KEY;
    this.baseUrl = 'https://cardmarket-api-tcg.p.rapidapi.com';
    this.cache = new Map();
    this.cacheTimeout = 6 * 60 * 60 * 1000; // 6 hours
    this.loadPersistentCache();
  }

  /**
   * Make API request with proper headers
   */
  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': this.rapidApiKey,
        'X-RapidAPI-Host': 'cardmarket-api-tcg.p.rapidapi.com',
        ...options.headers
      },
      ...options
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Cache management
   */
  getFromCache(key) {
    // Check in-memory cache first
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    
    // Check persistent cache
    const persistentCached = this.getFromPersistentCache(key);
    if (persistentCached) {
      // Restore to in-memory cache
      this.cache.set(key, persistentCached);
      return persistentCached.data;
    }
    
    return null;
  }

  setCache(key, data) {
    const cacheEntry = {
      data,
      timestamp: Date.now()
    };
    
    // Store in in-memory cache
    this.cache.set(key, cacheEntry);
    
    // Store in persistent cache
    this.setPersistentCache(key, cacheEntry);
  }

  /**
   * Persistent cache management using localStorage
   */
  loadPersistentCache() {
    try {
      const cacheData = localStorage.getItem('tcgGoApiCache');
      if (cacheData) {
        const parsed = JSON.parse(cacheData);
        const now = Date.now();
        
        // Only load non-expired entries
        Object.entries(parsed).forEach(([key, value]) => {
          if (now - value.timestamp < this.cacheTimeout) {
            this.cache.set(key, value);
          }
        });
        
        console.log(`📦 Loaded ${this.cache.size} cached entries from localStorage`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load persistent cache:', error);
    }
  }

  getFromPersistentCache(key) {
    try {
      const cacheData = localStorage.getItem('tcgGoApiCache');
      if (cacheData) {
        const parsed = JSON.parse(cacheData);
        const cached = parsed[key];
        
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached;
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to read from persistent cache:', error);
    }
    return null;
  }

  setPersistentCache(key, cacheEntry) {
    try {
      const cacheData = localStorage.getItem('tcgGoApiCache') || '{}';
      const parsed = JSON.parse(cacheData);
      parsed[key] = cacheEntry;
      
      // Limit cache size to prevent localStorage bloat
      const entries = Object.entries(parsed);
      if (entries.length > 50) {
        // Remove oldest entries
        const sorted = entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
        const toKeep = sorted.slice(-40); // Keep 40 most recent
        const newCache = Object.fromEntries(toKeep);
        localStorage.setItem('tcgGoApiCache', JSON.stringify(newCache));
      } else {
        localStorage.setItem('tcgGoApiCache', JSON.stringify(parsed));
      }
    } catch (error) {
      console.warn('⚠️ Failed to write to persistent cache:', error);
    }
  }


  /**
   * Get all expansions (episodes)
   * GET /pokemon/episodes
   */
  async getAllExpansions() {
    const cacheKey = 'all_expansions';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const responseData = await this.makeRequest('/pokemon/episodes');
      console.log('🔍 Raw all expansions API response:', responseData);
      
      // Handle different response structures
      let data;
      if (Array.isArray(responseData)) {
        data = responseData;
      } else if (responseData.data && Array.isArray(responseData.data)) {
        data = responseData.data;
      } else if (responseData.results && Array.isArray(responseData.results)) {
        data = responseData.results;
      } else {
        console.error('❌ Unexpected all expansions API response structure:', responseData);
        return [];
      }
      
      // Format expansions data
      const formattedExpansions = data.map(expansion => ({
        id: expansion.id,
        name: expansion.name,
        slug: expansion.slug,
        releaseDate: expansion.released_at,
        logo: expansion.logo,
        code: expansion.code,
        cardCount: expansion.cards_total,
        cardsPrinted: expansion.cards_printed_total,
        imageUrl: expansion.logo,
        symbol: expansion.code,
        game: expansion.game?.name || 'Pokémon',
        series: expansion.series?.name || 'Unknown'
      }));

      this.setCache(cacheKey, formattedExpansions);
      return formattedExpansions;
    } catch (error) {
      console.error('❌ Error fetching expansions:', error);
      throw error;
    }
  }

  /**
   * Search expansions
   * GET /pokemon/episodes/search?search={query}
   */
  async searchExpansions(query) {
    const cacheKey = `search_expansions_${query}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const encodedQuery = encodeURIComponent(query);
      const response = await this.makeRequest(`/pokemon/episodes/search?search=${encodedQuery}`);
      
      // Handle different response structures
      let data;
      if (response.data && Array.isArray(response.data)) {
        data = response.data;
      } else if (Array.isArray(response)) {
        data = response;
      } else {
        data = [];
      }

      // Format expansions data
      const formattedExpansions = data.map(expansion => ({
        id: expansion.id,
        name: expansion.name,
        slug: expansion.slug,
        releaseDate: expansion.released_at,
        logo: expansion.logo,
        code: expansion.code,
        cardCount: expansion.cards_total,
        cardsPrinted: expansion.cards_printed_total,
        imageUrl: expansion.logo,
        symbol: expansion.code,
        game: expansion.game?.name || 'Pokémon',
        series: expansion.series?.name || 'Unknown'
      }));

      this.setCache(cacheKey, formattedExpansions);
      return formattedExpansions;
    } catch (error) {
      console.error('❌ Error searching expansions:', error);
      throw error;
    }
  }

  /**
   * Get cards from expansion with pagination
   * GET /pokemon/episodes/{id}/cards?sort={sort}
   */
  async getExpansionCards(expansionId, sort = 'price_highest', maxResults = null) {
    const cacheKey = `expansion_cards_${expansionId}_${sort}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      let allCards = [];
      let currentPage = 1;
      let totalPages = 1;
      
      do {
        const responseData = await this.makeRequest(`/pokemon/episodes/${expansionId}/cards?sort=${sort}&page=${currentPage}`);
        console.log(`🔍 Raw expansion cards API response (page ${currentPage}):`, responseData);
        
        // Handle different response structures
        let data;
        if (Array.isArray(responseData)) {
          data = responseData;
        } else if (responseData.data && Array.isArray(responseData.data)) {
          data = responseData.data;
        } else if (responseData.results && Array.isArray(responseData.results)) {
          data = responseData.results;
        } else {
          console.error('❌ Unexpected expansion cards API response structure:', responseData);
          break;
        }
        
        // Add cards from this page
        allCards = allCards.concat(data);
        
        // Check if we've reached the max results limit (if specified)
        if (maxResults && allCards.length >= maxResults) {
          allCards = allCards.slice(0, maxResults);
          break;
        }
        
        // Check pagination info
        if (responseData.paging) {
          totalPages = responseData.paging.total || 1;
          currentPage++;
        } else {
          break; // No pagination info, assume single page
        }
        
        console.log(`📄 Fetched page ${currentPage - 1}/${totalPages}, total cards so far: ${allCards.length}`);
        
      } while (currentPage <= totalPages && (!maxResults || allCards.length < maxResults));
      
      // Format all cards data
      const formattedCards = (await Promise.all(allCards.map(card => this.formatCard(card)))).filter(card => card !== null);

      this.setCache(cacheKey, formattedCards);
      console.log(`✅ Fetched all ${formattedCards.length} cards from expansion ${expansionId}`);
      return formattedCards;
    } catch (error) {
      console.error('❌ Error fetching expansion cards:', error);
      throw error;
    }
  }

  /**
   * Get products from expansion with pagination
   * GET /pokemon/episodes/{id}/products?sort={sort}
   */
  async getExpansionProducts(expansionId, sort = 'price_highest', maxResults = null) {
    const cacheKey = `expansion_products_${expansionId}_${sort}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      let allProducts = [];
      let currentPage = 1;
      let totalPages = 1;
      
      do {
        const responseData = await this.makeRequest(`/pokemon/episodes/${expansionId}/products?sort=${sort}&page=${currentPage}`);
        console.log(`🔍 Raw expansion products API response (page ${currentPage}):`, responseData);
        
        // Handle different response structures
        let data;
        if (Array.isArray(responseData)) {
          data = responseData;
        } else if (responseData.data && Array.isArray(responseData.data)) {
          data = responseData.data;
        } else if (responseData.results && Array.isArray(responseData.results)) {
          data = responseData.results;
        } else {
          console.error('❌ Unexpected expansion products API response structure:', responseData);
          break;
        }
        
        // Add products from this page
        allProducts = allProducts.concat(data);
        
        // Check if we've reached the max results limit (if specified)
        if (maxResults && allProducts.length >= maxResults) {
          allProducts = allProducts.slice(0, maxResults);
          break;
        }
        
        // Check pagination info
        if (responseData.paging) {
          totalPages = responseData.paging.total || 1;
          currentPage++;
        } else {
          break; // No pagination info, assume single page
        }
        
        console.log(`📄 Fetched page ${currentPage - 1}/${totalPages}, total products so far: ${allProducts.length}`);
        
      } while (currentPage <= totalPages && (!maxResults || allProducts.length < maxResults));
      
      // Format all products data
      const formattedProducts = (await Promise.all(allProducts.map(product => this.formatProduct(product)))).filter(product => product !== null);

      this.setCache(cacheKey, formattedProducts);
      console.log(`✅ Fetched all ${formattedProducts.length} products from expansion ${expansionId}`);
      return formattedProducts;
    } catch (error) {
      console.error('❌ Error fetching expansion products:', error);
      throw error;
    }
  }

  /**
   * Get all items (cards + products) from expansion
   */
  async getExpansionAll(expansionId, sort = 'price_highest') {
    const cacheKey = `expansion_all_${expansionId}_${sort}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Fetch both cards and products in parallel
      const [cards, products] = await Promise.all([
        this.getExpansionCards(expansionId, sort).catch(() => []),
        this.getExpansionProducts(expansionId, sort).catch(() => [])
      ]);

      // Combine results
      const allItems = [...cards, ...products];

      // Sort combined results
      if (sort === 'price_highest') {
        allItems.sort((a, b) => (b.marketValue || 0) - (a.marketValue || 0));
      } else if (sort === 'price_lowest') {
        allItems.sort((a, b) => (a.marketValue || 0) - (b.marketValue || 0));
      } else if (sort === 'alphabetical') {
        allItems.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      }

      this.setCache(cacheKey, allItems);
      return allItems;
    } catch (error) {
      console.error('❌ Error fetching expansion all items:', error);
      throw error;
    }
  }

  /**
   * Get all cards with pagination and sorting
   * GET /pokemon/cards?sort={sort}
   */
  async getAllCards(sort = 'episode_newest', maxResults = 500) {
    const cacheKey = `all_cards_${sort}_${maxResults}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      let allCards = [];
      let currentPage = 1;
      let totalPages = 1;
      
      do {
        const responseData = await this.makeRequest(`/pokemon/cards?sort=${sort}&page=${currentPage}`);
        console.log(`🔍 Raw all cards API response (page ${currentPage}):`, responseData);
        
        // Handle different response structures
        let data;
        if (Array.isArray(responseData)) {
          data = responseData;
        } else if (responseData.data && Array.isArray(responseData.data)) {
          data = responseData.data;
        } else if (responseData.results && Array.isArray(responseData.results)) {
          data = responseData.results;
        } else {
          console.error('❌ Unexpected all cards API response structure:', responseData);
          break;
        }
        
        // Add cards from this page
        allCards = allCards.concat(data);
        
        // Check if we've reached the max results limit
        if (allCards.length >= maxResults) {
          allCards = allCards.slice(0, maxResults);
          break;
        }
        
        // Check pagination info
        if (responseData.paging) {
          totalPages = responseData.paging.total || 1;
          currentPage++;
        } else {
          break; // No pagination info, assume single page
        }
        
        console.log(`📄 Fetched page ${currentPage - 1}/${totalPages}, total cards so far: ${allCards.length}`);
        
      } while (currentPage <= totalPages && allCards.length < maxResults);
      
      // Format all cards data
      const formattedCards = (await Promise.all(allCards.map(card => this.formatCard(card)))).filter(card => card !== null);

      this.setCache(cacheKey, formattedCards);
      console.log(`✅ Fetched ${formattedCards.length} cards (sorted by ${sort})`);
      return formattedCards;
    } catch (error) {
      console.error('❌ Error fetching all cards:', error);
      throw error;
    }
  }

  /**
   * Search cards with pagination
   * GET /pokemon/cards/search?search={query}&sort={sort}
   */
  async searchCards(query, sort = 'relevance', maxResults = 500) {
    const cacheKey = `search_cards_${query}_${sort}_${maxResults}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const encodedQuery = encodeURIComponent(query);
      let allCards = [];
      let currentPage = 1;
      let totalPages = 1;
      
      do {
        const responseData = await this.makeRequest(`/pokemon/cards/search?search=${encodedQuery}&sort=${sort}&page=${currentPage}`);
        console.log(`🔍 Raw search cards API response (page ${currentPage}):`, responseData);
        
        // Handle different response structures
        let data;
        if (Array.isArray(responseData)) {
          data = responseData;
        } else if (responseData.data && Array.isArray(responseData.data)) {
          data = responseData.data;
        } else if (responseData.results && Array.isArray(responseData.results)) {
          data = responseData.results;
        } else {
          console.error('❌ Unexpected search cards API response structure:', responseData);
          break;
        }
        
        // Add cards from this page
        allCards = allCards.concat(data);
        
        // Check if we've reached the max results limit
        if (allCards.length >= maxResults) {
          allCards = allCards.slice(0, maxResults);
          break;
        }
        
        // Check pagination info
        if (responseData.paging) {
          totalPages = responseData.paging.total || 1;
          currentPage++;
        } else {
          break; // No pagination info, assume single page
        }
        
        console.log(`📄 Fetched page ${currentPage - 1}/${totalPages}, total cards so far: ${allCards.length}`);
        
      } while (currentPage <= totalPages && allCards.length < maxResults);
      
      // Format all cards data
      const formattedCards = (await Promise.all(allCards.map(card => this.formatCard(card)))).filter(card => card !== null);

      this.setCache(cacheKey, formattedCards);
      console.log(`✅ Fetched ${formattedCards.length} cards for search "${query}"`);
      return formattedCards;
    } catch (error) {
      console.error('❌ Error searching cards:', error);
      throw error;
    }
  }

  /**
   * Get all products with pagination and sorting
   * GET /pokemon/products?sort={sort}
   */
  async getAllProducts(sort = 'episode_newest', maxResults = 500) {
    const cacheKey = `all_products_${sort}_${maxResults}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      let allProducts = [];
      let currentPage = 1;
      let totalPages = 1;
      
      do {
        const responseData = await this.makeRequest(`/pokemon/products?sort=${sort}&page=${currentPage}`);
        console.log(`🔍 Raw all products API response (page ${currentPage}):`, responseData);
        
        // Handle different response structures
        let data;
        if (Array.isArray(responseData)) {
          data = responseData;
        } else if (responseData.data && Array.isArray(responseData.data)) {
          data = responseData.data;
        } else if (responseData.results && Array.isArray(responseData.results)) {
          data = responseData.results;
        } else {
          console.error('❌ Unexpected all products API response structure:', responseData);
          break;
        }
        
        // Add products from this page
        allProducts = allProducts.concat(data);
        
        // Check if we've reached the max results limit
        if (allProducts.length >= maxResults) {
          allProducts = allProducts.slice(0, maxResults);
          break;
        }
        
        // Check pagination info
        if (responseData.paging) {
          totalPages = responseData.paging.total || 1;
          currentPage++;
        } else {
          break; // No pagination info, assume single page
        }
        
        console.log(`📄 Fetched page ${currentPage - 1}/${totalPages}, total products so far: ${allProducts.length}`);
        
      } while (currentPage <= totalPages && allProducts.length < maxResults);
      
      // Format all products data
      const formattedProducts = (await Promise.all(allProducts.map(product => this.formatProduct(product)))).filter(product => product !== null);

      this.setCache(cacheKey, formattedProducts);
      console.log(`✅ Fetched ${formattedProducts.length} products (sorted by ${sort})`);
      return formattedProducts;
    } catch (error) {
      console.error('❌ Error fetching all products:', error);
      throw error;
    }
  }

  /**
   * Search products with pagination
   * GET /pokemon/products/search?search={query}&sort={sort}
   */
  async searchProducts(query, sort = 'relevance', maxResults = 500) {
    const cacheKey = `search_products_${query}_${sort}_${maxResults}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const encodedQuery = encodeURIComponent(query);
      let allProducts = [];
      let currentPage = 1;
      let totalPages = 1;
      
      do {
        const responseData = await this.makeRequest(`/pokemon/products/search?search=${encodedQuery}&sort=${sort}&page=${currentPage}`);
        console.log(`🔍 Raw search products API response (page ${currentPage}):`, responseData);
        
        // Handle different response structures
        let data;
        if (Array.isArray(responseData)) {
          data = responseData;
        } else if (responseData.data && Array.isArray(responseData.data)) {
          data = responseData.data;
        } else if (responseData.results && Array.isArray(responseData.results)) {
          data = responseData.results;
        } else {
          console.error('❌ Unexpected search products API response structure:', responseData);
          break;
        }
        
        // Add products from this page
        allProducts = allProducts.concat(data);
        
        // Check if we've reached the max results limit
        if (allProducts.length >= maxResults) {
          allProducts = allProducts.slice(0, maxResults);
          break;
        }
        
        // Check pagination info
        if (responseData.paging) {
          totalPages = responseData.paging.total || 1;
          currentPage++;
        } else {
          break; // No pagination info, assume single page
        }
        
        console.log(`📄 Fetched page ${currentPage - 1}/${totalPages}, total products so far: ${allProducts.length}`);
        
      } while (currentPage <= totalPages && allProducts.length < maxResults);
      
      // Format all products data
      const formattedProducts = (await Promise.all(allProducts.map(product => this.formatProduct(product)))).filter(product => product !== null);

      this.setCache(cacheKey, formattedProducts);
      console.log(`✅ Fetched ${formattedProducts.length} products for search "${query}"`);
      return formattedProducts;
    } catch (error) {
      console.error('❌ Error searching products:', error);
      throw error;
    }
  }

  /**
   * Search all (cards + products)
   */
  async searchAll(query, sort = 'relevance') {
    const cacheKey = `search_all_${query}_${sort}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Fetch both cards and products in parallel
      const [cards, products] = await Promise.all([
        this.searchCards(query, sort).catch(() => []),
        this.searchProducts(query, sort).catch(() => [])
      ]);

      // Combine results
      const allItems = [...cards, ...products];

      // Sort combined results
      if (sort === 'price_highest') {
        allItems.sort((a, b) => (b.marketValue || 0) - (a.marketValue || 0));
      } else if (sort === 'price_lowest') {
        allItems.sort((a, b) => (a.marketValue || 0) - (b.marketValue || 0));
      } else if (sort === 'alphabetical') {
        allItems.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      }

      this.setCache(cacheKey, allItems);
      return allItems;
    } catch (error) {
      console.error('❌ Error searching all items:', error);
      throw error;
    }
  }

  /**
   * Test method to debug specific card data
   */
  async debugCardData(cardId) {
    try {
      console.log(`🔍 Debugging card data for ID: ${cardId}`);
      const responseData = await this.makeRequest(`/pokemon/cards/${cardId}`);
      console.log('🔍 Raw card API response:', responseData);
      console.log('🔍 Card prices structure:', responseData.prices);
      console.log('🔍 Card Market prices:', responseData.prices?.cardmarket);
      console.log('🔍 TCGPlayer prices:', responseData.prices?.tcg_player);
      
      // Debug: Log all available price fields for accuracy check
      if (responseData.prices?.cardmarket) {
        console.log('🔍 Card Market price fields:', Object.keys(responseData.prices.cardmarket));
        console.log('🔍 Card Market price values:', responseData.prices.cardmarket);
      }
      if (responseData.prices?.tcg_player) {
        console.log('🔍 TCGPlayer price fields:', Object.keys(responseData.prices.tcg_player));
        console.log('🔍 TCGPlayer price values:', responseData.prices.tcg_player);
      }
      
      const formattedCard = await this.formatCard(responseData);
      console.log('🔍 Formatted card result:', formattedCard);
      
      return { raw: responseData, formatted: formattedCard };
    } catch (error) {
      console.error(`❌ Error debugging card ${cardId}:`, error);
      return null;
    }
  }

  /**
   * Get detailed information for a specific card by ID
   * GET /pokemon/cards/{id}
   */
  async getCardDetails(cardId) {
    const cacheKey = `card_details_${cardId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log(`📋 Using cached card details for card ${cardId}`);
      return cached;
    }

    try {
      console.log(`🔍 Fetching detailed information for card ${cardId}`);
      
      const responseData = await this.makeRequest(`/pokemon/cards/${cardId}`);
      console.log(`🔍 Raw card details API response:`, responseData);
      
      // Format the card data using our existing formatter
      const formattedCard = await this.formatCard(responseData);
      
      if (formattedCard) {
        this.setCache(cacheKey, formattedCard);
        console.log(`✅ Fetched detailed information for card: ${formattedCard.name}`);
        return formattedCard;
      } else {
        console.error(`❌ Failed to format card details for card ${cardId}`);
        return null;
      }
    } catch (error) {
      console.error(`❌ Error fetching card details for card ${cardId}:`, error);
      return null;
    }
  }

  /**
   * Get detailed information for a specific product by ID
   * GET /pokemon/products/{id}
   */
  async getProductDetails(productId) {
    const cacheKey = `product_details_${productId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log(`📦 Using cached product details for product ${productId}`);
      return cached;
    }

    try {
      console.log(`🔍 Fetching detailed information for product ${productId}`);
      
      const responseData = await this.makeRequest(`/pokemon/products/${productId}`);
      console.log(`🔍 Raw product details API response:`, responseData);
      
      // Format the product data using our existing formatter
      const formattedProduct = await this.formatProduct(responseData);
      
      if (formattedProduct) {
        this.setCache(cacheKey, formattedProduct);
        console.log(`✅ Fetched detailed information for product: ${formattedProduct.name}`);
        return formattedProduct;
      } else {
        console.error(`❌ Failed to format product details for product ${productId}`);
        return null;
      }
    } catch (error) {
      console.error(`❌ Error fetching product details for product ${productId}:`, error);
      return null;
    }
  }

  /**
   * Get detailed information for any item (card or product) by ID
   * Automatically detects whether it's a card or product and uses the appropriate endpoint
   */
  async getItemDetails(itemId, itemType = 'auto') {
    const cacheKey = `item_details_${itemId}_${itemType}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log(`📋 Using cached item details for ${itemType} ${itemId}`);
      return cached;
    }

    try {
      console.log(`🔍 Fetching detailed information for ${itemType} ${itemId}`);
      
      // Try card endpoint first if auto-detecting
      if (itemType === 'auto' || itemType === 'card') {
        try {
          const responseData = await this.makeRequest(`/pokemon/cards/${itemId}`);
          const formattedCard = await this.formatCard(responseData);
          if (formattedCard) {
            this.setCache(cacheKey, formattedCard);
            console.log(`✅ Fetched card details: ${formattedCard.name}`);
            return formattedCard;
          }
        } catch (error) {
          console.log(`🔍 Card endpoint failed for ${itemId}, trying product endpoint...`);
        }
      }
      
      // Try product endpoint if card failed or if explicitly requested
      if (itemType === 'auto' || itemType === 'product') {
        try {
          const responseData = await this.makeRequest(`/pokemon/products/${itemId}`);
          const formattedProduct = await this.formatProduct(responseData);
          if (formattedProduct) {
            this.setCache(cacheKey, formattedProduct);
            console.log(`✅ Fetched product details: ${formattedProduct.name}`);
            return formattedProduct;
          }
        } catch (error) {
          console.log(`🔍 Product endpoint failed for ${itemId}`);
        }
      }
      
      console.error(`❌ Could not fetch details for ${itemType} ${itemId}`);
      return null;
    } catch (error) {
      console.error(`❌ Error fetching item details for ${itemType} ${itemId}:`, error);
      return null;
    }
  }

  /**
   * Get all items (cards + products) with pagination and sorting
   * Combines getAllCards and getAllProducts
   */
  async getAllItems(sort = 'episode_newest', maxResults = 500) {
    const cacheKey = `all_items_${sort}_${maxResults}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      console.log(`🔍 Fetching all items (sorted by: ${sort})`);
      
      // Fetch cards and products in parallel
      const [cards, products] = await Promise.all([
        this.getAllCards(sort, Math.ceil(maxResults / 2)),
        this.getAllProducts(sort, Math.ceil(maxResults / 2))
      ]);
      
      // Combine and sort results
      const allItems = [...cards, ...products];
      
      // Sort combined results by criteria
      let sortedItems = allItems;
      if (sort === 'episode_newest') {
        // Keep original order for episode_newest
        sortedItems = allItems;
      } else if (sort === 'price_highest') {
        sortedItems = allItems.sort((a, b) => (b.marketValue || 0) - (a.marketValue || 0));
      } else if (sort === 'price_lowest') {
        sortedItems = allItems.sort((a, b) => (a.marketValue || 0) - (b.marketValue || 0));
      } else if (sort === 'alphabetical') {
        sortedItems = allItems.sort((a, b) => a.name.localeCompare(b.name));
      }
      
      // Limit results
      const limitedItems = sortedItems.slice(0, maxResults);
      
      this.setCache(cacheKey, limitedItems);
      console.log(`✅ Found ${limitedItems.length} total items (${cards.length} cards, ${products.length} products)`);
      return limitedItems;
    } catch (error) {
      console.error('❌ Error fetching all items:', error);
      throw error;
    }
  }

  /**
   * Format card data
   */
  async formatCard(card) {
    try {
      // Handle the actual API response structure
      // The API sometimes returns empty price objects, so we need to handle that
      const cardMarketPrices = card.prices?.cardmarket || {};
      const tcgPlayerPrices = card.prices?.tcg_player || {};
      
      // Get market value - API returns all prices in USD
      // TCGPlayer: Use market_price (most accurate) or mid_price as fallback
      const tcgPlayerMarketPrice = tcgPlayerPrices.market_price || tcgPlayerPrices.mid_price;
      
      // Card Market: Use trend (most recent market value) or lowest_near_mint as fallback
      const cardMarketPrice = cardMarketPrices.trend || cardMarketPrices.lowest_near_mint || cardMarketPrices.average;
      
      // Use TCGPlayer as primary (US market), Card Market as fallback (EU market)
      const marketValue = tcgPlayerMarketPrice || cardMarketPrice;
      
      // Debug: Log price selection for accuracy
      console.log(`🔍 Price selection for ${card.name}:`, {
        tcgPlayerMarket: tcgPlayerMarketPrice,
        cardMarketPrice: cardMarketPrice,
        selectedValue: marketValue,
        source: tcgPlayerMarketPrice ? 'TCGPlayer' : 'CardMarket'
      });

      // Try to get accurate trend from history prices (only for actual cards)
      let trend = 0;
      let dollarChange = 0;
      
      // Check if this is actually a card (not a product) by looking for card-specific properties
      const isActualCard = card.card_number || card.hp || card.supertype === 'Pokémon';
      
      if (isActualCard) {
        try {
          console.log(`🔍 Attempting to fetch history prices for card ${card.id} (${card.name})`);
          const historyPrices = await this.getCardHistoryPrices(card.id);
          console.log(`🔍 History prices result for ${card.name}:`, historyPrices);
          
          if (historyPrices && historyPrices.length > 0) {
            const trendData = this.calculateTrendFromHistory(historyPrices, 7);
            trend = trendData.trend;
            dollarChange = trendData.dollarChange;
            console.log(`🔍 Trend calculation for ${card.name}:`, { trend, dollarChange });
          } else {
            console.log(`🔍 No history prices found for ${card.name}, using fallback`);
          }
        } catch (error) {
          console.warn(`⚠️ Could not fetch history prices for card ${card.id} (${card.name}), falling back to 7d/30d averages:`, error);
        }
      } else {
        console.log(`🔍 Skipping history prices for ${card.name} (not a card)`);
      }
      
      // Fallback to Card Market 7d/30d averages if history prices failed or not available
      if (trend === 0 && dollarChange === 0) {
        const cardMarket7d = cardMarketPrices['7d_average'];
        const cardMarket30d = cardMarketPrices['30d_average'];
        trend = this.calculateTrend(cardMarket7d, cardMarket30d);
        dollarChange = cardMarket7d && cardMarket30d ? cardMarket7d - cardMarket30d : 0;
      }

      // Debug logging for trend data - expanded for all cards
      console.log('🔍 TCG Go API Debug - Card:', {
        name: card.name,
        id: card.id,
        tcgPlayerPrices,
        cardMarketPrices,
        trend,
        dollarChange,
        hasHistoryData: trend !== 0 || dollarChange !== 0,
        cardMarket7d: cardMarketPrices['7d_average'],
        cardMarket30d: cardMarketPrices['30d_average']
      });

      return {
        name: card.name,
        productId: card.id,
        imageUrl: card.image,
        set: card.episode?.name || 'Unknown Set',
        rarity: card.rarity,
        type: 'singles',
        marketValue: marketValue || 0,
        trend: trend || 0,
        dollarChange: dollarChange || 0,
        prices: {
          market: marketValue || 0,
          trend: trend || 0,
          source: tcgPlayerMarketPrice ? 'tcgplayer' : 'cardmarket',
          tcgPlayer: {
            market: tcgPlayerPrices.market_price || 0,
            mid: tcgPlayerPrices.mid_price || 0,
            currency: tcgPlayerPrices.currency || 'USD'
          },
          cardMarket: {
            lowest: cardMarketPrices.lowest_near_mint || 0,
            average7d: cardMarketPrices['7d_average'] || 0,
            average30d: cardMarketPrices['30d_average'] || 0,
            currency: 'USD'
          }
        },
        details: {
          cardNumber: card.card_number,
          hp: card.hp,
          supertype: card.supertype,
          type: card.type,
          setCode: card.episode?.code,
          releaseDate: card.episode?.released_at
        }
      };
    } catch (error) {
      console.error('❌ Error formatting card:', error);
      return null;
    }
  }

  /**
   * Format product data
   */
  async formatProduct(product) {
    try {
      // Handle the actual API response structure
      // The API sometimes returns empty price objects, so we need to handle that
      const cardMarketPrices = product.prices?.cardmarket || {};
      const tcgPlayerPrices = product.prices?.tcgplayer || {};
      
      // Get market value - API returns all prices in USD
      // TCGPlayer: Use market_price (most accurate) or mid_price as fallback
      const tcgPlayerMarketPrice = tcgPlayerPrices.market_price || tcgPlayerPrices.mid_price;
      
      // Card Market: Use trend (most recent market value) or lowest as fallback
      const cardMarketPrice = cardMarketPrices.trend || cardMarketPrices.lowest || cardMarketPrices.average;
      
      // Use TCGPlayer as primary (US market), Card Market as fallback (EU market)
      const marketValue = tcgPlayerMarketPrice || cardMarketPrice;
      
      // Debug: Log price selection for accuracy
      console.log(`🔍 Price selection for product ${product.name}:`, {
        tcgPlayerMarket: tcgPlayerMarketPrice,
        cardMarketPrice: cardMarketPrice,
        selectedValue: marketValue,
        source: tcgPlayerMarketPrice ? 'TCGPlayer' : 'CardMarket'
      });

      // Try to get accurate trend from history prices for products
      let trend = 0;
      let dollarChange = 0;
      
      try {
        console.log(`🔍 Attempting to fetch history prices for product ${product.id} (${product.name})`);
        const historyPrices = await this.getProductHistoryPrices(product.id);
        console.log(`🔍 History prices result for ${product.name}:`, historyPrices);
        
        if (historyPrices && historyPrices.length > 0) {
          const trendData = this.calculateTrendFromHistory(historyPrices, 7);
          trend = trendData.trend;
          dollarChange = trendData.dollarChange;
          console.log(`🔍 Trend calculation for ${product.name}:`, { trend, dollarChange });
        } else {
          console.log(`🔍 No history prices found for ${product.name}, using fallback`);
        }
      } catch (error) {
        console.warn(`⚠️ Could not fetch history prices for product ${product.id} (${product.name}), falling back to 7d/30d averages:`, error);
      }
      
      // Fallback to Card Market 7d/30d averages if history prices failed or not available
      if (trend === 0 && dollarChange === 0) {
        const cardMarket7d = cardMarketPrices['7d_average'];
        const cardMarket30d = cardMarketPrices['30d_average'];
        trend = this.calculateTrend(cardMarket7d, cardMarket30d);
        dollarChange = cardMarket7d && cardMarket30d ? cardMarket7d - cardMarket30d : 0;
      }
      
      console.log(`🔍 Product trend calculation for ${product.name}:`, { 
        id: product.id,
        name: product.name,
        trend, 
        dollarChange,
        usedHistoryPrices: trend !== 0 || dollarChange !== 0,
        cardMarket7d: cardMarketPrices['7d_average'],
        cardMarket30d: cardMarketPrices['30d_average'],
        tcgPlayerPrices,
        cardMarketPrices
      });

      return {
        name: product.name,
        productId: product.id,
        imageUrl: product.image,
        set: product.episode?.name || 'Unknown Set',
        rarity: product.rarity || 'Sealed',
        type: 'sealed',
        marketValue: marketValue || 0,
        trend: trend || 0,
        dollarChange: dollarChange || 0,
        prices: {
          market: marketValue || 0,
          trend: trend || 0,
          source: tcgPlayerMarketPrice ? 'tcgplayer' : 'cardmarket',
          tcgPlayer: {
            market: tcgPlayerPrices.market_price || 0,
            mid: tcgPlayerPrices.mid_price || 0,
            currency: tcgPlayerPrices.currency || 'USD'
          },
          cardMarket: {
            lowest: cardMarketPrices.lowest || 0,
            average7d: cardMarketPrices['7d_average'] || 0,
            average30d: cardMarketPrices['30d_average'] || 0,
            currency: 'USD'
          }
        },
        details: {
          setCode: product.episode?.code,
          releaseDate: product.episode?.released_at
        }
      };
    } catch (error) {
      console.error('❌ Error formatting product:', error);
      return null;
    }
  }

  /**
   * Get product history prices for trend calculation
   * GET /pokemon/products/{id}/history-prices?date_from={date}&date_to={date}
   */
  async getProductHistoryPrices(productId, dateFrom = null, dateTo = null) {
    const cacheKey = `product_history_${productId}_${dateFrom || 'default'}_${dateTo || 'default'}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log(`📈 Using cached history prices for product ${productId}`);
      return cached;
    }

    try {
      // Default to last 30 days if no dates provided
      if (!dateFrom) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        dateFrom = thirtyDaysAgo.toISOString().split('T')[0];
      }
      
      if (!dateTo) {
        dateTo = new Date().toISOString().split('T')[0];
      }

      const endpoint = `/pokemon/products/${productId}/history-prices?date_from=${dateFrom}&date_to=${dateTo}`;
      console.log(`📈 Fetching history prices for product ${productId} from ${dateFrom} to ${dateTo}`);
      
      const responseData = await this.makeRequest(endpoint);
      console.log('📈 Raw product history prices API response:', responseData);
      
      // Handle different response structures
      let data;
      if (Array.isArray(responseData)) {
        data = responseData;
      } else if (responseData.data && Array.isArray(responseData.data)) {
        data = responseData.data;
      } else if (responseData.results && Array.isArray(responseData.results)) {
        data = responseData.results;
      } else if (responseData.data && typeof responseData.data === 'object') {
        // Handle case where data is an object containing the price points
        const dataObj = responseData.data;
        console.log('🔍 Product data object structure:', dataObj);
        console.log('🔍 Product data object values:', Object.values(dataObj));
        
        // Check if data has properties that look like price points
        const possibleArrays = Object.values(dataObj).filter(val => Array.isArray(val));
        if (possibleArrays.length > 0) {
          data = possibleArrays[0];
          console.log('🔍 Found array in product data object:', data);
        } else {
          data = Object.values(dataObj).filter(val => 
            val && typeof val === 'object' && (val.date || val.price || val.value)
          );
          console.log('🔍 Extracted product price points from object:', data);
        }
        
        // If still no data, try to convert the object values to an array
        if (!data || data.length === 0) {
          const allValues = Object.values(dataObj);
          console.log('🔍 All product data object values:', allValues);
          
          // Look for objects that might be price points
          data = allValues.filter(val => 
            val && typeof val === 'object' && 
            (val.date || val.price || val.value || val.timestamp)
          );
          console.log('🔍 Filtered product price points:', data);
        }
        
        // If still no data, try to parse date-keyed object structure
        if (!data || data.length === 0) {
          console.log('🚨 ENHANCED DEBUG - Trying date-keyed object parsing for product...');
          const dateKeys = Object.keys(dataObj);
          console.log('🚨 ENHANCED DEBUG - Product date keys found:', dateKeys);
          
          // Convert date-keyed object to array of price points
          data = dateKeys.map(dateKey => {
            const priceData = dataObj[dateKey];
            console.log(`🚨 ENHANCED DEBUG - Product price data for ${dateKey}:`, priceData);
            
            // Extract price from various possible fields
            // API returns all prices in USD
            const price = priceData.tcg_player_market || priceData.cm_low || priceData.price || priceData.value || priceData.avg_price || priceData.low_price || priceData.high_price;
            
            // All prices are in USD
            const currency = 'USD';
            const finalPrice = price;
            
            return {
              date: dateKey,
              price: finalPrice || 0,
              currency: currency
            };
          }).filter(point => point.price > 0); // Only include points with valid prices
          
          console.log('🚨 ENHANCED DEBUG - Converted product date-keyed data:', data);
        }
      } else {
        console.error('❌ Unexpected product history prices API response structure:', responseData);
        return [];
      }
      
      // Format and sort by date
      const formattedData = data
        .map(pricePoint => ({
          date: pricePoint.date,
          price: pricePoint.price || pricePoint.value || 0,
          currency: 'USD'
        }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      this.setCache(cacheKey, formattedData);
      console.log(`✅ Fetched ${formattedData.length} history price points for product ${productId}`);
      return formattedData;

    } catch (error) {
      console.error('❌ Error fetching product history prices:', error);
      return [];
    }
  }

  /**
   * Get card history prices for trend calculation
   */
  async getCardHistoryPrices(cardId, dateFrom = null, dateTo = null) {
    const cacheKey = `card_history_${cardId}_${dateFrom || 'default'}_${dateTo || 'default'}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log(`📈 Using cached history prices for card ${cardId}`);
      return cached;
    }

    try {
      // Default to last 30 days if no dates provided
      if (!dateFrom) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        dateFrom = thirtyDaysAgo.toISOString().split('T')[0];
      }
      
      if (!dateTo) {
        dateTo = new Date().toISOString().split('T')[0];
      }

      const endpoint = `/pokemon/cards/${cardId}/history-prices?id=${cardId}&date_from=${dateFrom}&date_to=${dateTo}`;
      console.log(`📈 Fetching history prices for card ${cardId} from ${dateFrom} to ${dateTo}`);
      
      const responseData = await this.makeRequest(endpoint);
      console.log('🚨 ENHANCED DEBUG - Raw history prices API response:', responseData);
      console.log('🚨 ENHANCED DEBUG - Response structure analysis:', {
        isArray: Array.isArray(responseData),
        hasData: !!responseData.data,
        dataIsArray: Array.isArray(responseData.data),
        dataType: typeof responseData.data,
        dataKeys: responseData.data ? Object.keys(responseData.data) : null,
        hasResults: !!responseData.results,
        resultsType: typeof responseData.results
      });
      
      // Handle different response structures
      let data;
      if (Array.isArray(responseData)) {
        data = responseData;
      } else if (responseData.data && Array.isArray(responseData.data)) {
        data = responseData.data;
      } else if (responseData.results && Array.isArray(responseData.results)) {
        data = responseData.results;
      } else if (responseData.data && typeof responseData.data === 'object') {
        // Handle case where data is an object containing the price points
        const dataObj = responseData.data;
        console.log('🚨 ENHANCED DEBUG - Data object structure:', dataObj);
        console.log('🚨 ENHANCED DEBUG - Data object values:', Object.values(dataObj));
        
        // Check if data has properties that look like price points
        const possibleArrays = Object.values(dataObj).filter(val => Array.isArray(val));
        if (possibleArrays.length > 0) {
          // Use the first array found
          data = possibleArrays[0];
          console.log('🚨 ENHANCED DEBUG - Found array in data object:', data);
        } else {
          // If no arrays found, try to extract price points from the object
          data = Object.values(dataObj).filter(val => 
            val && typeof val === 'object' && (val.date || val.price || val.value)
          );
          console.log('🚨 ENHANCED DEBUG - Extracted price points from object:', data);
        }
        
        // If still no data, try to convert the object values to an array
        if (!data || data.length === 0) {
          const allValues = Object.values(dataObj);
          console.log('🚨 ENHANCED DEBUG - All data object values:', allValues);
          
          // Look for objects that might be price points
          data = allValues.filter(val => 
            val && typeof val === 'object' && 
            (val.date || val.price || val.value || val.timestamp)
          );
          console.log('🚨 ENHANCED DEBUG - Filtered price points:', data);
        }
        
        // If still no data, try to parse date-keyed object structure
        if (!data || data.length === 0) {
          console.log('🚨 ENHANCED DEBUG - Trying date-keyed object parsing...');
          const dateKeys = Object.keys(dataObj);
          console.log('🚨 ENHANCED DEBUG - Date keys found:', dateKeys);
          
          // Convert date-keyed object to array of price points
          data = dateKeys.map(dateKey => {
            const priceData = dataObj[dateKey];
            console.log(`🚨 ENHANCED DEBUG - Price data for ${dateKey}:`, priceData);
            
            // Extract price from various possible fields
            // API returns all prices in USD
            const price = priceData.tcg_player_market || priceData.cm_low || priceData.price || priceData.value || priceData.avg_price || priceData.low_price || priceData.high_price;
            
            // All prices are in USD
            const currency = 'USD';
            const finalPrice = price;
            
            return {
              date: dateKey,
              price: finalPrice || 0,
              currency: currency
            };
          }).filter(point => point.price > 0); // Only include points with valid prices
          
          console.log('🚨 ENHANCED DEBUG - Converted date-keyed data:', data);
        }
      } else {
        console.error('❌ Unexpected history prices API response structure:', responseData);
        console.log('🔍 Available keys:', Object.keys(responseData));
        if (responseData.data) {
          console.log('🔍 Data object keys:', Object.keys(responseData.data));
        }
        return [];
      }
      
      console.log('📈 Extracted data:', data);
      console.log('📈 Data length:', data ? data.length : 'null');
      if (data && data.length > 0) {
        console.log('📈 Sample data point:', data[0]);
      }
      
      // Format and sort by date
      const formattedData = data
        .map(pricePoint => ({
          date: pricePoint.date,
          price: pricePoint.price || pricePoint.value || 0,
          currency: 'USD'
        }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      this.setCache(cacheKey, formattedData);
      console.log(`✅ Fetched ${formattedData.length} history price points for card ${cardId}`);
      return formattedData;

    } catch (error) {
      console.error('❌ Error fetching card history prices:', error);
      return [];
    }
  }

  /**
   * Calculate trend from history prices
   */
  calculateTrendFromHistory(historyPrices, days = 7) {
    if (!historyPrices || historyPrices.length < 2) {
      return { trend: 0, dollarChange: 0 };
    }

    // Get the most recent price
    const currentPrice = historyPrices[historyPrices.length - 1].price;
    
    // Get price from N days ago
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - days);
    
    const historicalPrice = historyPrices.find(point => 
      new Date(point.date) <= targetDate
    );

    if (!historicalPrice) {
      return { trend: 0, dollarChange: 0 };
    }

    const trend = this.calculateTrend(currentPrice, historicalPrice.price);
    const dollarChange = currentPrice - historicalPrice.price;

    return { trend, dollarChange };
  }

  /**
   * Calculate trend percentage
   */
  calculateTrend(currentValue, previousValue) {
    if (!currentValue || !previousValue || previousValue === 0) {
      return 0;
    }
    
    const percentage = ((currentValue - previousValue) / previousValue) * 100;
    return Math.round(percentage * 100) / 100;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    try {
      localStorage.removeItem('tcgGoApiCache');
      console.log('🗑️ Cleared all cache (in-memory and persistent)');
    } catch (error) {
      console.warn('⚠️ Failed to clear persistent cache:', error);
    }
  }
}

// Create singleton instance
const tcgGoApiService = new TCGGoApiService();

export default tcgGoApiService;
