// Local Scrydex Database Service
// This service searches the local Supabase database first, then falls back to API if needed

import { supabase } from '../lib/supabaseClient';

class LocalScrydexService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  // Search cards in local database first
  async searchCards(query, options = {}) {
    const cacheKey = `search_${query}_${JSON.stringify(options)}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      
      const { data, error, count } = await supabase
        .from('pokemon_cards')
        .select('*', { count: 'exact' })
        .or(`name.ilike.%${query}%,expansion_name.ilike.%${query}%`)
        .order('name')
        .range(
          ((options.page || 1) - 1) * (options.pageSize || 30),
          ((options.page || 1) * (options.pageSize || 30)) - 1
        );

      if (error) {
        console.error('Local search error:', error);
        throw error;
      }

      const result = {
        data: data || [],
        total: count || 0,
        page: options.page || 1,
        pageSize: options.pageSize || 30,
        totalPages: Math.ceil((count || 0) / (options.pageSize || 30)),
        source: 'local'
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;

    } catch (error) {
      console.error('Local search failed:', error);
      throw error;
    }
  }

  // Search cards by expansion ID
  async searchCardsByExpansion(expansionId, options = {}) {
    const cacheKey = `expansion_${expansionId}_${JSON.stringify(options)}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      
      const { data, error, count } = await supabase
        .from('pokemon_cards')
        .select('*', { count: 'exact' })
        .eq('expansion_id', expansionId)
        .order('number')
        .range(
          ((options.page || 1) - 1) * (options.pageSize || 30),
          ((options.page || 1) * (options.pageSize || 30)) - 1
        );

      if (error) {
        console.error('Expansion search error:', error);
        throw error;
      }

      const result = {
        data: data || [],
        total: count || 0,
        page: options.page || 1,
        pageSize: options.pageSize || 30,
        totalPages: Math.ceil((count || 0) / (options.pageSize || 30)),
        source: 'local'
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;

    } catch (error) {
      console.error('Expansion search failed:', error);
      throw error;
    }
  }

  // Get all expansions from local database
  async getExpansions(options = {}) {
    const cacheKey = `expansions_${JSON.stringify(options)}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      
      const { data, error, count } = await supabase
        .from('pokemon_expansions')
        .select('*', { count: 'exact' })
        .order('release_date', { ascending: false })
        .range(
          ((options.page || 1) - 1) * (options.pageSize || 30),
          ((options.page || 1) * (options.pageSize || 30)) - 1
        );

      if (error) {
        console.error('Expansions search error:', error);
        throw error;
      }

      const result = {
        data: data || [],
        total: count || 0,
        page: options.page || 1,
        pageSize: options.pageSize || 30,
        totalPages: Math.ceil((count || 0) / (options.pageSize || 30)),
        source: 'local'
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;

    } catch (error) {
      console.error('Expansions search failed:', error);
      throw error;
    }
  }

  // Get sync status
  async getSyncStatus() {
    try {
      const { data, error } = await supabase
        .from('sync_status')
        .select('*')
        .single();

      if (error) {
        console.error('Sync status error:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to get sync status:', error);
      return null;
    }
  }

  // Check if local database has data
  async hasData() {
    try {
      const { count, error } = await supabase
        .from('pokemon_cards')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error('Data check error:', error);
        return false;
      }

      return (count || 0) > 0;
    } catch (error) {
      console.error('Failed to check data:', error);
      return false;
    }
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }
}

// Export singleton instance
export default new LocalScrydexService();
