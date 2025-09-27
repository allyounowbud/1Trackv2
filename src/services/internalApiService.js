/**
 * Internal API Service
 * Frontend service that communicates with our backend API proxy
 * Replaces direct external API calls with internal API calls
 * Falls back to direct API calls if backend is not available
 */

import tcgGoApiService from './tcgGoApiService.js';

class InternalApiService {
  constructor() {
    this.baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-proxy`;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes client-side cache
    this.backendAvailable = true; // Track if backend is available
  }

  /**
   * Make request to internal API with fallback
   */
  async makeRequest(endpoint, params = {}) {
    if (!this.backendAvailable) {
      throw new Error('Backend API not available, using fallback');
    }

    try {
      const url = new URL(`${this.baseUrl}${endpoint}`);
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      });

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Internal API error: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.warn('Backend API failed, marking as unavailable:', error.message);
      this.backendAvailable = false;
      throw error;
    }
  }

  /**
   * Store data in Supabase database for caching
   */
  async storeInDatabase(table, data) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY
      );

      const { error } = await supabase
        .from(table)
        .upsert(data, { onConflict: 'id' });

      if (error) {
        console.error(`Error storing in ${table}:`, error);
        // Don't throw error - just log it and continue
        return false;
      } else {
        console.log(`✅ Stored data in ${table}`);
        return true;
      }
    } catch (error) {
      console.error(`Database storage error for ${table}:`, error);
      // Don't throw error - just log it and continue
      return false;
    }
  }

  /**
   * Get data from Supabase database cache
   */
  async getFromDatabase(table, filters = {}) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY
      );

      let query = supabase.from(table).select('*');
      
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
      
      const { data, error } = await query;
      
      if (error) {
        console.error(`Error fetching from ${table}:`, error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error(`Database fetch error for ${table}:`, error);
      return [];
    }
  }

  /**
   * Client-side cache management
   */
  getCacheKey(endpoint, params) {
    return `${endpoint}:${JSON.stringify(params)}`;
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Search cards using Scrydex API
   */
  async searchCards(query, limit = 20, game = 'pokemon') {
    const cacheKey = this.getCacheKey('/search/cards', { q: query, limit, game });
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log('📦 Client cache hit for cards:', query);
      return cached;
    }

    try {
      const result = await this.makeRequest('/search/cards', { q: query, limit, game });
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.warn('Backend API failed, falling back to direct TCG Go API for cards:', error.message);
      
      try {
        const cards = await tcgGoApiService.searchCards(query, limit);
        const fallbackResult = {
          success: true,
          data: cards,
          source: 'tcgGo_direct_fallback'
        };
        this.setCache(cacheKey, fallbackResult);
        return fallbackResult;
      } catch (fallbackError) {
        console.error('Both backend and fallback failed for cards:', fallbackError);
        return {
          success: false,
          error: fallbackError.message,
          data: []
        };
      }
    }
  }

  /**
   * Search products
   */
  async searchProducts(query, limit = 20) {
    const cacheKey = this.getCacheKey('/search/products', { q: query, limit });
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log('📦 Client cache hit for products:', query);
      return cached;
    }

    try {
      const result = await this.makeRequest('/search/products', { q: query, limit });
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.warn('Backend API failed, falling back to direct TCG Go API for products:', error.message);
      
      try {
        const products = await tcgGoApiService.searchProducts(query, limit);
        const fallbackResult = {
          success: true,
          data: products,
          source: 'tcgGo_direct_fallback'
        };
        this.setCache(cacheKey, fallbackResult);
        return fallbackResult;
      } catch (fallbackError) {
        console.error('Both backend and fallback failed for products:', fallbackError);
        return {
          success: false,
          error: fallbackError.message,
          data: []
        };
      }
    }
  }

  /**
   * Get expansion data
   */
  async getExpansionData(expansionId) {
    const cacheKey = this.getCacheKey('/expansion', { id: expansionId });
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log('📦 Client cache hit for expansion:', expansionId);
      return cached;
    }

    try {
      const result = await this.makeRequest('/expansion', { id: expansionId });
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Get expansion data error:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Get market data
   */
  async getMarketData(productName) {
    const cacheKey = this.getCacheKey('/market-data', { product: productName });
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log('📦 Client cache hit for market data:', productName);
      return cached;
    }

    try {
      const result = await this.makeRequest('/market-data', { product: productName });
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Get market data error:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Get all expansions (cached from Scrydex)
   */
  async getAllExpansions(game = 'pokemon') {
    const cacheKey = this.getCacheKey('/search/expansions', { game: game, limit: 1000 });
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log(`📦 Client cache hit for all ${game} expansions`);
      return cached.data || [];
    }

    try {
      // Try database cache first
      console.log(`🔍 Checking database cache for ${game} expansions...`);
      const dbCached = await this.getFromDatabase('scrydex_search_cache', { 
        game: game,
        search_type: 'expansions',
        query: 'all'
      });
      
      if (dbCached && dbCached.length > 0) {
        console.log(`📦 Database cache hit for ${game} expansions, got`, dbCached.length, 'items');
        const expansions = dbCached[0].results.data || [];
        this.setCache(cacheKey, { success: true, data: expansions, source: 'database_cache' });
        return expansions;
      }

      // Try backend API first
      const result = await this.makeRequest('/search/expansions', { 
        game: game,
        limit: 1000 
      });
      this.setCache(cacheKey, result);
      return result.data || [];
    } catch (error) {
      console.warn(`Backend API failed for ${game} expansions, falling back to direct API:`, error.message);
      
      try {
        // Fallback to direct TCG Go API for Pokemon only
        if (game === 'pokemon') {
          console.log('🔄 Attempting fallback to TCG Go API...');
          const expansions = await tcgGoApiService.getAllExpansions();
          console.log('✅ TCG Go API fallback successful, got', expansions?.length || 0, 'expansions');
        
        // Store in database for future use (non-blocking)
        if (expansions && expansions.length > 0) {
          const dataToStore = expansions.map((expansion, index) => ({
            id: `expansion_${expansion.id || index}`,
            search_term: 'expansion',
            name: expansion.name,
            set: expansion.set,
            price: expansion.price || 0,
            image_url: expansion.imageUrl || expansion.image_url,
            product_id: expansion.id,
            data: expansion,
            created_at: new Date().toISOString()
          }));
          
          // Store in database asynchronously without blocking
          this.storeInDatabase('cached_products', dataToStore).catch(dbError => {
            console.warn('Failed to store expansions in database:', dbError.message);
          });
        }
        
          const fallbackResult = {
            success: true,
            data: expansions,
            source: 'tcgGo_direct_fallback'
          };
          this.setCache(cacheKey, fallbackResult);
          return expansions || [];
        } else {
          // For other games, return empty array for now
          console.log(`No fallback available for ${game} expansions`);
          return [];
        }
      } catch (fallbackError) {
        console.error(`❌ Both backend and fallback failed for ${game} expansions:`, fallbackError);
        console.error('Fallback error details:', {
          message: fallbackError.message,
          stack: fallbackError.stack
        });
        return [];
      }
    }
  }

  /**
   * Get expansion cards
   */
  async getExpansionCards(expansionId, sort = 'relevance', limit = 1000) {
    try {
      // Try database cache first
      console.log(`🔍 Checking database cache for expansion ${expansionId} cards...`);
      const dbCached = await this.getFromDatabase('cached_cards', { 
        expansion_id: expansionId 
      });
      
      if (dbCached && dbCached.length > 0) {
        console.log('📦 Database cache hit for expansion cards, got', dbCached.length, 'cards');
        return dbCached.map(item => item.data).filter(Boolean);
      }

      const expansionData = await this.getExpansionData(expansionId);
      if (expansionData.success && expansionData.data) {
        return expansionData.data.cards || [];
      }
      
      // If backend failed, try direct TCG Go API fallback
      if (!this.backendAvailable) {
        console.log('🔄 Backend unavailable, falling back to direct TCG Go API for expansion cards...');
        try {
          const cards = await tcgGoApiService.getExpansionCards(expansionId, sort, limit);
          console.log('✅ TCG Go API fallback successful for expansion cards, got', cards?.length || 0, 'cards');
          
          // Store in database for future use
          if (cards && cards.length > 0) {
            const dataToStore = cards.map((card, index) => ({
              id: `card_${card.id || card.product_id || index}`,
              expansion_id: expansionId,
              search_term: card.name?.toLowerCase() || '',
              name: card.name,
              set: card.set,
              rarity: card.rarity,
              price: card.price || 0,
              image_url: card.imageUrl || card.image_url,
              product_id: card.id || card.product_id,
              data: card,
              created_at: new Date().toISOString()
            }));
            
            await this.storeInDatabase('cached_cards', dataToStore);
          }
          
          return cards || [];
        } catch (fallbackError) {
          console.error('❌ TCG Go API fallback failed for expansion cards:', fallbackError);
          return [];
        }
      }
      
      return [];
    } catch (error) {
      console.error('Get expansion cards error:', error);
      return [];
    }
  }

  /**
   * Get expansion products
   */
  async getExpansionProducts(expansionId, sort = 'relevance', limit = 500) {
    try {
      // Try database cache first
      console.log(`🔍 Checking database cache for expansion ${expansionId} products...`);
      const dbCached = await this.getFromDatabase('cached_products', { 
        expansion_id: expansionId 
      });
      
      if (dbCached && dbCached.length > 0) {
        console.log('📦 Database cache hit for expansion products, got', dbCached.length, 'products');
        return dbCached.map(item => item.data).filter(Boolean);
      }

      const expansionData = await this.getExpansionData(expansionId);
      if (expansionData.success && expansionData.data) {
        return expansionData.data.products || [];
      }
      
      // If backend failed, try direct TCG Go API fallback
      if (!this.backendAvailable) {
        console.log('🔄 Backend unavailable, falling back to direct TCG Go API for expansion products...');
        try {
          const products = await tcgGoApiService.getExpansionProducts(expansionId, sort, limit);
          console.log('✅ TCG Go API fallback successful for expansion products, got', products?.length || 0, 'products');
          
          // Store in database for future use
          if (products && products.length > 0) {
            const dataToStore = products.map((product, index) => ({
              id: `product_${product.id || product.product_id || index}`,
              expansion_id: expansionId,
              search_term: product.name?.toLowerCase() || '',
              name: product.name,
              set: product.set,
              price: product.price || 0,
              image_url: product.imageUrl || product.image_url,
              product_id: product.id || product.product_id,
              data: product,
              created_at: new Date().toISOString()
            }));
            
            await this.storeInDatabase('cached_products', dataToStore);
          }
          
          return products || [];
        } catch (fallbackError) {
          console.error('❌ TCG Go API fallback failed for expansion products:', fallbackError);
          return [];
        }
      }
      
      return [];
    } catch (error) {
      console.error('Get expansion products error:', error);
      return [];
    }
  }

  /**
   * Clear client-side cache
   */
  clearCache() {
    this.cache.clear();
    console.log('🧹 Client cache cleared');
  }

  /**
   * Get cache status
   */
  getCacheStatus() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
      backendAvailable: this.backendAvailable
    };
  }

  /**
   * Reset backend availability (for testing)
   */
  resetBackendAvailability() {
    this.backendAvailable = true;
    console.log('🔄 Backend availability reset - will try backend API again');
  }
}

// Create singleton instance
const internalApiService = new InternalApiService();

export default internalApiService;
