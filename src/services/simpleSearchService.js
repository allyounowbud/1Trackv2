import { supabase } from '../lib/supabaseClient';
import tcgcsvService from './tcgcsvService.js';

class SimpleSearchService {
  constructor() {
    this.isInitialized = true; // No initialization needed for direct DB queries
  }

  async initialize() {
    this.isInitialized = true;
  }

  /**
   * Search all tables directly - no API calls, just database queries
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Combined search results
   */
  async searchAll(query, options = {}) {
    const {
      page = 1,
      pageSize = 30,
      sortBy = 'name',
      sortOrder = 'asc',
      useTcgcsvFallback = true
    } = options;

    try {
      
      // Search all three tables in parallel
      const [pokemonResults, sealedResults, customResults] = await Promise.all([
        this.searchPokemonCards(query, { page, pageSize, sortBy, sortOrder }),
        this.searchSealedProducts(query, { page, pageSize, sortBy, sortOrder }),
        this.searchCustomItems(query, { page, pageSize, sortBy, sortOrder })
      ]);

      // If database search yields no results and TCGCSV fallback is enabled, try TCGCSV
      const totalDbResults = pokemonResults.total + sealedResults.total + customResults.total;
      if (totalDbResults === 0 && useTcgcsvFallback && query && query.trim()) {
        console.log(`🎴 No database results found, trying TCGCSV for "${query}"`);
        const tcgcsvResults = await this.searchTcgcsv(query, { page, pageSize });
        
        if (tcgcsvResults.total > 0) {
          return tcgcsvResults;
        }
      }

      // Format Pokemon cards with proper image, pricing, rarity, and trend
      const formattedPokemonCards = pokemonResults.data.map(card => ({
        id: card.id,
        name: card.name,
        number: card.number,
        artist: card.artist,
        rarity: card.rarity,
        trend: card.trend,
        expansion_name: card.expansion_name,
        set_name: card.expansion_name,
        image_url: card.image_medium || card.image_small,
        image: card.image_medium || card.image_small,
        // Market values
        raw_market: card.raw_market,
        graded_market: card.graded_market,
        marketValue: card.raw_market || card.graded_market || 0,
        market_value_cents: card.raw_market ? Math.round(card.raw_market * 100) : (card.graded_market ? Math.round(card.graded_market * 100) : 0),
        // UI expects these field names for pricing display - send clean numeric values
        raw_price: card.raw_market ? parseFloat(card.raw_market) : null,
        graded_price: card.graded_market ? parseFloat(card.graded_market) : null,
        // Trend data for UI display
        raw_pricing: card.raw_market ? {
          market: parseFloat(card.raw_market).toFixed(2),
          trends: {
            days_7: { percent_change: card.raw_trend_7d_percent || card.trend || 0 },
            days_30: { percent_change: card.raw_trend_30d_percent || 0 },
            days_90: { percent_change: card.raw_trend_90d_percent || 0 },
            days_180: { percent_change: card.raw_trend_180d_percent || 0 }
          }
        } : null,
        graded_pricing: card.graded_market ? {
          market: parseFloat(card.graded_market).toFixed(2),
          trends: {
            days_7: { percent_change: card.graded_trend_7d_percent || card.trend || 0 },
            days_30: { percent_change: card.graded_trend_30d_percent || 0 },
            days_90: { percent_change: card.graded_trend_90d_percent || 0 },
            days_180: { percent_change: card.graded_trend_180d_percent || 0 }
          }
        } : null,
        source: 'pokemon_cards',
        itemType: 'singles',
        type: 'card'
      }));

      // Format sealed products with proper image, pricing, and rarity
      const formattedSealedProducts = sealedResults.data.map(product => {
        const marketValue = product.pricing_market ? product.pricing_market * 1.08 : 0; // EUR to USD conversion
        return {
          id: product.tcggo_id || product.id,
          name: product.name,
          image_url: product.image,
          image: product.image,
          rarity: 'Sealed',
          trend: product.trend || null,
          raw_market: marketValue,
          marketValue: marketValue,
          market_value_cents: Math.round(marketValue * 100),
          // UI expects these field names for pricing display - send clean numeric values
          raw_price: marketValue ? parseFloat(marketValue) : null,
          // Trend data for UI display
          raw_pricing: marketValue ? {
            market: parseFloat(marketValue).toFixed(2),
            trends: {
              days_7: { percent_change: product.trend || 0 },
              days_30: { percent_change: 0 },
              days_90: { percent_change: 0 },
              days_180: { percent_change: 0 }
            }
          } : null,
          expansion_name: product.episode_name || 'Unknown Set',
          set_name: product.episode_name || 'Unknown Set',
          source: 'sealed_products',
          itemType: 'sealed',
          type: 'sealed'
        };
      });

      // Format custom items with proper image, pricing, rarity, and trend
      const formattedCustomItems = customResults.data.map(item => {
        const marketValue = item.market_value_cents ? item.market_value_cents / 100 : 0;
        return {
          id: item.id,
          name: item.name,
          image_url: item.image_url,
          image: item.image_url,
          rarity: item.rarity || item.item_type || 'Custom',
          trend: item.trend || null,
          marketValue: marketValue,
          market_value_cents: item.market_value_cents || 0,
          // UI expects these field names for pricing display - send clean numeric values
          raw_price: marketValue ? parseFloat(marketValue) : null,
          // Trend data for UI display
          raw_pricing: marketValue ? {
            market: parseFloat(marketValue).toFixed(2),
            trends: {
              days_7: { percent_change: item.trend || 0 },
              days_30: { percent_change: 0 },
              days_90: { percent_change: 0 },
              days_180: { percent_change: 0 }
            }
          } : null,
          expansion_name: item.set_name || 'Custom',
          set_name: item.set_name || 'Custom',
          source: 'items',
          itemType: 'custom',
          type: 'custom'
        };
      });

      // Combine all results
      const allResults = [
        ...formattedPokemonCards,
        ...formattedSealedProducts,
        ...formattedCustomItems
      ];

      const totalResults = pokemonResults.total + sealedResults.total + customResults.total;


      return {
        data: allResults,
        total: totalResults,
        page,
        pageSize,
        totalPages: Math.ceil(totalResults / pageSize),
        hasMore: (page * pageSize) < totalResults,
        source: 'database'
      };

    } catch (error) {
      console.error('❌ SimpleSearchService error:', error);
      throw error;
    }
  }

  /**
   * Search Pokemon cards table
   */
  async searchPokemonCards(query, options = {}) {
    const { page, pageSize, sortBy, sortOrder } = options;
    
    let supabaseQuery = supabase
      .from('pokemon_cards')
      .select('*', { count: 'exact' });

    // Apply search filter
    if (query && query.trim()) {
      const searchTerm = query.trim();
      supabaseQuery = supabaseQuery.or(`name.ilike.%${searchTerm}%,number.ilike.%${searchTerm}%,artist.ilike.%${searchTerm}%`);
    }

    // Apply sorting
    if (sortBy && sortOrder) {
      supabaseQuery = supabaseQuery.order(sortBy, { ascending: sortOrder === 'asc' });
    } else {
      supabaseQuery = supabaseQuery.order('name', { ascending: true });
    }

    // Apply pagination - use a larger page size to get more results
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    supabaseQuery = supabaseQuery.range(from, to);

    const { data, error, count } = await supabaseQuery;

    if (error) {
      console.error('❌ Pokemon cards search error:', error);
      // Return empty results instead of throwing to prevent breaking the entire search
      return {
        data: [],
        total: 0,
        page,
        pageSize
      };
    }

    return {
      data: data || [],
      total: count || 0,
      page,
      pageSize
    };
  }

  /**
   * Search sealed products table
   */
  async searchSealedProducts(query, options = {}) {
    const { page, pageSize, sortBy, sortOrder } = options;
    
    try {
      console.log('🔍 SimpleSearchService: Searching sealed products with query:', query);
      
      let supabaseQuery = supabase
        .from('sealed_products')
        .select('*', { count: 'exact' });

    // Apply search filter
    if (query && query.trim()) {
      const searchTerm = query.trim();
      supabaseQuery = supabaseQuery.ilike('name', `%${searchTerm}%`);
    }

    // Apply sorting - sealed products don't have 'number' column, use 'name'
    if (sortBy && sortOrder) {
      if (sortBy === 'number') {
        supabaseQuery = supabaseQuery.order('name', { ascending: sortOrder === 'asc' });
      } else {
        supabaseQuery = supabaseQuery.order(sortBy, { ascending: sortOrder === 'asc' });
      }
    } else {
      supabaseQuery = supabaseQuery.order('name', { ascending: true });
    }

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    supabaseQuery = supabaseQuery.range(from, to);

    const { data, error, count } = await supabaseQuery;

      if (error) {
        console.error('❌ Sealed products search error:', error);
        console.error('❌ Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        // Return empty results instead of throwing to prevent breaking the entire search
        return {
          data: [],
          total: 0,
          page,
          pageSize
        };
      }

      console.log('✅ Sealed products search successful:', {
        found: data?.length || 0,
        total: count || 0,
        query
      });

      return {
        data: data || [],
        total: count || 0,
        page,
        pageSize
      };
    } catch (error) {
      console.error('❌ Unexpected error in searchSealedProducts:', error);
      return {
        data: [],
        total: 0,
        page,
        pageSize
      };
    }
  }

  /**
   * Search custom items table
   */
  async searchCustomItems(query, options = {}) {
    const { page, pageSize, sortBy, sortOrder } = options;
    
    let supabaseQuery = supabase
      .from('items')
      .select('*', { count: 'exact' })
      .eq('source', 'manual'); // Only manual items

    // Apply search filter
    if (query && query.trim()) {
      const searchTerm = query.trim();
      supabaseQuery = supabaseQuery.or(`name.ilike.%${searchTerm}%,set_name.ilike.%${searchTerm}%,item_type.ilike.%${searchTerm}%`);
    }

    // Apply sorting - custom items don't have 'number' column, use 'name'
    if (sortBy && sortOrder) {
      if (sortBy === 'number') {
        supabaseQuery = supabaseQuery.order('name', { ascending: sortOrder === 'asc' });
      } else {
        supabaseQuery = supabaseQuery.order(sortBy, { ascending: sortOrder === 'asc' });
      }
    } else {
      supabaseQuery = supabaseQuery.order('name', { ascending: true });
    }

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    supabaseQuery = supabaseQuery.range(from, to);

    const { data, error, count } = await supabaseQuery;

    if (error) {
      console.error('❌ Custom items search error:', error);
      // Return empty results instead of throwing to prevent breaking the entire search
      return {
        data: [],
        total: 0,
        page,
        pageSize
      };
    }

    return {
      data: data || [],
      total: count || 0,
      page,
      pageSize
    };
  }

  /**
   * Search TCGCSV as fallback when database has no results
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results from TCGCSV
   */
  async searchTcgcsv(query, options = {}) {
    const { page = 1, pageSize = 30 } = options;

    try {
      await tcgcsvService.initialize();
      const tcgcsvResults = await tcgcsvService.searchCards(query, { limit: pageSize });

      if (!tcgcsvResults || !tcgcsvResults.data) {
        return {
          data: [],
          total: 0,
          page,
          pageSize,
          totalPages: 0,
          hasMore: false,
          source: 'tcgcsv'
        };
      }

      return {
        data: tcgcsvResults.data,
        total: tcgcsvResults.total,
        page,
        pageSize,
        totalPages: Math.ceil(tcgcsvResults.total / pageSize),
        hasMore: tcgcsvResults.total > (page * pageSize),
        source: 'tcgcsv'
      };
    } catch (error) {
      console.error('❌ TCGCSV search error:', error);
      return {
        data: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
        hasMore: false,
        source: 'tcgcsv',
        error: error.message
      };
    }
  }
}

// Create and export a single instance
const simpleSearchService = new SimpleSearchService();
export default simpleSearchService;
