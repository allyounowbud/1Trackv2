/**
 * Local Search Service
 * Fast, responsive search using local Supabase data instead of external APIs
 */

import { supabase } from '../lib/supabaseClient.js';

class LocalSearchService {
  constructor() {
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    this.isInitialized = true;
  }

  /**
   * Search Pokémon cards in local Supabase database
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results
   */
  async searchCards(query, options = {}) {
    const {
      page = 1,
      pageSize = 30, // Optimized pagination for fast loading
      expansionId = null,
      supertype = null,
      types = null,
      subtypes = null,
      rarity = null,
      artists = null,
      weaknesses = null,
      resistances = null,
      sortBy = 'number',
      sortOrder = 'asc'
    } = options;

    try {
      // Build the query
      let supabaseQuery = supabase
        .from('pokemon_cards')
        .select('*', { count: 'exact' });

      // Apply search filters
      if (query && query.trim()) {
        const searchTerm = query.trim();
        
        // Search in name, number, and artist fields
        supabaseQuery = supabaseQuery.or(`name.ilike.%${searchTerm}%,number.ilike.%${searchTerm}%,artist.ilike.%${searchTerm}%`);
      }

      // Apply expansion filter
      if (expansionId) {
        supabaseQuery = supabaseQuery.eq('expansion_id', expansionId);
      }

      // Apply type filter
      if (types && types.length > 0) {
        supabaseQuery = supabaseQuery.overlaps('types', types);
      }

      // Apply subtype filter
      if (subtypes && subtypes.length > 0) {
        supabaseQuery = supabaseQuery.overlaps('subtypes', subtypes);
      }

      // Apply supertype filter
      if (supertype && supertype.length > 0) {
        supabaseQuery = supabaseQuery.in('supertype', supertype);
      }

      // Apply rarity filter
      if (rarity && rarity.length > 0) {
        supabaseQuery = supabaseQuery.in('rarity', rarity);
      }

      // Apply artist filter
      if (artists && artists.length > 0) {
        supabaseQuery = supabaseQuery.in('artist', artists);
      }

      // Apply weaknesses filter
      if (weaknesses && weaknesses.length > 0) {
        supabaseQuery = supabaseQuery.overlaps('weaknesses', weaknesses);
      }

      // Apply resistances filter
      if (resistances && resistances.length > 0) {
        supabaseQuery = supabaseQuery.overlaps('resistances', resistances);
      }

      // Apply sorting
      if (sortBy && sortOrder) {
        if (sortBy === 'number') {
          supabaseQuery = supabaseQuery.order('number', { ascending: sortOrder === 'asc', nullsLast: true });
        } else if (sortBy === 'raw_market' || sortBy === 'graded_market') {
          supabaseQuery = supabaseQuery.order(`CAST(${sortBy} AS NUMERIC)`, { 
            ascending: sortOrder === 'asc',
            nullsFirst: false
          });
        } else {
          supabaseQuery = supabaseQuery.order(sortBy, { ascending: sortOrder === 'asc' });
        }
      } else {
        supabaseQuery = supabaseQuery.order('name', { ascending: true });
      }

      // Apply pagination - use database sorting for performance
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      supabaseQuery = supabaseQuery.range(from, to);

      // Execute query
      const { data: cards, error, count } = await supabaseQuery;

      if (error) {
        console.error('Local search error:', error);
        throw new Error(`Search failed: ${error.message}`);
      }

      // Format response to match Scrydex API format
      const result = {
        data: cards || [],
        total: count || 0,
        page: page,
        pageSize: pageSize,
        totalPages: Math.ceil((count || 0) / pageSize)
      };

      return result;

    } catch (error) {
      console.error('Local search error:', error);
      throw error;
    }
  }

  /**
   * Get Pokémon expansions from local database
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Expansions list
   */
  async getExpansions(options = {}) {
    const {
      page = 1,
      pageSize = 1000, // Load many expansions but still paginated
      sortBy = 'name',
      sortOrder = 'asc'
    } = options;

    try {
      let supabaseQuery = supabase
        .from('pokemon_expansions')
        .select(`
          id,
          name,
          series,
          code,
          total,
          printed_total,
          language,
          language_code,
          release_date,
          is_online_only,
          logo,
          symbol,
          translation,
          created_at,
          updated_at
        `, { count: 'exact' });

      // Apply sorting
      if (sortBy && sortOrder) {
        supabaseQuery = supabaseQuery.order(sortBy, { ascending: sortOrder === 'asc' });
      } else {
        supabaseQuery = supabaseQuery.order('name', { ascending: true });
      }

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      supabaseQuery = supabaseQuery.range(from, to);

      const { data: expansions, error, count } = await supabaseQuery;

      if (error) {
        console.error('Local expansions error:', error);
        throw new Error(`Failed to fetch expansions: ${error.message}`);
      }

      return expansions || [];

    } catch (error) {
      console.error('Local expansions error:', error);
      throw error;
    }
  }

  /**
   * Get a specific card by ID
   * @param {string} cardId - Card ID
   * @returns {Promise<Object>} Card data
   */
  async getCardById(cardId) {
    try {
      const { data: card, error } = await supabase
        .from('pokemon_cards')
        .select('*')
        .eq('id', cardId)
        .single();

      if (error) {
        console.error('Get card by ID error:', error);
        throw new Error(`Failed to fetch card: ${error.message}`);
      }

      return card;

    } catch (error) {
      console.error('Get card by ID error:', error);
      throw error;
    }
  }

  /**
   * Search sealed products by name across all expansions
   * @param {string} query - Search query
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Search results
   */
  async searchSealedProducts(query, options = {}) {
    const {
      page = 1,
      pageSize = 30,
      sortBy = 'name',
      sortOrder = 'asc'
    } = options

    try {
      let supabaseQuery = supabase
        .from('sealed_products')
        .select('*', { count: 'exact' })

      // Apply search filters
      if (query && query.trim()) {
        const searchTerm = query.trim()
        
        // Search in name field
        supabaseQuery = supabaseQuery.ilike('name', `%${searchTerm}%`)
      }

      // Apply sorting
      if (sortBy && sortOrder) {
        if (sortBy === 'pricing_market') {
          supabaseQuery = supabaseQuery.order('pricing_market', { 
            ascending: sortOrder === 'asc',
            nullsFirst: false 
          })
        } else if (sortBy === 'name') {
          supabaseQuery = supabaseQuery.order('name', { ascending: sortOrder === 'asc' })
        } else if (sortBy === 'number') {
          // Sealed products don't have a 'number' column, use 'name' instead
          supabaseQuery = supabaseQuery.order('name', { ascending: sortOrder === 'asc' })
        } else {
          // Try to order by the requested column, fallback to 'name' if it doesn't exist
          try {
            supabaseQuery = supabaseQuery.order(sortBy, { ascending: sortOrder === 'asc' })
          } catch (error) {
            supabaseQuery = supabaseQuery.order('name', { ascending: sortOrder === 'asc' })
          }
        }
      } else {
        supabaseQuery = supabaseQuery.order('name', { ascending: true })
      }

      // Apply pagination
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      supabaseQuery = supabaseQuery.range(from, to)

      const { data: sealedProducts, error, count } = await supabaseQuery

      if (error) {
        console.error('❌ Error fetching sealed products:', error)
        throw error
      }

      return {
        data: sealedProducts || [],
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
        hasMore: (page * pageSize) < (count || 0)
      }
    } catch (error) {
      console.error('❌ Error searching sealed products:', error)
      throw error
    }
  }

  /**
   * Get sealed products for a specific expansion from database
   * @param {string} expansionId - Expansion ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Sealed products in expansion
   */
  async getSealedProductsByExpansion(expansionId, options = {}) {
    const {
      page = 1,
      pageSize = 30,
      sortBy = 'name',
      sortOrder = 'asc'
    } = options

    try {
      let supabaseQuery = supabase
        .from('sealed_products')
        .select('*', { count: 'exact' })
        .eq('expansion_id', expansionId)

      // Apply sorting - sealed products don't have 'number' column, default to 'name'
      if (sortBy && sortOrder) {
        if (sortBy === 'pricing_market') {
          supabaseQuery = supabaseQuery.order('pricing_market', { 
            ascending: sortOrder === 'asc',
            nullsFirst: false 
          })
        } else if (sortBy === 'name') {
          supabaseQuery = supabaseQuery.order('name', { ascending: sortOrder === 'asc' })
        } else if (sortBy === 'number') {
          // Sealed products don't have a 'number' column, use 'name' instead
          supabaseQuery = supabaseQuery.order('name', { ascending: sortOrder === 'asc' })
        } else {
          try {
            supabaseQuery = supabaseQuery.order(sortBy, { ascending: sortOrder === 'asc' })
          } catch (error) {
            supabaseQuery = supabaseQuery.order('name', { ascending: sortOrder === 'asc' })
          }
        }
      } else {
        supabaseQuery = supabaseQuery.order('name', { ascending: true })
      }

      // Apply pagination
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      supabaseQuery = supabaseQuery.range(from, to)

      const { data: sealedProducts, error, count } = await supabaseQuery

      if (error) {
        console.error('❌ Error fetching sealed products:', error)
        throw error
      }

      return {
        data: sealedProducts || [],
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
        hasMore: (page * pageSize) < (count || 0)
      }
    } catch (error) {
      console.error('❌ Error getting sealed products by expansion:', error)
      throw error
    }
  }

  /**
   * Get cards by expansion ID
   * @param {string} expansionId - Expansion ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Cards in expansion
   */
  async getCardsByExpansion(expansionId, options = {}) {
    const {
      page = 1,
      pageSize = 10000, // Load all cards for expansion views
      sortBy = 'number', // Sort by card number by default
      sortOrder = 'asc',
      supertype = null,
      types = null,
      subtypes = null,
      rarity = null,
      artists = null,
      weaknesses = null,
      resistances = null
    } = options;

    try {
      let supabaseQuery = supabase
        .from('pokemon_cards')
        .select('*', { count: 'exact' })
        .eq('expansion_id', expansionId);

      // Apply type filter
      if (types && types.length > 0) {
        supabaseQuery = supabaseQuery.overlaps('types', types);
      }

      // Apply subtype filter
      if (subtypes && subtypes.length > 0) {
        supabaseQuery = supabaseQuery.overlaps('subtypes', subtypes);
      }

      // Apply supertype filter
      if (supertype && supertype.length > 0) {
        supabaseQuery = supabaseQuery.in('supertype', supertype);
      }

      // Apply rarity filter
      if (rarity && rarity.length > 0) {
        supabaseQuery = supabaseQuery.in('rarity', rarity);
      }

      // Apply artist filter
      if (artists && artists.length > 0) {
        supabaseQuery = supabaseQuery.in('artist', artists);
      }

      // Apply weaknesses filter
      if (weaknesses && weaknesses.length > 0) {
        supabaseQuery = supabaseQuery.overlaps('weaknesses', weaknesses);
      }

      // Apply resistances filter
      if (resistances && resistances.length > 0) {
        supabaseQuery = supabaseQuery.overlaps('resistances', resistances);
      }

      // Apply sorting
      if (sortBy && sortOrder) {
        if (sortBy === 'number') {
          supabaseQuery = supabaseQuery.order('name', { ascending: true });
        } else if (sortBy === 'raw_market' || sortBy === 'graded_market') {
          supabaseQuery = supabaseQuery.order(`CAST(${sortBy} AS NUMERIC)`, { 
            ascending: sortOrder === 'asc',
            nullsFirst: false
          });
        } else {
          supabaseQuery = supabaseQuery.order(sortBy, { ascending: sortOrder === 'asc' });
        }
      } else {
        supabaseQuery = supabaseQuery.order('name', { ascending: true });
      }

      const { data: cards, error, count } = await supabaseQuery;

      if (error) {
        console.error('Get cards by expansion error:', error);
        throw new Error(`Failed to fetch expansion cards: ${error.message}`);
      }

      const result = {
        data: cards || [],
        total: count || 0,
        page: page,
        pageSize: pageSize,
        totalPages: Math.ceil((count || 0) / pageSize)
      };

      return result;

    } catch (error) {
      console.error('Get cards by expansion error:', error);
      throw error;
    }
  }

  /**
   * Get database statistics
   * @returns {Promise<Object>} Database stats
   */
  async getDatabaseStats() {
    try {
      const [cardsResult, expansionsResult] = await Promise.all([
        supabase
          .from('pokemon_cards')
          .select('*', { count: 'exact', head: true }),
        supabase
          .from('pokemon_expansions')
          .select('*', { count: 'exact', head: true })
      ]);

      return {
        totalCards: cardsResult.count || 0,
        totalExpansions: expansionsResult.count || 0,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      console.error('Get database stats error:', error);
      throw error;
    }
  }

  /**
   * Search with advanced filters
   * @param {Object} filters - Advanced search filters
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Filtered search results
   */
  async advancedSearch(filters = {}, options = {}) {
    const {
      page = 1,
      pageSize = 30, // Optimized pagination for fast loading
      sortBy = 'name',
      sortOrder = 'asc'
    } = options;

    try {
      let supabaseQuery = supabase
        .from('pokemon_cards')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters.name) {
        supabaseQuery = supabaseQuery.ilike('name', `%${filters.name}%`);
      }

      if (filters.types && filters.types.length > 0) {
        supabaseQuery = supabaseQuery.overlaps('types', filters.types);
      }

      if (filters.subtypes && filters.subtypes.length > 0) {
        supabaseQuery = supabaseQuery.overlaps('subtypes', filters.subtypes);
      }

      if (filters.rarity) {
        supabaseQuery = supabaseQuery.eq('rarity', filters.rarity);
      }

      if (filters.expansionId) {
        supabaseQuery = supabaseQuery.eq('expansion_id', filters.expansionId);
      }

      if (filters.hpMin) {
        supabaseQuery = supabaseQuery.gte('hp', filters.hpMin);
      }

      if (filters.hpMax) {
        supabaseQuery = supabaseQuery.lte('hp', filters.hpMax);
      }

      if (filters.hasPricing) {
        supabaseQuery = supabaseQuery.not('raw_pricing', 'is', null);
      }

      // Apply sorting
      if (sortBy && sortOrder) {
        supabaseQuery = supabaseQuery.order(sortBy, { ascending: sortOrder === 'asc' });
      } else {
        supabaseQuery = supabaseQuery.order('name', { ascending: true });
      }

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      supabaseQuery = supabaseQuery.range(from, to);

      const { data: cards, error, count } = await supabaseQuery;

      if (error) {
        console.error('Advanced search error:', error);
        throw new Error(`Advanced search failed: ${error.message}`);
      }

      return {
        data: cards || [],
        total: count || 0,
        page: page,
        pageSize: pageSize,
        totalPages: Math.ceil((count || 0) / pageSize)
      };

    } catch (error) {
      console.error('Advanced search error:', error);
      throw error;
    }
  }
}

// Create and export singleton instance
const localSearchService = new LocalSearchService();
export default localSearchService;
