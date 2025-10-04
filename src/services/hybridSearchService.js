/**
 * Hybrid Search Service
 * Combines Scrydex API for singles and PriceCharting API for sealed products
 * Automatically routes searches based on product type
 */

import scrydexApiService from './scrydexApiService'
import priceChartingApiService from './priceChartingApiService'

class HybridSearchService {
  constructor() {
    this.isInitialized = false
  }

  // Initialize both services
  async initialize() {
    try {
      // Initialize Scrydex service (no API key needed - uses backend)
      await scrydexApiService.initialize()
      
      // Initialize PriceCharting service (no API key needed - uses backend)
      await priceChartingApiService.initialize()
      
      this.isInitialized = true
      console.log('✅ Hybrid Search Service initialized')
      return true
    } catch (error) {
      console.error('❌ Failed to initialize Hybrid Search Service:', error)
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
      const { page = 1, pageSize = 20 } = options
      const results = {
        singles: [],
        sealed: [],
        total: 0,
        source: 'hybrid'
      }

      // Determine search strategy based on query
      const isSealedQuery = this.isSealedProductQuery(query)
      const isSingleQuery = this.isSingleCardQuery(query)

      console.log('🔍 Query analysis:', { query, isSealedQuery, isSingleQuery, page, pageSize })

      // If it's clearly a sealed product query, only search PriceCharting
      if (isSealedQuery && !isSingleQuery) {
        console.log('🔍 Searching sealed products via PriceCharting API')
        const sealedResults = await priceChartingApiService.searchSealedProducts(query, game)
        console.log('🔍 PriceCharting raw results:', sealedResults)
        
        // Apply pagination to PriceCharting results
        const startIndex = (page - 1) * pageSize
        const endIndex = startIndex + pageSize
        const paginatedProducts = sealedResults.products.slice(startIndex, endIndex)
        
        results.sealed = paginatedProducts.map(product => 
          priceChartingApiService.formatProductData(product)
        )
        results.total = sealedResults.total
      }
      // If it's clearly a single card query, only search Scrydex
      else if (isSingleQuery && !isSealedQuery) {
        console.log('🔍 Searching singles via Scrydex API')
        const singleResults = await scrydexApiService.searchCards(query, game, { ...options, page, pageSize })
        results.singles = singleResults.cards || []
        results.total = singleResults.total || 0
      }
      // If ambiguous or both types, search both APIs
      else {
        console.log('🔍 Searching both singles and sealed products')
        
        // Search singles via Scrydex
        try {
          const singleResults = await scrydexApiService.searchCards(query, game, { ...options, page, pageSize })
          results.singles = singleResults.cards || []
        } catch (error) {
          console.warn('⚠️ Scrydex search failed:', error)
        }

        // Search sealed via PriceCharting
        try {
          const sealedResults = await priceChartingApiService.searchSealedProducts(query, game)
          results.sealed = sealedResults.products.map(product => 
            priceChartingApiService.formatProductData(product)
          )
        } catch (error) {
          console.warn('⚠️ PriceCharting search failed:', error)
        }

        // For combined results, we need to handle pagination differently
        // Since we get all results and then paginate
        const totalSingles = results.singles.length
        const totalSealed = results.sealed.length
        results.total = totalSingles + totalSealed
      }

      return results
    } catch (error) {
      console.error('❌ Hybrid search failed:', error)
      throw error
    }
  }

  // Search only sealed products
  async searchSealedProducts(query, game = 'pokemon') {
    if (!this.isInitialized) {
      throw new Error('Search service not initialized')
    }

    try {
      const results = await priceChartingApiService.searchSealedProducts(query, game)
      return {
        products: results.products.map(product => 
          priceChartingApiService.formatProductData(product)
        ),
        total: results.total,
        source: 'pricecharting'
      }
    } catch (error) {
      console.error('❌ Sealed product search failed:', error)
      throw error
    }
  }

  // Search only singles
  async searchSingles(query, game = 'pokemon', options = {}) {
    if (!this.isInitialized) {
      throw new Error('Scrydex API not available')
    }

    try {
      const results = await scrydexApiService.searchCards(query, game, options)
      return {
        cards: results.cards || [],
        total: results.total || 0,
        source: 'scrydex'
      }
    } catch (error) {
      console.error('❌ Singles search failed:', error)
      throw error
    }
  }

  // Get product details (works for both singles and sealed)
  async getProductDetails(productId, source = 'scrydex') {
    if (!this.isInitialized) {
      throw new Error('Search service not initialized')
    }

    try {
      if (source === 'pricecharting') {
        return await priceChartingApiService.getProductDetails(productId)
      } else {
        return await scrydexApiService.getCardDetails(productId)
      }
    } catch (error) {
      console.error('❌ Product details failed:', error)
      throw error
    }
  }

  // Get pricing data
  async getProductPricing(productId, source = 'scrydex') {
    if (!this.isInitialized) {
      throw new Error('Search service not initialized')
    }

    try {
      if (source === 'pricecharting') {
        return await priceChartingApiService.getProductPricing(productId)
      } else {
        // Scrydex pricing is included in card details
        const cardDetails = await scrydexApiService.getCardDetails(productId)
        return {
          market_price: cardDetails.market_value || 0,
          source: 'scrydex'
        }
      }
    } catch (error) {
      console.error('❌ Product pricing failed:', error)
      throw error
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
          const singleResults = await scrydexApiService.getExpansions(game)
          results.singles = singleResults.expansions || []
        } catch (error) {
          console.warn('⚠️ Singles game search failed:', error)
        }
      }

      if (includeSealed) {
        try {
          const sealedResults = await priceChartingApiService.searchByGame(game, true)
          results.sealed = sealedResults.products.map(product => 
            priceChartingApiService.formatProductData(product)
          )
        } catch (error) {
          console.warn('⚠️ Sealed game search failed:', error)
        }
      }

      results.total = results.singles.length + results.sealed.length
      return results
    } catch (error) {
      console.error('❌ Game search failed:', error)
      throw error
    }
  }
}

// Create and export a singleton instance
const hybridSearchService = new HybridSearchService()
export default hybridSearchService
