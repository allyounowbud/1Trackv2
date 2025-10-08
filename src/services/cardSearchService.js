/**
 * Card Search Service
 * 
 * Simplified search following Scrydex best practices:
 * - Direct database queries (Supabase IS the cache)
 * - No additional caching layer for metadata
 * - Clean, fast, predictable performance
 */

import { supabase } from '../lib/supabaseClient.js';

class CardSearchService {
  constructor() {
    this.isInitialized = false;
  }

  async initialize() {
    this.isInitialized = true;
  }

  /**
   * Search cards across all expansions
   */
  async searchCards(query, options = {}) {
    const {
      page = 1,
      pageSize = 30,
      sortBy = 'name',
      sortOrder = 'asc',
      filters = {}
    } = options;

    try {
      let supabaseQuery = supabase
        .from('pokemon_cards')
        .select('*', { count: 'exact' });

      // Apply search query
      if (query && query.trim()) {
        const searchTerm = query.trim();
        supabaseQuery = supabaseQuery.or(
          `name.ilike.%${searchTerm}%,number.ilike.%${searchTerm}%,artist.ilike.%${searchTerm}%`
        );
      }

      // Apply filters
      if (filters.expansionId) {
        supabaseQuery = supabaseQuery.eq('expansion_id', filters.expansionId);
      }

      if (filters.supertype?.length > 0) {
        supabaseQuery = supabaseQuery.in('supertype', filters.supertype);
      }

      if (filters.types?.length > 0) {
        supabaseQuery = supabaseQuery.overlaps('types', filters.types);
      }

      if (filters.subtypes?.length > 0) {
        supabaseQuery = supabaseQuery.overlaps('subtypes', filters.subtypes);
      }

      if (filters.rarity?.length > 0) {
        supabaseQuery = supabaseQuery.in('rarity', filters.rarity);
      }

      if (filters.artists?.length > 0) {
        supabaseQuery = supabaseQuery.in('artist', filters.artists);
      }

      // Apply sorting
      if (sortBy === 'number') {
        // Use simple string sorting - PostgREST doesn't support complex functions in order
        supabaseQuery = supabaseQuery.order('number', { 
          ascending: sortOrder === 'asc', 
          nullsLast: true 
        });
      } else if (sortBy === 'raw_market' || sortBy === 'graded_market') {
        supabaseQuery = supabaseQuery.order(sortBy, { 
          ascending: sortOrder === 'asc',
          nullsLast: true
        });
      } else {
        supabaseQuery = supabaseQuery.order(sortBy, { ascending: sortOrder === 'asc' });
      }

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      supabaseQuery = supabaseQuery.range(from, to);

      const { data, error, count } = await supabaseQuery;

      if (error) throw error;

      return {
        cards: data || [],
        total: count || 0,
        page,
        pageSize,
        hasMore: (page * pageSize) < (count || 0)
      };
    } catch (error) {
      console.error('Error searching cards:', error);
      throw error;
    }
  }

  /**
   * Search sealed products across all expansions
   */
  async searchSealedProducts(query, options = {}) {
    const {
      page = 1,
      pageSize = 30,
      sortBy = 'name',
      sortOrder = 'asc'
    } = options;

    try {
      let supabaseQuery = supabase
        .from('sealed_products')
        .select('*', { count: 'exact' });

      // Apply search query
      if (query && query.trim()) {
        supabaseQuery = supabaseQuery.ilike('name', `%${query.trim()}%`);
      }

      // Apply sorting
      if (sortBy === 'pricing_market') {
        supabaseQuery = supabaseQuery.order('pricing_market', { 
          ascending: sortOrder === 'asc',
          nullsLast: true
        });
      } else {
        supabaseQuery = supabaseQuery.order('name', { ascending: sortOrder === 'asc' });
      }

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      supabaseQuery = supabaseQuery.range(from, to);

      const { data, error, count } = await supabaseQuery;

      if (error) throw error;

      return {
        products: data || [],
        total: count || 0,
        page,
        pageSize,
        hasMore: (page * pageSize) < (count || 0)
      };
    } catch (error) {
      console.error('Error searching sealed products:', error);
      throw error;
    }
  }

  /**
   * Get a specific card by ID
   */
  async getCardById(cardId) {
    try {
      const { data, error } = await supabase
        .from('pokemon_cards')
        .select('*')
        .eq('id', cardId)
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error fetching card:', error);
      throw error;
    }
  }
}

// Export singleton instance
const cardSearchService = new CardSearchService();
export default cardSearchService;

