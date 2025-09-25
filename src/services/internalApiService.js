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
   * Search cards
   */
  async searchCards(query, limit = 20) {
    const cacheKey = this.getCacheKey('/search/cards', { q: query, limit });
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log('📦 Client cache hit for cards:', query);
      return cached;
    }

    try {
      const result = await this.makeRequest('/search/cards', { q: query, limit });
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
   * Get all expansions (cached from TCG Go)
   */
  async getAllExpansions() {
    const cacheKey = this.getCacheKey('/search/products', { q: 'expansion', limit: 1000 });
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log('📦 Client cache hit for all expansions');
      return cached.data || [];
    }

    try {
      // Try backend API first
      const result = await this.makeRequest('/search/products', { 
        q: 'expansion', 
        limit: 1000 
      });
      this.setCache(cacheKey, result);
      return result.data || [];
    } catch (error) {
      console.warn('Backend API failed, falling back to direct TCG Go API:', error.message);
      
      try {
        // Fallback to direct TCG Go API
        console.log('🔄 Attempting fallback to TCG Go API...');
        const expansions = await tcgGoApiService.getAllExpansions();
        console.log('✅ TCG Go API fallback successful, got', expansions?.length || 0, 'expansions');
        
        const fallbackResult = {
          success: true,
          data: expansions,
          source: 'tcgGo_direct_fallback'
        };
        this.setCache(cacheKey, fallbackResult);
        return expansions || [];
      } catch (fallbackError) {
        console.error('❌ Both backend and fallback failed:', fallbackError);
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
