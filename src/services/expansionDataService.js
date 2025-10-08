/**
 * Expansion Data Service
 * 
 * Simplified data fetching following Scrydex caching best practices:
 * - Supabase tables ARE the cache (no additional caching layer needed)
 * - Card/expansion metadata cached for days (data rarely changes)
 * - Direct database queries for optimal performance
 * - No complex routing logic
 */

import { supabase } from '../lib/supabaseClient.js';

class ExpansionDataService {
  constructor() {
    this.isInitialized = false;
  }

  async initialize() {
    this.isInitialized = true;
  }

  /**
   * Get all expansions with optional filtering
   * Note: Expansion data is cached in Supabase (per Scrydex recommendations)
   */
  async getExpansions(options = {}) {
    const {
      languageCode = null,
      series = [],
      sortBy = 'release_date',
      sortOrder = 'desc'
    } = options;

    try {
      let query = supabase
        .from('pokemon_expansions')
        .select('*');

      // Apply language filter
      if (languageCode) {
        query = query.eq('language_code', languageCode);
      }

      // Apply series filter
      if (series && series.length > 0) {
        query = query.in('series', series);
      }

      // Filter out online-only expansions
      query = query.eq('is_online_only', false);

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching expansions:', error);
      throw error;
    }
  }

  /**
   * Get cards for a specific expansion with pagination
   * Note: Card data is cached in Supabase (per Scrydex recommendations)
   */
  async getExpansionCards(expansionId, options = {}) {
    const {
      page = 1,
      pageSize = 30,
      sortBy = 'number',
      sortOrder = 'asc',
      filters = {}
    } = options;

    try {
      let query = supabase
        .from('pokemon_cards')
        .select('*', { count: 'exact' })
        .eq('expansion_id', expansionId);

      // Apply filters
      if (filters.supertype?.length > 0) {
        query = query.in('supertype', filters.supertype);
      }

      if (filters.types?.length > 0) {
        query = query.overlaps('types', filters.types);
      }

      if (filters.subtypes?.length > 0) {
        query = query.overlaps('subtypes', filters.subtypes);
      }

      if (filters.rarity?.length > 0) {
        query = query.in('rarity', filters.rarity);
      }

      if (filters.artists?.length > 0) {
        query = query.in('artist', filters.artists);
      }

      if (filters.weaknesses?.length > 0) {
        query = query.overlaps('weaknesses', filters.weaknesses);
      }

      if (filters.resistances?.length > 0) {
        query = query.overlaps('resistances', filters.resistances);
      }

      // Don't apply sorting in the query - we'll sort client-side for proper numeric ordering
      // PostgREST doesn't support complex sorting functions
      if (sortBy === 'raw_market' || sortBy === 'graded_market') {
        query = query.order(sortBy, { 
          ascending: sortOrder === 'asc',
          nullsLast: true
        });
      } else if (sortBy === 'name') {
        query = query.order('name', { ascending: sortOrder === 'asc' });
      }
      // For 'number' sorting, we'll handle it client-side after fetching

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      // Client-side sorting for proper numeric card number ordering
      let sortedCards = data || [];
      if (sortBy === 'number' || !sortBy) {
        sortedCards = this._sortCardsByNumber(sortedCards, sortOrder === 'desc');
      }

      return {
        cards: sortedCards,
        total: count || 0,
        page,
        pageSize,
        hasMore: (page * pageSize) < (count || 0)
      };
    } catch (error) {
      console.error('Error fetching expansion cards:', error);
      throw error;
    }
  }

  /**
   * Sort cards by number using natural sorting (handles alphanumeric card numbers)
   * Sorts like Scrydex: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12...
   * Not like: 1, 10, 100, 11, 12, 2, 20...
   */
  _sortCardsByNumber(cards, descending = false) {
    return cards.sort((a, b) => {
      const aNum = a.number || '';
      const bNum = b.number || '';
      
      // Extract numeric part from card numbers (handles "SV030", "1a", "25b", etc.)
      const getNumericValue = (str) => {
        const numMatch = str.match(/\d+/);
        return numMatch ? parseInt(numMatch[0], 10) : 0;
      };
      
      const aValue = getNumericValue(aNum);
      const bValue = getNumericValue(bNum);
      
      // If numeric values are different, sort by those
      if (aValue !== bValue) {
        return descending ? bValue - aValue : aValue - bValue;
      }
      
      // If numeric values are the same (e.g., "1a" vs "1b"), sort alphabetically
      return descending ? bNum.localeCompare(aNum) : aNum.localeCompare(bNum);
    });
  }

  /**
   * Get sealed products for a specific expansion
   */
  async getExpansionSealedProducts(expansionId, options = {}) {
    const {
      page = 1,
      pageSize = 30,
      sortBy = 'name',
      sortOrder = 'asc'
    } = options;

    try {
      let query = supabase
        .from('sealed_products')
        .select('*', { count: 'exact' })
        .eq('expansion_id', expansionId);

      // Apply sorting
      if (sortBy === 'pricing_market') {
        query = query.order('pricing_market', { 
          ascending: sortOrder === 'asc',
          nullsLast: true
        });
      } else {
        query = query.order('name', { ascending: sortOrder === 'asc' });
      }

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        products: data || [],
        total: count || 0,
        page,
        pageSize,
        hasMore: (page * pageSize) < (count || 0)
      };
    } catch (error) {
      console.error('Error fetching sealed products:', error);
      throw error;
    }
  }

  /**
   * Get filter options for an expansion (for sidebar filters)
   */
  async getExpansionFilterOptions(expansionId) {
    try {
      const { data, error } = await supabase
        .from('pokemon_cards')
        .select('supertype, types, subtypes, rarity, artist, weaknesses, resistances')
        .eq('expansion_id', expansionId);

      if (error) throw error;

      // Aggregate unique values for each filter category
      const filters = {
        supertype: new Set(),
        types: new Set(),
        subtypes: new Set(),
        rarity: new Set(),
        artists: new Set(),
        weaknesses: new Set(),
        resistances: new Set()
      };

      data?.forEach(card => {
        if (card.supertype) filters.supertype.add(card.supertype);
        if (card.rarity) filters.rarity.add(card.rarity);
        if (card.artist) filters.artists.add(card.artist);
        
        card.types?.forEach(type => filters.types.add(type));
        card.subtypes?.forEach(subtype => filters.subtypes.add(subtype));
        card.weaknesses?.forEach(w => filters.weaknesses.add(w));
        card.resistances?.forEach(r => filters.resistances.add(r));
      });

      // Convert Sets to sorted Arrays
      return {
        supertype: Array.from(filters.supertype).sort(),
        types: Array.from(filters.types).sort(),
        subtypes: Array.from(filters.subtypes).sort(),
        rarity: Array.from(filters.rarity).sort(),
        artists: Array.from(filters.artists).sort(),
        weaknesses: Array.from(filters.weaknesses).sort(),
        resistances: Array.from(filters.resistances).sort()
      };
    } catch (error) {
      console.error('Error fetching filter options:', error);
      return {
        supertype: [],
        types: [],
        subtypes: [],
        rarity: [],
        artists: [],
        weaknesses: [],
        resistances: []
      };
    }
  }

  /**
   * Get expansion statistics
   */
  async getExpansionStats(expansionId) {
    try {
      const { data, error } = await supabase
        .from('pokemon_cards')
        .select('id', { count: 'exact' })
        .eq('expansion_id', expansionId);

      if (error) throw error;

      return {
        totalCards: data?.length || 0
      };
    } catch (error) {
      console.error('Error fetching expansion stats:', error);
      return { totalCards: 0 };
    }
  }
}

// Export singleton instance
const expansionDataService = new ExpansionDataService();
export default expansionDataService;

