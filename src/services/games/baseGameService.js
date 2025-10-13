/**
 * Base Game Service
 * Abstract base class for game-specific services
 * Each TCG extends this to implement their specific logic
 */

import { supabase } from '../../lib/supabaseClient';

class BaseGameService {
  constructor(gameConfig) {
    this.config = gameConfig;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get game configuration
   */
  getConfig() {
    return this.config;
  }

  /**
   * Get game ID
   */
  getGameId() {
    return this.config.id;
  }

  /**
   * Check if feature is supported
   */
  hasFeature(feature) {
    return this.config.features?.[feature] === true;
  }

  /**
   * Get database table names
   */
  getDatabases() {
    return this.config.databases || {};
  }

  /**
   * Cache helper methods
   */
  getCacheKey(...args) {
    return `${this.getGameId()}_${args.join('_')}`;
  }

  getCached(key) {
    if (!this.cache.has(key)) return null;
    
    const cached = this.cache.get(key);
    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clearCache() {
    this.cache.clear();
  }

  /**
   * Search cards - to be implemented by each game
   */
  async searchCards(query, options = {}) {
    throw new Error('searchCards() must be implemented by game service');
  }

  /**
   * Get card by ID - to be implemented by each game
   */
  async getCardById(id) {
    throw new Error('getCardById() must be implemented by game service');
  }

  /**
   * Get expansions/sets - to be implemented by each game
   */
  async getExpansions(options = {}) {
    throw new Error('getExpansions() must be implemented by game service');
  }

  /**
   * Get cards by expansion - to be implemented by each game
   */
  async getCardsByExpansion(expansionId, options = {}) {
    throw new Error('getCardsByExpansion() must be implemented by game service');
  }

  /**
   * Get pricing data - to be implemented by each game
   */
  async getPricing(cardId) {
    throw new Error('getPricing() must be implemented by game service');
  }

  /**
   * Search sealed products - optional
   */
  async searchSealedProducts(query, options = {}) {
    if (!this.hasFeature('sealed')) {
      return { data: [], total: 0 };
    }
    throw new Error('searchSealedProducts() must be implemented if sealed products are supported');
  }

  /**
   * Generic database query helper
   */
  async queryDatabase(tableName, options = {}) {
    const {
      filters = [],
      search = null,
      searchFields = ['name'],
      sortBy = 'name',
      sortOrder = 'asc',
      page = 1,
      pageSize = 30
    } = options;

    try {
      let query = supabase
        .from(tableName)
        .select('*', { count: 'exact' });

      // Apply filters
      filters.forEach(filter => {
        query = query.filter(filter.column, filter.operator, filter.value);
      });

      // Apply search
      if (search && search.trim()) {
        const searchConditions = searchFields.map(field => 
          `${field}.ilike.%${search.trim()}%`
        ).join(',');
        query = query.or(searchConditions);
      }

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error(`❌ Database query error for ${tableName}:`, error);
        return { data: [], total: 0, page, pageSize };
      }

      return {
        data: data || [],
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
        hasMore: (page * pageSize) < (count || 0)
      };
    } catch (error) {
      console.error(`❌ Unexpected error querying ${tableName}:`, error);
      return { data: [], total: 0, page, pageSize };
    }
  }
}

export default BaseGameService;

