/**
 * Pokemon Game Service
 * Handles all Pokemon TCG-specific operations
 */

import BaseGameService from './baseGameService';
import { GAMES } from '../../config/gamesConfig';
import { supabase } from '../../lib/supabaseClient';
import tcgcsvService from '../tcgcsvService';
import expansionMappingService from '../expansionMappingService';

class PokemonGameService extends BaseGameService {
  constructor() {
    super(GAMES.POKEMON);
    this.tcgcsvService = tcgcsvService;
    this.expansionMappingService = expansionMappingService;
  }

  /**
   * Search Pokemon cards
   */
  async searchCards(query, options = {}) {
    const {
      page = 1,
      pageSize = 30,
      sortBy = 'name',
      sortOrder = 'asc',
      rarity = null,
      supertype = null,
      types = null,
      subtypes = null,
      artists = null,
      weaknesses = null,
      resistances = null
    } = options;

    const cacheKey = this.getCacheKey('search', query, JSON.stringify(options));
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const databases = this.getDatabases();
      
      // For numerical sorting, we need to fetch more data first, then sort and paginate
      if (sortBy === 'number') {
        // Fetch a larger set for search results (limit to 1000 to avoid performance issues)
        let dbQuery = supabase
          .from(databases.cards)
          .select('*', { count: 'exact' })
          .limit(1000);

        // Apply search
        if (query && query.trim()) {
          const searchTerm = query.trim();
          dbQuery = dbQuery.or(`name.ilike.%${searchTerm}%,number.ilike.%${searchTerm}%,artist.ilike.%${searchTerm}%,expansion_name.ilike.%${searchTerm}%`);
        }

        // Add optional filters
        if (rarity) dbQuery = dbQuery.eq('rarity', rarity);
        if (supertype) dbQuery = dbQuery.eq('supertype', supertype);
        if (types) dbQuery = dbQuery.cs('types', `{${types}}`);
        if (subtypes) dbQuery = dbQuery.cs('subtypes', `{${subtypes}}`);
        if (artists) dbQuery = dbQuery.eq('artist', artists);
        if (weaknesses) dbQuery = dbQuery.cs('weaknesses', `{${weaknesses}}`);
        if (resistances) dbQuery = dbQuery.cs('resistances', `{${resistances}}`);

        const { data: searchData, error, count } = await dbQuery;

        if (error) {
          console.error('❌ Pokemon search error:', error);
          return { data: [], total: 0, page, pageSize };
        }

        // Format and sort ALL search results numerically
        let allFormattedData = (searchData || []).map(card => this.formatCard(card));
        allFormattedData.sort((a, b) => {
          const numA = parseInt(a.number) || 0;
          const numB = parseInt(b.number) || 0;
          return sortOrder === 'asc' ? numA - numB : numB - numA;
        });

        // Apply pagination to the sorted data
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedData = allFormattedData.slice(startIndex, endIndex);

        const result = {
          data: paginatedData,
          total: Math.min(count || 0, 1000), // Cap at 1000 for performance
          page,
          pageSize,
          totalPages: Math.ceil(Math.min(count || 0, 1000) / pageSize),
          hasMore: (page * pageSize) < Math.min(count || 0, 1000)
        };

        this.setCache(cacheKey, result);
        return result;
      } else {
        // For non-number sorting, use regular database pagination
        let dbQuery = supabase
          .from(databases.cards)
          .select('*', { count: 'exact' });

        // Apply search
        if (query && query.trim()) {
          const searchTerm = query.trim();
          dbQuery = dbQuery.or(`name.ilike.%${searchTerm}%,number.ilike.%${searchTerm}%,artist.ilike.%${searchTerm}%,expansion_name.ilike.%${searchTerm}%`);
        }

        // Add optional filters
        if (rarity) dbQuery = dbQuery.eq('rarity', rarity);
        if (supertype) dbQuery = dbQuery.eq('supertype', supertype);
        if (types) dbQuery = dbQuery.cs('types', `{${types}}`);
        if (subtypes) dbQuery = dbQuery.cs('subtypes', `{${subtypes}}`);
        if (artists) dbQuery = dbQuery.eq('artist', artists);
        if (weaknesses) dbQuery = dbQuery.cs('weaknesses', `{${weaknesses}}`);
        if (resistances) dbQuery = dbQuery.cs('resistances', `{${resistances}}`);

        dbQuery = dbQuery.order(sortBy, { ascending: sortOrder === 'asc' });

        // Apply pagination
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        dbQuery = dbQuery.range(from, to);

        const { data, error, count } = await dbQuery;

        if (error) {
          console.error('❌ Pokemon search error:', error);
          return { data: [], total: 0, page, pageSize };
        }

        // Format results for UI
        const formattedData = (data || []).map(card => this.formatCard(card));

        const result = {
          data: formattedData,
          total: count || 0,
          page,
          pageSize,
          totalPages: Math.ceil((count || 0) / pageSize),
          hasMore: (page * pageSize) < (count || 0)
        };

        this.setCache(cacheKey, result);
        return result;
      }
    } catch (error) {
      console.error('❌ Pokemon search error:', error);
      return { data: [], total: 0, page, pageSize };
    }
  }

  /**
   * Get Pokemon card by ID
   */
  async getCardById(id) {
    const cacheKey = this.getCacheKey('card', id);
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const databases = this.getDatabases();
      const { data, error } = await supabase
        .from(databases.cards)
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      const formatted = this.formatCard(data);
      this.setCache(cacheKey, formatted);
      return formatted;
    } catch (error) {
      console.error(`❌ Error fetching Pokemon card ${id}:`, error);
      return null;
    }
  }

  /**
   * Get Pokemon expansions
   */
  async getExpansions(options = {}) {
    const { page = 1, pageSize = 100, sortBy = 'release_date', sortOrder = 'desc', languageFilter } = options;
    
    const cacheKey = this.getCacheKey('expansions', page, pageSize, languageFilter);
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const databases = this.getDatabases();
      
      // Build query with language filter
      let query = supabase
        .from(databases.expansions)
        .select('*')
        .eq('is_online_only', false); // Filter out online-only expansions

      // Apply language filter
      if (languageFilter === 'english') {
        query = query.eq('language_code', 'EN');
      } else if (languageFilter === 'japanese') {
        query = query.eq('language_code', 'JA');
      }

      // Get expansions with pagination
      const { data: expansions, error: expansionsError } = await query
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (expansionsError) throw expansionsError;

      // Get total count for pagination with same filters
      let countQuery = supabase
        .from(databases.expansions)
        .select('*', { count: 'exact', head: true })
        .eq('is_online_only', false);

      if (languageFilter === 'english') {
        countQuery = countQuery.eq('language_code', 'EN');
      } else if (languageFilter === 'japanese') {
        countQuery = countQuery.eq('language_code', 'JA');
      }

      const { count, error: countError } = await countQuery;

      if (countError) throw countError;

      // Get card counts for each expansion separately
      const expansionsWithCounts = await Promise.all(
        expansions.map(async (expansion) => {
          try {
            const { count: cardCount, error: cardCountError } = await supabase
              .from(databases.cards)
              .select('*', { count: 'exact', head: true })
              .eq('expansion_id', expansion.id);

            if (cardCountError) {
              console.warn(`Failed to get card count for expansion ${expansion.id}:`, cardCountError);
              return { ...expansion, total_cards: 0 };
            }

            return { ...expansion, total_cards: cardCount || 0 };
          } catch (error) {
            console.warn(`Error counting cards for expansion ${expansion.id}:`, error);
            return { ...expansion, total_cards: 0 };
          }
        })
      );

      const result = {
        data: expansionsWithCounts,
        total: count || 0,
        page,
        pageSize
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('❌ Pokemon expansions error:', error);
      return { data: [], total: 0, page, pageSize };
    }
  }

  /**
   * Get cards by expansion
   */
  async getCardsByExpansion(expansionId, options = {}) {
    const {
      page = 1,
      pageSize = 30,
      sortBy = 'number',
      sortOrder = 'asc',
      rarity = null,
      supertype = null
    } = options;

    const cacheKey = this.getCacheKey('expansion', expansionId, JSON.stringify(options));
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const databases = this.getDatabases();
      
      // For numerical sorting, we need to fetch all data first, then sort and paginate
      if (sortBy === 'number') {
        // Fetch ALL cards for the expansion first
        let query = supabase
          .from(databases.cards)
          .select('*', { count: 'exact' })
          .eq('expansion_id', expansionId);

        if (rarity) query = query.eq('rarity', rarity);
        if (supertype) query = query.eq('supertype', supertype);

        const { data: allData, error, count } = await query;

        if (error) {
          console.error(`❌ Error fetching cards for expansion ${expansionId}:`, error);
          return { data: [], total: 0, page, pageSize };
        }

        // Format and sort ALL data numerically
        let allFormattedData = (allData || []).map(card => this.formatCard(card));
        allFormattedData.sort((a, b) => {
          const numA = parseInt(a.number) || 0;
          const numB = parseInt(b.number) || 0;
          return sortOrder === 'asc' ? numA - numB : numB - numA;
        });

        // Apply pagination to the sorted data
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedData = allFormattedData.slice(startIndex, endIndex);

        const result = {
          data: paginatedData,
          total: count || 0,
          page,
          pageSize,
          totalPages: Math.ceil((count || 0) / pageSize),
          hasMore: (page * pageSize) < (count || 0)
        };

        this.setCache(cacheKey, result);
        return result;
      } else {
        // For non-number sorting, use regular database pagination
        let query = supabase
          .from(databases.cards)
          .select('*', { count: 'exact' })
          .eq('expansion_id', expansionId);

        if (rarity) query = query.eq('rarity', rarity);
        if (supertype) query = query.eq('supertype', supertype);

        query = query.order(sortBy, { ascending: sortOrder === 'asc' });

        // Apply pagination
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);

        const { data, error, count } = await query;

        if (error) {
          console.error(`❌ Error fetching cards for expansion ${expansionId}:`, error);
          return { data: [], total: 0, page, pageSize };
        }

        // Format results for UI
        const formattedData = (data || []).map(card => this.formatCard(card));

        const result = {
          data: formattedData,
          total: count || 0,
          page,
          pageSize,
          totalPages: Math.ceil((count || 0) / pageSize),
          hasMore: (page * pageSize) < (count || 0)
        };

        this.setCache(cacheKey, result);
        return result;
      }
    } catch (error) {
      console.error(`❌ Error fetching cards for expansion ${expansionId}:`, error);
      return { data: [], total: 0, page, pageSize };
    }
  }

  /**
   * Get Pokemon card pricing
   */
  async getPricing(cardId) {
    const cacheKey = this.getCacheKey('pricing', cardId);
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const card = await this.getCardById(cardId);
      
      if (!card) return null;

      const pricing = {
        raw: {
          market: card.raw_market,
          low: card.raw_low,
          trend: card.trend,
          trends: card.raw_pricing?.trends || {}
        },
        graded: {
          market: card.graded_market,
          trends: card.graded_pricing?.trends || {}
        },
        lastUpdated: card.updated_at
      };

      this.setCache(cacheKey, pricing);
      return pricing;
    } catch (error) {
      console.error(`❌ Error fetching pricing for ${cardId}:`, error);
      return null;
    }
  }

  /**
   * Get sealed products by expansion
   * Now uses local database populated from TCGCSV sync
   */
  async getSealedProductsByExpansion(expansionId, options = {}) {
    const {
      page = 1,
      pageSize = 30,
      sortBy = 'name',
      sortOrder = 'asc'
    } = options;

    const cacheKey = this.getCacheKey('sealed-expansion', expansionId, JSON.stringify(options));
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      console.log(`📦 Fetching sealed products for expansion ${expansionId} from database`);

      // Build query
      let query = supabase
        .from('pokemon_sealed_products')
        .select('*', { count: 'exact' })
        .eq('expansion_id', expansionId);

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error(`❌ Error fetching sealed products:`, error);
        throw error;
      }

      // Format results for UI
      const formattedData = (data || []).map(product => this.formatTcgcsvSealedProduct(product));

      const result = {
        data: formattedData,
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize)
      };

      this.setCache(cacheKey, result);
      console.log(`✅ Found ${result.total} sealed products for expansion ${expansionId}`);
      
      return result;

    } catch (error) {
      console.error(`❌ Error fetching sealed products for expansion ${expansionId}:`, error);
      return { data: [], total: 0, page, pageSize, totalPages: 0 };
    }
  }

  /**
   * Format TCGCSV sealed product from database for UI
   * @param {Object} product - Database product record
   * @returns {Object} Formatted product
   */
  formatTcgcsvSealedProduct(product) {
    const marketValue = product.market_price || 0;

    return {
      id: product.product_id,
      name: product.name,
      image_url: product.image_url,
      image: product.image_url,
      marketValue: marketValue,
      market_value: marketValue,
      market_value_cents: Math.round(marketValue * 100),
      rarity: 'Sealed',
      
      // Pricing data
      raw_market: marketValue,
      raw_price: marketValue,
      low_price: product.low_price,
      mid_price: product.mid_price,
      high_price: product.high_price,
      raw_pricing: marketValue ? {
        market: parseFloat(marketValue).toFixed(2),
        low: product.low_price ? parseFloat(product.low_price).toFixed(2) : null,
        mid: product.mid_price ? parseFloat(product.mid_price).toFixed(2) : null,
        high: product.high_price ? parseFloat(product.high_price).toFixed(2) : null,
        trends: {
          days_7: { percent_change: 0 },
          days_30: { percent_change: 0 },
          days_90: { percent_change: 0 },
          days_180: { percent_change: 0 }
        }
      } : null,
      
      // Product info
      product_type: product.product_type,
      sub_type_name: product.sub_type_name,
      clean_name: product.clean_name,
      url: product.url,
      upc: product.upc,
      card_text: product.card_text,
      
      // Expansion info
      expansion_id: product.expansion_id,
      expansion_name: product.expansion_name,
      set_name: product.expansion_name,
      episode_name: product.expansion_name,
      
      // Metadata
      source: 'tcgcsv',
      itemType: 'sealed',
      type: 'sealed',
      gameId: 'pokemon',
      
      // TCGCSV IDs
      productId: product.product_id,
      tcgcsvGroupId: product.tcgcsv_group_id,
      categoryId: product.category_id
    };
  }

  /**
   * Search sealed products
   * Now uses local database populated from TCGCSV sync
   */
  async searchSealedProducts(query, options = {}) {
    const { page = 1, pageSize = 30, sortBy = 'name', sortOrder = 'asc' } = options;

    const cacheKey = this.getCacheKey('sealed', query, JSON.stringify(options));
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      console.log(`🔍 Searching sealed products for: "${query}"`);

      // Build search query using PostgreSQL full-text search
      let dbQuery = supabase
        .from('pokemon_sealed_products')
        .select('*', { count: 'exact' });

      // Apply search across name and card_text
      if (query && query.trim()) {
        const searchTerm = query.trim();
        dbQuery = dbQuery.or(`name.ilike.%${searchTerm}%,clean_name.ilike.%${searchTerm}%,card_text.ilike.%${searchTerm}%`);
      }

      // Apply sorting
      dbQuery = dbQuery.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      dbQuery = dbQuery.range(from, to);

      const { data, error, count } = await dbQuery;

      if (error) {
        console.error(`❌ Error searching sealed products:`, error);
        throw error;
      }

      // Format results for UI
      const formattedData = (data || []).map(product => this.formatTcgcsvSealedProduct(product));

      const result = {
        data: formattedData,
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
        hasMore: (page * pageSize) < (count || 0)
      };

      this.setCache(cacheKey, result);
      console.log(`✅ Found ${result.total} sealed products matching "${query}"`);
      
      return result;

    } catch (error) {
      console.error('❌ Error searching sealed products:', error);
      return { data: [], total: 0, page, pageSize, totalPages: 0, hasMore: false };
    }
  }

  /**
   * Format Pokemon card for UI
   */
  formatCard(card) {
    if (!card) return null;

    return {
      id: card.id,
      name: card.name,
      number: card.number,
      artist: card.artist,
      rarity: card.rarity,
      trend: card.trend,
      supertype: card.supertype,
      types: card.types,
      subtypes: card.subtypes,
      expansion_name: card.expansion_name,
      expansion_id: card.expansion_id,
      set_name: card.expansion_name,
      image_url: card.image_medium || card.image_small,
      image: card.image_medium || card.image_small,
      
      // Pricing
      raw_market: card.raw_market,
      graded_market: card.graded_market,
      marketValue: card.raw_market || card.graded_market || 0,
      market_value_cents: card.raw_market 
        ? Math.round(card.raw_market * 100) 
        : (card.graded_market ? Math.round(card.graded_market * 100) : 0),
      
      raw_price: card.raw_market ? parseFloat(card.raw_market) : null,
      graded_price: card.graded_market ? parseFloat(card.graded_market) : null,
      
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
          days_7: { percent_change: card.graded_trend_7d_percent || 0 },
          days_30: { percent_change: card.graded_trend_30d_percent || 0 },
          days_90: { percent_change: card.graded_trend_90d_percent || 0 },
          days_180: { percent_change: card.graded_trend_180d_percent || 0 }
        }
      } : null,
      
      source: 'pokemon_cards',
      itemType: 'singles',
      type: 'card',
      gameId: 'pokemon'
    };
  }

  /**
   * Format sealed product for UI
   */
  formatSealedProduct(product) {
    if (!product) return null;

    const marketValue = product.pricing_market ? product.pricing_market * 1.08 : 0;
    
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
      raw_price: marketValue ? parseFloat(marketValue) : null,
      
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
      type: 'sealed',
      gameId: 'pokemon'
    };
  }

  /**
   * Get available rarities for Pokemon
   */
  async getAvailableRarities() {
    try {
      const { data, error } = await supabase
        .from('pokemon_cards')
        .select('rarity')
        .not('rarity', 'is', null);

      if (error) throw error;

      const rarities = [...new Set(data.map(item => item.rarity))].filter(Boolean);
      return rarities.sort();
    } catch (error) {
      console.error('❌ Error fetching rarities:', error);
      return [];
    }
  }

  /**
   * Get available types for Pokemon
   */
  async getAvailableTypes() {
    const types = [
      'Colorless', 'Darkness', 'Dragon', 'Fairy', 'Fighting',
      'Fire', 'Grass', 'Lightning', 'Metal', 'Psychic', 'Water'
    ];
    return types;
  }
}

// Export singleton instance
const pokemonGameService = new PokemonGameService();
export default pokemonGameService;

