import { supabase } from '../lib/supabaseClient';

/**
 * Search Cache Service
 * Implements Scrydex caching best practices for optimal performance
 * 
 * Key Features:
 * - Different cache strategies for different data types
 * - Periodic cache refresh for dynamic data
 * - Local database integration for critical data
 * - Cache invalidation and cleanup
 * - Credit savings tracking
 */
class SearchCacheService {
  constructor() {
    // Cache policies based on Scrydex best practices
    this.cachePolicies = {
      // Card metadata - rarely changes, cache for days (Scrydex recommendation)
      'card': {
        ttl: 3 * 24 * 60 * 60 * 1000, // 3 days
        refreshInterval: 24 * 60 * 60 * 1000, // Refresh every 24 hours
        description: 'Card metadata and details - rarely changes'
      },
      
      // Expansion data - rarely changes, cache for weeks (Scrydex recommendation)
      'expansion': {
        ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
        refreshInterval: 3 * 24 * 60 * 60 * 1000, // Refresh every 3 days
        description: 'Expansion information - only changes with new expansions'
      },
      
      // Price data - changes daily, cache for 24 hours (Scrydex recommendation)
      'price': {
        ttl: 24 * 60 * 60 * 1000, // 24 hours
        refreshInterval: 20 * 60 * 60 * 1000, // Refresh every 20 hours
        description: 'Pricing data - changes at most once per day'
      },
      
      // Search results - cache for shorter periods to balance performance vs freshness
      'search': {
        ttl: 15 * 60 * 1000, // 15 minutes
        refreshInterval: 10 * 60 * 1000, // Refresh every 10 minutes
        description: 'Search results - balance performance vs freshness'
      },
      
      // Sealed products - cache for 24 hours (PriceCharting data)
      'sealed': {
        ttl: 24 * 60 * 60 * 1000, // 24 hours
        refreshInterval: 20 * 60 * 60 * 1000, // Refresh every 20 hours
        description: 'Sealed product data - changes daily'
      },
      
      // Generic API responses - 1 hour default
      'default': {
        ttl: 60 * 60 * 1000, // 1 hour
        refreshInterval: 45 * 60 * 1000, // Refresh every 45 minutes
        description: 'Generic API responses'
      }
    };
    
    // Cache statistics
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      apiCallsSaved: 0,
      creditSavings: 0,
      lastReset: Date.now()
    };
  }

  // Generate a unique cache key for a search
  generateCacheKey(query, game, searchType, expansionId = null, page = 1, pageSize = 100) {
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
      console.log('🔍 Checking cache for key:', cacheKey);
      
      const { data, error } = await supabase
        .from('search_cache')
        .select('*')
        .eq('cache_key', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - this is normal for cache miss
          console.log('📦 Cache miss for search:', cacheKey);
          this.stats.misses++; // Increment miss count
          return null;
        } else {
          console.error('❌ Error fetching cached results:', error);
          return null;
        }
      }

      if (data) {
        console.log('📦 Cache hit for search:', cacheKey);
        this.stats.hits++;
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
      console.error('❌ Error in getCachedResults:', error);
      return null;
    }
  }

  // Get cache policy for a specific search type
  getCachePolicy(searchType) {
    return this.cachePolicies[searchType] || this.cachePolicies['default'];
  }

  // Estimate credit cost for API calls (for tracking savings)
  estimateCreditCost(searchType, results) {
    const baseCosts = {
      'card': 1,
      'expansion': 1,
      'price': 1,
      'search': 2,
      'sealed': 1,
      'default': 1
    };
    
    const baseCost = baseCosts[searchType] || 1;
    const resultCount = results?.singles?.length || results?.sealed?.length || 0;
    
    // Estimate cost based on result count (more results = more API calls)
    return baseCost + Math.ceil(resultCount / 20);
  }

  // Get cache statistics
  getCacheStats() {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests * 100).toFixed(2) : 0;
    
    return {
      ...this.stats,
      totalRequests,
      hitRate: `${hitRate}%`,
      uptime: Date.now() - this.stats.lastReset
    };
  }

  // Clear cache statistics
  clearStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      apiCallsSaved: 0,
      creditSavings: 0,
      lastReset: Date.now()
    };
  }

  // Store search results in cache
  async setCachedResults(cacheKey, query, game, searchType, results, total, page = 1, pageSize = 100, expansionId = null) {
    try {
      console.log('💾 Attempting to cache search results:', { cacheKey, query, game, searchType, total });
      
      // Get cache policy for this search type
      const policy = this.getCachePolicy(searchType);
      const expiresAt = new Date(Date.now() + policy.ttl);
      
      // Update statistics
      this.stats.sets++;
      this.stats.apiCallsSaved++;
      this.stats.creditSavings += this.estimateCreditCost(searchType, results);

      // Store individual cards and products
      console.log('💾 Storing individual items...');
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

      console.log('💾 Inserting into search_cache table...');
      const { data, error } = await supabase
        .from('search_cache')
        .upsert(cacheData, { 
          onConflict: 'cache_key'
        });

      if (error) {
        console.error('❌ Error storing cached results:', error);
        console.error('❌ Cache data:', cacheData);
        return false;
      }

      console.log('✅ Cached search results successfully:', cacheKey);
      return true;
    } catch (error) {
      console.error('❌ Error in setCachedResults:', error);
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
      // Start with basic card data that should always exist
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

      // Add optional pricing fields only if they exist
      if (card.raw_pricing) {
        cardData.raw_condition = card.raw_pricing.condition;
        cardData.raw_is_perfect = card.raw_pricing.is_perfect;
        cardData.raw_is_signed = card.raw_pricing.is_signed;
        cardData.raw_is_error = card.raw_pricing.is_error;
        cardData.raw_low = card.raw_pricing.low;
        cardData.raw_market = card.raw_pricing.market;
        cardData.raw_currency = card.raw_pricing.currency || 'USD';
        cardData.raw_trends = card.raw_pricing.trends;
      }

      if (card.graded_pricing) {
        cardData.graded_grade = card.graded_pricing.grade;
        cardData.graded_company = card.graded_pricing.company;
        cardData.graded_is_perfect = card.graded_pricing.is_perfect;
        cardData.graded_is_signed = card.graded_pricing.is_signed;
        cardData.graded_is_error = card.graded_pricing.is_error;
        cardData.graded_low = card.graded_pricing.low;
        cardData.graded_mid = card.graded_pricing.mid;
        cardData.graded_high = card.graded_pricing.high;
        cardData.graded_market = card.graded_pricing.market;
        cardData.graded_currency = card.graded_pricing.currency || 'USD';
        cardData.graded_trends = card.graded_pricing.trends;
      }

      // Add PriceCharting pricing fields only if they exist
      if (card['bgs-10-price']) cardData.bgs_10_price = card['bgs-10-price'] / 100;
      if (card['condition-17-price']) cardData.condition_17_price = card['condition-17-price'] / 100;
      if (card['condition-18-price']) cardData.condition_18_price = card['condition-18-price'] / 100;
      if (card['box-only-price']) cardData.box_only_price = card['box-only-price'] / 100;
      if (card['cib-price']) cardData.cib_price = card['cib-price'] / 100;
      if (card['loose-price']) cardData.loose_price = card['loose-price'] / 100;
      if (card['new-price']) cardData.new_price = card['new-price'] / 100;
      if (card['retail-new-buy']) cardData.retail_new_buy = card['retail-new-buy'] / 100;
      if (card['retail-new-sell']) cardData.retail_new_sell = card['retail-new-sell'] / 100;
      if (card['retail-cib-buy']) cardData.retail_cib_buy = card['retail-cib-buy'] / 100;
      if (card['retail-cib-sell']) cardData.retail_cib_sell = card['retail-cib-sell'] / 100;
      if (card['retail-loose-buy']) cardData.retail_loose_buy = card['retail-loose-buy'] / 100;
      if (card['retail-loose-sell']) cardData.retail_loose_sell = card['retail-loose-sell'] / 100;
      if (card['gamestop-price']) cardData.gamestop_price = card['gamestop-price'] / 100;
      if (card['gamestop-trade-price']) cardData.gamestop_trade_price = card['gamestop-trade-price'] / 100;
      if (card.raw_pricing_data) cardData.raw_pricing_data = card.raw_pricing_data;

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
      // Handle different API data structures (PriceCharting vs Scrydex)
      const productName = product.name || product['product-name'] || product.product_name || 'Unknown Product';
      const setId = product.id || product.api_id || product['product-id'] || product.product_id;
      const consoleName = product['console-name'] || product.console_name || product.console || '';
      const imageUrl = product.image_url || product['image-url'] || product.image || '';
      
      // Start with basic product data that should always exist
      const productData = {
        api_id: setId || `${productName}_${consoleName}`,
        name: productName,
        set_name: consoleName,
        expansion_name: product.expansion_name || consoleName,
        expansion_id: product.expansion_id,
        product_type: product.product_type || product.genre || 'sealed_product',
        image_url: imageUrl,
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

      // Add PriceCharting pricing fields only if they exist
      if (product['bgs-10-price']) productData.bgs_10_price = product['bgs-10-price'] / 100;
      if (product['condition-17-price']) productData.condition_17_price = product['condition-17-price'] / 100;
      if (product['condition-18-price']) productData.condition_18_price = product['condition-18-price'] / 100;
      if (product['box-only-price']) productData.box_only_price = product['box-only-price'] / 100;
      if (product['cib-price']) productData.cib_price = product['cib-price'] / 100;
      if (product['loose-price']) productData.loose_price = product['loose-price'] / 100;
      if (product['new-price']) productData.new_price = product['new-price'] / 100;
      if (product['retail-new-buy']) productData.retail_new_buy = product['retail-new-buy'] / 100;
      if (product['retail-new-sell']) productData.retail_new_sell = product['retail-new-sell'] / 100;
      if (product['retail-cib-buy']) productData.retail_cib_buy = product['retail-cib-buy'] / 100;
      if (product['retail-cib-sell']) productData.retail_cib_sell = product['retail-cib-sell'] / 100;
      if (product['retail-loose-buy']) productData.retail_loose_buy = product['retail-loose-buy'] / 100;
      if (product['retail-loose-sell']) productData.retail_loose_sell = product['retail-loose-sell'] / 100;
      if (product['gamestop-price']) productData.gamestop_price = product['gamestop-price'] / 100;
      if (product['gamestop-trade-price']) productData.gamestop_trade_price = product['gamestop-trade-price'] / 100;
      if (product.raw_pricing_data) productData.raw_pricing_data = product.raw_pricing_data;

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

  // Periodic cache refresh for dynamic data (following Scrydex best practices)
  async refreshExpiredCache() {
    try {
      // Get cache entries that are close to expiring (within refresh interval)
      const { data: nearExpiry, error } = await supabase
        .from('search_cache')
        .select('*')
        .lt('expires_at', new Date(Date.now() + 60 * 60 * 1000).toISOString()); // Within 1 hour

      if (error) {
        console.error('Error fetching near-expiry cache:', error);
        return false;
      }

      if (nearExpiry && nearExpiry.length > 0) {
        console.log(`🔄 Found ${nearExpiry.length} cache entries near expiry`);
        
        // Mark for refresh (in a real implementation, you'd trigger background refresh)
        for (const entry of nearExpiry) {
          const policy = this.getCachePolicy(entry.search_type);
          if (policy.refreshInterval) {
            console.log(`🔄 Marking for refresh: ${entry.cache_key} (${entry.search_type})`);
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Error in refreshExpiredCache:', error);
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

  // Force clear all cache
  async forceClearAllCache() {
    try {
      const { error } = await supabase
        .from('search_cache')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all entries

      if (error) {
        console.error('Error force clearing cache:', error);
        return false;
      }

      console.log('🗑️ Force cleared all search cache');
      return true;
    } catch (error) {
      console.error('Error in forceClearAllCache:', error);
      return false;
    }
  }
}

// Export singleton instance
export default new SearchCacheService();
