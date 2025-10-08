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
    
    console.log('🚀 Initializing Local Search Service...');
    this.isInitialized = true;
    console.log('✅ Local Search Service initialized');
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
      console.log('🔍 Local search for:', query, 'pageSize:', pageSize);
      console.log('🔍 Filter values:', { supertype, types, subtypes, rarity, artists, weaknesses, resistances });
      console.log('🔍 Supertype filter details:', { supertype, length: supertype?.length, isArray: Array.isArray(supertype) });

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
        console.log('🔍 searchCards: Applying supertype filter:', supertype);
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
      console.log('🔢 Sort parameters received:', { sortBy, sortOrder });
      if (sortBy && sortOrder) {
        if (sortBy === 'number') {
          // For numeric sorting, we'll handle it on the frontend since Supabase doesn't support CAST in ORDER BY with SELECT *
          console.log('🔢 Number sorting will be handled on frontend');
          supabaseQuery = supabaseQuery.order('name', { ascending: true }); // Default alphabetical order
        } else if (sortBy === 'raw_market' || sortBy === 'graded_market') {
          // For price fields, cast to NUMERIC and handle nulls properly
          console.log('🔢 Sorting by price field:', sortBy, 'order:', sortOrder === 'asc' ? 'ascending' : 'descending');
          supabaseQuery = supabaseQuery.order(`CAST(${sortBy} AS NUMERIC)`, { 
            ascending: sortOrder === 'asc',
            nullsFirst: false // Put null values at the end
          });
        } else {
          console.log('🔢 Sorting by field:', sortBy, 'order:', sortOrder === 'asc' ? 'ascending' : 'descending');
          supabaseQuery = supabaseQuery.order(sortBy, { ascending: sortOrder === 'asc' });
        }
      } else {
        // Default sorting - alphabetical by name, frontend will handle numerical sorting
        console.log('🔢 Default sorting by name (frontend will handle numerical sorting)');
        supabaseQuery = supabaseQuery.order('name', { ascending: true });
      }

      // Apply pagination - but load ALL cards if sorting by number for proper numerical sorting
      if (sortBy === 'number') {
        console.log('🔢 Loading ALL cards for numerical sorting (no pagination)');
        // Don't apply pagination when sorting by number - we need all cards to sort properly
      } else {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        supabaseQuery = supabaseQuery.range(from, to);
      }

      // Execute query
      const { data: cards, error, count } = await supabaseQuery;

      if (error) {
        console.error('Local search error:', error);
        throw new Error(`Search failed: ${error.message}`);
      }

      // Debug: Check if we have any Trainer cards in the database
      if (supertype && supertype.includes('Trainer')) {
        console.log('🔍 Checking for Trainer cards in database...');
        const { data: trainerCheck, error: trainerError } = await supabase
          .from('pokemon_cards')
          .select('id, name, supertype')
          .eq('supertype', 'Trainer')
          .limit(5);
        
        if (!trainerError && trainerCheck) {
          console.log('🔍 Found Trainer cards in database:', trainerCheck);
        } else {
          console.log('🔍 No Trainer cards found in database or error:', trainerError);
        }
      }

      // Debug: Log first few card names to see sorting
      if (cards && cards.length > 0) {
        console.log('🔢 First 5 card names:', cards.slice(0, 5).map(card => card.name));
      }

      // Format response to match Scrydex API format
      const result = {
        data: cards || [],
        total: count || 0,
        page: page,
        pageSize: pageSize,
        totalPages: Math.ceil((count || 0) / pageSize)
      };

      console.log(`📊 Local search results: ${result.data.length} cards found (${result.total} total)`);
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
      console.log('🔍 Fetching local expansions...');

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

      console.log(`📊 Local expansions: ${expansions?.length || 0} found`);
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
      console.log('🔍 Fetching card by ID:', cardId);

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
      console.log('🔍 Searching sealed products for:', query)
      
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
          console.log('⚠️ Sealed products don\'t have a number column, sorting by name instead')
          supabaseQuery = supabaseQuery.order('name', { ascending: sortOrder === 'asc' })
        } else {
          // Try to order by the requested column, fallback to 'name' if it doesn't exist
          try {
            supabaseQuery = supabaseQuery.order(sortBy, { ascending: sortOrder === 'asc' })
          } catch (error) {
            console.log(`⚠️ Column '${sortBy}' doesn't exist in sealed_products, using 'name' instead`)
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

      console.log(`📦 Found ${sealedProducts?.length || 0} sealed products for query "${query}"`)

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
      console.log('🔍 Getting sealed products for expansion:', expansionId)
      
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
          console.log('⚠️ Sealed products don\'t have a number column, sorting by name instead')
          supabaseQuery = supabaseQuery.order('name', { ascending: sortOrder === 'asc' })
        } else {
          // Try to order by the requested column, fallback to 'name' if it doesn't exist
          try {
            supabaseQuery = supabaseQuery.order(sortBy, { ascending: sortOrder === 'asc' })
          } catch (error) {
            console.log(`⚠️ Column '${sortBy}' doesn't exist in sealed_products, using 'name' instead`)
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

      console.log(`📦 Found ${sealedProducts?.length || 0} sealed products for expansion ${expansionId}`)

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
      console.log('🔍 Fetching cards for expansion:', expansionId, 'pageSize:', pageSize);
      console.log('🔍 Expansion filter values:', { supertype, types, subtypes, rarity, artists, weaknesses, resistances });
      console.log('🔍 Expansion supertype filter details:', { supertype, length: supertype?.length, isArray: Array.isArray(supertype) });

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
        console.log('🔍 searchCards: Applying supertype filter:', supertype);
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
      console.log('🔢 Expansion sort parameters received:', { sortBy, sortOrder });
      if (sortBy && sortOrder) {
        if (sortBy === 'number') {
          // For numeric sorting, we'll handle it on the frontend since Supabase doesn't support CAST in ORDER BY with SELECT *
          console.log('🔢 Expansion number sorting will be handled on frontend');
          supabaseQuery = supabaseQuery.order('name', { ascending: true }); // Default alphabetical order
        } else if (sortBy === 'raw_market' || sortBy === 'graded_market') {
          // For price fields, cast to NUMERIC and handle nulls properly
          console.log('🔢 Expansion sorting by price field:', sortBy, 'order:', sortOrder === 'asc' ? 'ascending' : 'descending');
          supabaseQuery = supabaseQuery.order(`CAST(${sortBy} AS NUMERIC)`, { 
            ascending: sortOrder === 'asc',
            nullsFirst: false // Put null values at the end
          });
        } else {
          console.log('🔢 Expansion sorting by field:', sortBy, 'order:', sortOrder === 'asc' ? 'ascending' : 'descending');
          supabaseQuery = supabaseQuery.order(sortBy, { ascending: sortOrder === 'asc' });
        }
      } else {
        // Default sorting - alphabetical by name, frontend will handle numerical sorting
        console.log('🔢 Expansion default sorting by name (frontend will handle numerical sorting)');
        supabaseQuery = supabaseQuery.order('name', { ascending: true });
      }

      // For expansion views, always load ALL cards (no pagination)
      console.log('📦 Expansion view - loading ALL cards (no pagination)');
      // Don't apply pagination for expansion views - load entire set

      const { data: cards, error, count } = await supabaseQuery;

      if (error) {
        console.error('Get cards by expansion error:', error);
        throw new Error(`Failed to fetch expansion cards: ${error.message}`);
      }

      // Debug: Check if we have any Trainer cards in the database
      if (supertype && supertype.includes('Trainer')) {
        console.log('🔍 Expansion: Checking for Trainer cards in database...');
        const { data: trainerCheck, error: trainerError } = await supabase
          .from('pokemon_cards')
          .select('id, name, supertype')
          .eq('supertype', 'Trainer')
          .limit(5);
        
        if (!trainerError && trainerCheck) {
          console.log('🔍 Expansion: Found Trainer cards in database:', trainerCheck);
        } else {
          console.log('🔍 Expansion: No Trainer cards found in database or error:', trainerError);
        }
      }

      const result = {
        data: cards || [],
        total: count || 0,
        page: page,
        pageSize: pageSize,
        totalPages: Math.ceil((count || 0) / pageSize)
      };

      console.log(`📊 Expansion cards: ${result.data.length} found (${result.total} total)`);
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
      console.log('🔍 Fetching database statistics...');

      const [cardsResult, expansionsResult] = await Promise.all([
        supabase
          .from('pokemon_cards')
          .select('*', { count: 'exact', head: true }),
        supabase
          .from('pokemon_expansions')
          .select('*', { count: 'exact', head: true })
      ]);

      const stats = {
        totalCards: cardsResult.count || 0,
        totalExpansions: expansionsResult.count || 0,
        lastUpdated: new Date().toISOString()
      };

      console.log('📊 Database stats:', stats);
      return stats;

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
      console.log('🔍 Advanced local search with filters:', filters);

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

      const result = {
        data: cards || [],
        total: count || 0,
        page: page,
        pageSize: pageSize,
        totalPages: Math.ceil((count || 0) / pageSize)
      };

      console.log(`📊 Advanced search results: ${result.data.length} cards found (${result.total} total)`);
      return result;

    } catch (error) {
      console.error('Advanced search error:', error);
      throw error;
    }
  }
}

// Create and export singleton instance
const localSearchService = new LocalSearchService();
export default localSearchService;
