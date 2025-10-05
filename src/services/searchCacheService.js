import { supabase } from '../lib/supabaseClient';

class SearchCacheService {
  constructor() {
    this.cacheExpiryHours = 24; // Cache expires after 24 hours
  }

  // Generate a unique cache key for a search
  generateCacheKey(query, game, searchType, expansionId = null, page = 1, pageSize = 20) {
    const keyParts = [
      query.toLowerCase().trim(),
      game,
      searchType,
      expansionId || '',
      page.toString(),
      pageSize.toString()
    ];
    return keyParts.join('|');
  }

  // Get cached search results
  async getCachedResults(cacheKey) {
    try {
      const { data, error } = await supabase
        .from('search_cache')
        .select('*')
        .eq('cache_key', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching cached results:', error);
        return null;
      }

      if (data) {
        console.log('📦 Cache hit for search:', cacheKey);
        return {
          results: data.results,
          total: data.total_results,
          page: data.page,
          pageSize: data.page_size,
          cached: true,
          cachedAt: data.created_at
        };
      }

      return null;
    } catch (error) {
      console.error('Error in getCachedResults:', error);
      return null;
    }
  }

  // Store search results in cache
  async setCachedResults(cacheKey, query, game, searchType, results, total, page = 1, pageSize = 20, expansionId = null) {
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + this.cacheExpiryHours);

      // Store individual cards and products
      await this.storeIndividualItems(results, game, query);

      const cacheData = {
        cache_key: cacheKey,
        query: query.toLowerCase().trim(),
        game,
        search_type: searchType,
        expansion_id: expansionId,
        page,
        page_size: pageSize,
        results: results,
        total_results: total,
        expires_at: expiresAt.toISOString()
      };

      const { error } = await supabase
        .from('search_cache')
        .upsert(cacheData, { 
          onConflict: 'cache_key'
        });

      if (error) {
        console.error('Error storing cached results:', error);
        return false;
      }

      console.log('💾 Cached search results:', cacheKey);
      return true;
    } catch (error) {
      console.error('Error in setCachedResults:', error);
      return false;
    }
  }

  // Store individual cards and products in their respective tables
  async storeIndividualItems(results, game, query) {
    try {
      const searchQuery = query.toLowerCase().trim();
      
      // Store cards (singles)
      if (results.singles && Array.isArray(results.singles)) {
        for (const card of results.singles) {
          await this.storeCard(card, game, searchQuery);
        }
      }
      
      // Store sealed products
      if (results.sealed && Array.isArray(results.sealed)) {
        for (const product of results.sealed) {
          await this.storeSealedProduct(product, game, searchQuery);
        }
      }
      
      // Handle direct results array (for expansion searches)
      if (results.data && Array.isArray(results.data)) {
        for (const item of results.data) {
          if (item.card_type || item.supertype) {
            // It's a card
            await this.storeCard(item, game, searchQuery);
          } else {
            // It's a sealed product
            await this.storeSealedProduct(item, game, searchQuery);
          }
        }
      }
    } catch (error) {
      console.error('Error storing individual items:', error);
    }
  }

  // Store a single card
  async storeCard(card, game, searchQuery) {
    try {
      const cardData = {
        api_id: card.id || card.api_id || `${card.name}_${card.expansion_name}`,
        name: card.name,
        set_name: card.set_name,
        expansion_name: card.expansion_name,
        expansion_id: card.expansion_id,
        card_number: card.number || card.card_number,
        rarity: card.rarity,
        card_type: card.card_type,
        supertype: card.supertype,
        types: card.types || [],
        subtypes: card.subtypes || [],
        hp: card.hp,
        abilities: card.abilities || null,
        attacks: card.attacks || null,
        weaknesses: card.weaknesses || null,
        resistances: card.resistances || null,
        retreat_cost: card.retreat_cost || [],
        converted_retreat_cost: card.converted_retreat_cost,
        artist: card.artist,
        flavor_text: card.flavor_text,
        regulation_mark: card.regulation_mark,
        language: card.language || 'en',
        language_code: card.language_code || 'en',
        national_pokedex_numbers: card.national_pokedex_numbers || [],
        image_url: card.image_url,
        image_url_large: card.image_url_large,
        image_source: card.image_source || 'api',
        market_price: card.market_price || card.raw_price || card.graded_price,
        low_price: card.low_price,
        mid_price: card.mid_price,
        high_price: card.high_price,
        raw_price: card.raw_price,
        graded_price: card.graded_price,
        source: card.source || 'scrydex',
        game: game,
        search_queries: [searchQuery],
        last_searched_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('cached_cards')
        .upsert(cardData, { 
          onConflict: 'api_id'
        });

      if (error) {
        console.error('Error storing card:', error);
      }
    } catch (error) {
      console.error('Error in storeCard:', error);
    }
  }

  // Store a sealed product
  async storeSealedProduct(product, game, searchQuery) {
    try {
      const productData = {
        api_id: product.id || product.api_id || `${product.name}_${product.set_name}`,
        name: product.name,
        set_name: product.set_name,
        expansion_name: product.expansion_name,
        expansion_id: product.expansion_id,
        product_type: product.product_type || 'sealed_product',
        image_url: product.image_url,
        image_url_large: product.image_url_large,
        image_source: product.image_source || 'api',
        market_price: product.market_price || product.price,
        low_price: product.low_price,
        mid_price: product.mid_price,
        high_price: product.high_price,
        source: product.source || 'pricecharting',
        game: game,
        search_queries: [searchQuery],
        last_searched_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('cached_sealed_products')
        .upsert(productData, { 
          onConflict: 'api_id'
        });

      if (error) {
        console.error('Error storing sealed product:', error);
      }
    } catch (error) {
      console.error('Error in storeSealedProduct:', error);
    }
  }

  // Clear expired cache entries
  async clearExpiredCache() {
    try {
      const { error } = await supabase
        .from('search_cache')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (error) {
        console.error('Error clearing expired cache:', error);
        return false;
      }

      console.log('🗑️ Cleared expired cache entries');
      return true;
    } catch (error) {
      console.error('Error in clearExpiredCache:', error);
      return false;
    }
  }

  // Clear all cache for a specific query/game combination
  async clearCacheForQuery(query, game) {
    try {
      const { error } = await supabase
        .from('search_cache')
        .delete()
        .eq('query', query.toLowerCase().trim())
        .eq('game', game);

      if (error) {
        console.error('Error clearing cache for query:', error);
        return false;
      }

      console.log('🗑️ Cleared cache for query:', query, game);
      return true;
    } catch (error) {
      console.error('Error in clearCacheForQuery:', error);
      return false;
    }
  }

  // Get cache statistics
  async getCacheStats() {
    try {
      const { data, error } = await supabase
        .from('search_cache')
        .select('id, created_at, expires_at')
        .gt('expires_at', new Date().toISOString());

      if (error) {
        console.error('Error getting cache stats:', error);
        return null;
      }

      return {
        totalEntries: data.length,
        oldestEntry: data.length > 0 ? Math.min(...data.map(d => new Date(d.created_at))) : null,
        newestEntry: data.length > 0 ? Math.max(...data.map(d => new Date(d.created_at))) : null
      };
    } catch (error) {
      console.error('Error in getCacheStats:', error);
      return null;
    }
  }
}

// Export singleton instance
export default new SearchCacheService();
