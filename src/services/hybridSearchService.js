/**
 * Hybrid Search Service
 * Uses local Supabase database for both singles and sealed products
 * Optimized for fast performance with no external API dependencies
 * Automatically routes searches based on product type
 */

import localSearchService from './localSearchService'
import searchCacheService from './searchCacheService'

class HybridSearchService {
  constructor() {
    this.isInitialized = false
  }

  // Initialize all services
  async initialize() {
    try {
      // Initialize local search service (fast, uses Supabase data)
      await localSearchService.initialize()
      
      // Skip external API services - we now use local database for everything
      this.isInitialized = true
      return true
    } catch (error) {
      return false
    }
  }

  // Determine if a search query is likely for sealed products
  isSealedProductQuery(query) {
    const sealedKeywords = [
      'booster box', 'booster pack', 'elite trainer box', 'collection box',
      'bundle', 'tin', 'display', 'box', 'pack', 'collection', 'premium',
      'starter deck', 'theme deck', 'deck box', 'premium collection',
      'special collection', 'limited edition', 'exclusive', 'promo box'
    ]
    
    const lowerQuery = query.toLowerCase()
    return sealedKeywords.some(keyword => lowerQuery.includes(keyword))
  }

  // Determine if a search query is likely for singles
  isSingleCardQuery(query) {
    const singleKeywords = [
      'ex', 'gx', 'v', 'vmax', 'vstar', 'break', 'mega', 'prism star',
      'tag team', 'rainbow', 'shiny', 'alternate art', 'character rare',
      'illustration rare', 'special illustration rare', 'ultra rare',
      'hyper rare', 'amazing rare', 'radiant', 'tera', 'prime', 'legend',
      'lv.x', 'delta', 'crystal', 'shining', 'gold star', 'cracked ice',
      'cosmos', 'holo', 'reverse', 'foil', 'first edition', 'shadowless',
      'secret rare', 'rare', 'uncommon', 'common'
    ]
    
    const lowerQuery = query.toLowerCase()
    return singleKeywords.some(keyword => lowerQuery.includes(keyword))
  }

  // Smart search that routes to appropriate API
  async smartSearch(query, game = 'pokemon', options = {}) {
    if (!this.isInitialized) {
      throw new Error('Hybrid Search Service not initialized')
    }

    try {
      const { 
        page = 1, 
        pageSize = 30, 
        expansionId = null, 
        sortBy = 'number', 
        sortOrder = 'asc', 
        supertype = null,
        types = null, 
        subtypes = null,
        rarity = null,
        artists = null,
        weaknesses = null,
        resistances = null
      } = options // Optimized pagination for fast loading
      
      // Use local search service for Pokémon cards, sealed products, and custom items
      let singlesResults = []
      let sealedResults = []
      let customResults = []
      let totalSingles = 0
      let totalSealed = 0
      let totalCustom = 0
      
      try {
        // Search Pokémon cards
        let localResults
        if (expansionId) {
          localResults = await localSearchService.getCardsByExpansion(expansionId, { 
            ...options, 
            sortBy, 
            sortOrder,
            supertype,
            types,
            subtypes,
            rarity,
            artists,
            weaknesses,
            resistances
          })
        } else {
          localResults = await localSearchService.searchCards(query, { 
            ...options, 
            sortBy, 
            sortOrder,
            supertype,
            types,
            subtypes,
            rarity,
            artists,
            weaknesses,
            resistances
          })
        }
        
        if (localResults && localResults.data) {
          singlesResults = localResults.data
          totalSingles = localResults.total || 0
          console.log('🔍 HybridSearchService singles results:', singlesResults.length, 'total:', totalSingles);
        } else {
          console.log('🔍 HybridSearchService no singles results');
        }
      } catch (localError) {
        // Silent fail
      }
      
      try {
        // Search sealed products if we have a query
        if (query && query.trim()) {
          const sealedSearchResults = await localSearchService.searchSealedProducts(query, {
            page,
            pageSize: Math.max(1, Math.floor(pageSize / 2)), // Split page size between singles and sealed
            sortBy: 'name',
            sortOrder: 'asc'
          })
          
          if (sealedSearchResults && sealedSearchResults.data) {
            sealedResults = sealedSearchResults.data
            totalSealed = sealedSearchResults.total || 0
          }
        }
      } catch (sealedError) {
        // Silent fail
      }
      
      try {
        // Search custom items if we have a query
        if (query && query.trim()) {
          const customSearchResults = await localSearchService.searchCustomItems(query, {
            page,
            pageSize: Math.max(1, Math.floor(pageSize / 3)), // Split page size between singles, sealed, and custom
            sortBy: 'name',
            sortOrder: 'asc'
          })
          
          if (customSearchResults && customSearchResults.data) {
            customResults = customSearchResults.data
            totalCustom = customSearchResults.total || 0
          }
        }
      } catch (customError) {
        // Silent fail
      }
      
      // Return combined results if we found anything
      if (singlesResults.length > 0 || sealedResults.length > 0 || customResults.length > 0) {
        const totalResults = totalSingles + totalSealed + totalCustom
        
        return {
          singles: singlesResults,
          sealed: sealedResults,
          custom: customResults,
          total: totalResults,
          page: page,
          pageSize: pageSize,
          source: 'local',
          cached: false
        }
      }
      
      // Check cache second
      const cacheKey = searchCacheService.generateCacheKey(query, game, 'general', expansionId, page, pageSize, {
        supertype,
        types,
        subtypes,
        rarity,
        artists,
        weaknesses,
        resistances,
        sortBy,
        sortOrder
      })
      const cachedResults = await searchCacheService.getCachedResults(cacheKey)
      
      if (cachedResults) {
        return {
          singles: cachedResults.results.singles || [],
          sealed: cachedResults.results.sealed || [],
          total: cachedResults.total,
          page: cachedResults.page,
          pageSize: cachedResults.pageSize,
          source: 'cache',
          cached: true
        }
      }

      const results = {
        singles: [],
        sealed: [],
        total: 0,
        source: 'hybrid'
      }

      // Determine search strategy based on query
      const isSealedQuery = this.isSealedProductQuery(query)
      const isSingleQuery = this.isSingleCardQuery(query)


      // If it's clearly a sealed product query, search local database
      if (isSealedQuery && !isSingleQuery) {
        try {
          const sealedResults = await localSearchService.searchSealedProducts(query, {
            page,
            pageSize,
            sortBy: 'name',
            sortOrder: 'asc'
          })
          
           if (sealedResults && sealedResults.data) {
            results.sealed = sealedResults.data
            results.total = sealedResults.total || 0
          } else {
            results.sealed = []
            results.total = 0
          }
        } catch (error) {
          results.sealed = []
          results.total = 0
        }
      }
      // If it's clearly a single card query, only search local database
      else if (isSingleQuery && !isSealedQuery) {
        const singleResults = await localSearchService.searchCards(query, { ...options, page, pageSize })
        results.singles = singleResults.data || []
        results.total = singleResults.total || 0
      }
      // If ambiguous or both types, search both APIs
      else {
        
        // Search singles via local database
        try {
          const singleResults = await localSearchService.searchCards(query, { ...options, page, pageSize })
          results.singles = singleResults.data || []
        } catch (error) {
        }

        // Search sealed via local database
        try {
          const sealedResults = await localSearchService.searchSealedProducts(query, {
            page,
            pageSize: Math.max(1, Math.floor(pageSize / 2)), // Split page size between singles and sealed
            sortBy: 'name',
            sortOrder: 'asc'
          })
          
          if (sealedResults && sealedResults.data) {
            results.sealed = sealedResults.data
          }
        } catch (error) {
          // Silent fail
        }

        // For combined results, we need to handle pagination differently
        // Since we get all results and then paginate
        const totalSingles = results.singles.length
        const totalSealed = results.sealed.length
        results.total = totalSingles + totalSealed
      }

      // Cache the results
      await searchCacheService.setCachedResults(
        cacheKey, 
        query, 
        game, 
        'general', 
        results, 
        results.total, 
        page, 
        pageSize, 
        expansionId
      )

      return results
    } catch (error) {
      throw error
    }
  }

  // Search only sealed products
  async searchSealedProducts(query, game = 'pokemon') {
    if (!this.isInitialized) {
      throw new Error('Search service not initialized')
    }

    try {
      const results = await localSearchService.searchSealedProducts(query, {
        page: 1,
        pageSize: 30,
        sortBy: 'name',
        sortOrder: 'asc'
      })
      
        return {
        products: results.data || [],
        total: results.total || 0,
        source: 'local'
      }
    } catch (error) {
      return {
        products: [],
        total: 0,
        source: 'error'
      }
    }
  }

  // Search only singles
  async searchSingles(query, game = 'pokemon', options = {}) {
    if (!this.isInitialized) {
      throw new Error('Local search service not available')
    }

    try {
      const results = await localSearchService.searchCards(query, options)
      return {
        cards: results.data || [],
        total: results.total || 0,
        source: 'local'
      }
    } catch (error) {
      throw error
    }
  }

  // Get product details (works for both singles and sealed)
  async getProductDetails(productId, source = 'local') {
    if (!this.isInitialized) {
      throw new Error('Search service not initialized')
    }

    try {
      // Only use local database now
        return await localSearchService.getCardById(productId)
    } catch (error) {
      throw error
    }
  }

  // Get pricing data
  async getProductPricing(productId, source = 'local') {
    if (!this.isInitialized) {
      throw new Error('Search service not initialized')
    }

    try {
      // Only use local database now
        const cardDetails = await localSearchService.getCardById(productId)
        return {
          market_price: cardDetails.raw_market || cardDetails.graded_market || 0,
          source: 'local'
      }
    } catch (error) {
      throw error
    }
  }

  // Get sealed products for a specific expansion from Scrydex
  async getSealedProductsForExpansion(expansionId, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Hybrid Search Service not initialized')
    }

    try {
      const { 
        page = 1, 
        pageSize = 30,
        supertype = null,
        types = null,
        subtypes = null,
        rarity = null,
        artists = null,
        weaknesses = null,
        resistances = null,
        sortBy = null,
        sortOrder = null
      } = options // Optimized pagination for fast loading
      
      // Get sealed products from database (fast and consistent)
      try {
        const sealedResults = await localSearchService.getSealedProductsByExpansion(expansionId, options)
        
        if (sealedResults && sealedResults.data && sealedResults.data.length > 0) {
          // Format the sealed products data to match expected structure
          const formattedSealedProducts = sealedResults.data.map(product => ({
            id: product.tcggo_id || product.id,
            name: product.name,
            type: 'sealed',
            image: product.image,
            pricing: {
              low: product.pricing_low,
              mid: product.pricing_mid,
              high: product.pricing_high,
              market: product.pricing_market,
              currency: product.pricing_currency || 'EUR',
              sources: product.pricing_sources || ['cardmarket']
            },
            pricingSource: product.pricing_source || 'cardmarket',
            source: product.source || 'cardmarket',
            episode: {
              id: product.episode_id,
              name: product.episode_name
            },
            tcggoUrl: product.tcggo_url,
            cardmarketUrl: product.cardmarket_url,
            rawData: product.raw_data
          }))
          
          return {
            data: formattedSealedProducts,
            total: sealedResults.total,
            page: sealedResults.page,
            pageSize: sealedResults.pageSize,
            hasMore: sealedResults.hasMore,
            source: 'database'
          }
        }
      } catch (error) {
        // Silent fail
      }
      
      // No database results - return empty result
      
      const emptyResult = {
        data: [],
        total: 0,
        page: 1,
        pageSize: 30,
        hasMore: false,
        source: 'none'
      }
      
      return emptyResult
    } catch (error) {
      
      return {
        data: [],
        total: 0,
        page: 1,
        pageSize: 30,
        hasMore: false,
        source: 'error'
      }
    }
  }

  // Sort sealed products by expansion using local expansion data
  async sortSealedProductsByExpansion(sealedProducts, expansionId) {
    try {
      // Get expansion details from local database
      const expansions = await localSearchService.getExpansions()
      const expansion = expansions.find(exp => exp.id === expansionId)
      if (!expansion) {
        return sealedProducts
      }

      const expansionName = expansion.name.toLowerCase()
      const expansionCode = expansion.code?.toLowerCase() || ''
      

      // Filter and sort sealed products that match this expansion
      const matchingProducts = sealedProducts.filter(product => {
        const productName = product.name?.toLowerCase() || ''
        const productSetName = product.set_name?.toLowerCase() || ''
        
        // Check if the product name or set name contains the expansion name or code
        return productName.includes(expansionName) || 
               productName.includes(expansionCode) ||
               productSetName.includes(expansionName) ||
               productSetName.includes(expansionCode)
      })

      return matchingProducts
    } catch (error) {
      return sealedProducts
    }
  }

  // Search by game category
  async searchByGame(game, includeSealed = true, includeSingles = true) {
    if (!this.isInitialized) {
      throw new Error('Search service not initialized')
    }

    try {
      const results = {
        singles: [],
        sealed: [],
        total: 0
      }

      if (includeSingles) {
        try {
          const singleResults = await localSearchService.getExpansions()
          results.singles = singleResults || []
        } catch (error) {
          // Silent fail
        }
      }

      if (includeSealed) {
        try {
          const sealedResults = await localSearchService.searchSealedProducts(game, {
            page: 1,
            pageSize: 30,
            sortBy: 'name',
            sortOrder: 'asc'
          })
          results.sealed = sealedResults.data || []
        } catch (error) {
          // Silent fail
        }
      }

      results.total = results.singles.length + results.sealed.length
      return results
    } catch (error) {
      throw error
    }
  }
}

// Create and export a singleton instance
const hybridSearchService = new HybridSearchService()
export default hybridSearchService
