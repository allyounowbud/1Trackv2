/**
 * Hybrid Search Service
 * Combines Scrydex API for singles and PriceCharting API for sealed products
 * RapidAPI is used for image enhancement only
 * Automatically routes searches based on product type
 */

import scrydexApiService from './scrydexApiService'
import priceChartingApiService from './priceChartingApiService'
import rapidApiService from './rapidApiService'
import searchCacheService from './searchCacheService'

class HybridSearchService {
  constructor() {
    this.isInitialized = false
  }

  // Initialize all services
  async initialize() {
    try {
      // Initialize Scrydex service (no API key needed - uses backend)
      await scrydexApiService.initialize()
      
      // Initialize PriceCharting service (optional - may fail if no API key)
      const priceChartingInitialized = await priceChartingApiService.initialize()
      if (!priceChartingInitialized) {
        console.warn('⚠️ PriceCharting not available - sealed product pricing disabled')
      }
      
      // Initialize RapidAPI service for image enhancement (optional - may fail if no API key)
      const rapidApiInitialized = await rapidApiService.initialize()
      if (!rapidApiInitialized) {
      }
      
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
      const { page = 1, pageSize = 20, expansionId = null } = options
      
      // Check cache first
      const cacheKey = searchCacheService.generateCacheKey(query, game, 'general', expansionId, page, pageSize)
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


      // If it's clearly a sealed product query, only search PriceCharting
      if (isSealedQuery && !isSingleQuery) {
        if (priceChartingApiService.isInitialized) {
          const sealedResults = await priceChartingApiService.searchSealedProducts(query, game)
          
          // Format and sort sealed products by expansion
          let formattedProducts = []
          if (sealedResults && Array.isArray(sealedResults)) {
            formattedProducts = sealedResults.map(product => 
              priceChartingApiService.formatProductData(product)
            )
          }
          
          // If we have an expansion ID, filter and sort by expansion
          if (expansionId) {
            formattedProducts = await this.sortSealedProductsByExpansion(formattedProducts, expansionId)
          }
          
          // Apply pagination to sorted results
          const startIndex = (page - 1) * pageSize
          const endIndex = startIndex + pageSize
          const paginatedProducts = formattedProducts.slice(startIndex, endIndex)
          
          results.sealed = paginatedProducts
          results.total = formattedProducts.length
        } else {
          console.log('🔍 PriceCharting not available - no sealed products found')
          results.sealed = []
          results.total = 0
        }
      }
      // If it's clearly a single card query, only search Scrydex
      else if (isSingleQuery && !isSealedQuery) {
        const singleResults = await scrydexApiService.searchCards(query, { ...options, page, pageSize })
        results.singles = singleResults.data || []
        results.total = singleResults.total || 0
      }
      // If ambiguous or both types, search both APIs
      else {
        
        // Search singles via Scrydex
        try {
          const singleResults = await scrydexApiService.searchCards(query, { ...options, page, pageSize })
          results.singles = singleResults.data || []
        } catch (error) {
        }

        // Search sealed via PriceCharting (if available)
        if (priceChartingApiService.isInitialized) {
          try {
            const sealedResults = await priceChartingApiService.searchSealedProducts(query, game)
            let formattedProducts = []
            if (sealedResults && Array.isArray(sealedResults)) {
              formattedProducts = sealedResults.map(product => 
                priceChartingApiService.formatProductData(product)
              )
            }
            
            // If we have an expansion ID, filter and sort by expansion
            if (expansionId) {
              formattedProducts = await this.sortSealedProductsByExpansion(formattedProducts, expansionId)
            }
            
            results.sealed = formattedProducts
          } catch (error) {
          }
        } else {
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
      console.error('❌ Hybrid search failed:', error)
      throw error
    }
  }

  // Search only sealed products
  async searchSealedProducts(query, game = 'pokemon') {
    if (!this.isInitialized) {
      throw new Error('Search service not initialized')
    }

    if (!priceChartingApiService.isInitialized) {
      console.warn('⚠️ PriceCharting not available - cannot search sealed products')
      return {
        products: [],
        total: 0,
        source: 'pricecharting'
      }
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

  // Get sealed products for a specific expansion from Scrydex
  async getSealedProductsForExpansion(expansionId, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Hybrid Search Service not initialized')
    }

    try {
      const { page = 1, pageSize = 20 } = options
      
      // Check cache first
      const cacheKey = searchCacheService.generateCacheKey('', 'pokemon', 'expansion', expansionId, page, pageSize)
      const cachedResults = await searchCacheService.getCachedResults(cacheKey)
      
      if (cachedResults) {
        return {
          data: cachedResults.results.data || [],
          total: cachedResults.total,
          page: cachedResults.page,
          pageSize: cachedResults.pageSize,
          hasMore: cachedResults.results.hasMore || false,
          source: 'cache'
        }
      }

      console.log('🔍 Getting Scrydex sealed products for expansion:', expansionId)
      
      // Try to get sealed products from Scrydex first
      const scrydexSealed = await scrydexApiService.getSealedProductsByExpansion(expansionId, options)
      
      if (scrydexSealed && scrydexSealed.data && scrydexSealed.data.length > 0) {
        console.log(`📦 Found ${scrydexSealed.data.length} Scrydex sealed products for expansion ${expansionId}`)
        const result = {
          data: scrydexSealed.data,
          total: scrydexSealed.total,
          page: scrydexSealed.page,
          pageSize: scrydexSealed.pageSize,
          hasMore: scrydexSealed.hasMore,
          source: 'scrydex'
        }
        
        // Cache the result
        await searchCacheService.setCachedResults(
          cacheKey, 
          '', 
          'pokemon', 
          'expansion', 
          result, 
          result.total, 
          page, 
          pageSize, 
          expansionId
        )
        
        return result
      } else {
        console.log('📦 No Scrydex sealed products found, falling back to PriceCharting')
        
        // Fallback to PriceCharting if Scrydex has no sealed products
        if (priceChartingApiService.isInitialized) {
          const expansion = await scrydexApiService.getExpansion(expansionId)
          if (expansion) {
            // Try multiple search strategies for better results
            let priceChartingSealed = []
            
            // Strategy 1: Search with expansion name
            const query1 = `pokemon ${expansion.name}`
            console.log(`🔍 Trying PriceCharting query 1: ${query1}`)
            try {
              priceChartingSealed = await priceChartingApiService.searchSealedProducts(query1, 'pokemon')
            } catch (error) {
              console.log(`❌ PriceCharting query 1 failed:`, error.message)
              priceChartingSealed = []
            }
            
            // Strategy 2: If no results, try with expansion code
            if (!priceChartingSealed || priceChartingSealed.length === 0) {
              const query2 = `pokemon ${expansion.code}`
              console.log(`🔍 Trying PriceCharting query 2: ${query2}`)
              try {
                priceChartingSealed = await priceChartingApiService.searchSealedProducts(query2, 'pokemon')
              } catch (error) {
                console.log(`❌ PriceCharting query 2 failed:`, error.message)
                priceChartingSealed = []
              }
            }
            
            // Strategy 3: If still no results, try broader sealed product search
            if (!priceChartingSealed || priceChartingSealed.length === 0) {
              const query3 = `pokemon elite trainer box`
              console.log(`🔍 Trying PriceCharting query 3: ${query3}`)
              try {
                priceChartingSealed = await priceChartingApiService.searchSealedProducts(query3, 'pokemon')
              } catch (error) {
                console.log(`❌ PriceCharting query 3 failed:`, error.message)
                priceChartingSealed = []
              }
            }
            
            if (priceChartingSealed && priceChartingSealed.length > 0) {
              console.log(`📦 Found ${priceChartingSealed.length} PriceCharting sealed products for expansion ${expansionId}`)
              
              // Filter results to only include products that match the expansion
              const expansionName = expansion.name?.toLowerCase() || '';
              const expansionCode = expansion.code?.toLowerCase() || '';
              
              const filteredSealed = priceChartingSealed.filter(product => {
                // Use raw PriceCharting field names for filtering
                const productName = product['product-name']?.toLowerCase() || '';
                const productSetName = product['console-name']?.toLowerCase() || '';
                
                // Remove "Pokemon" prefix from set name for comparison (same logic as formatProductData)
                let cleanSetName = productSetName;
                if (cleanSetName.startsWith('pokemon ')) {
                  cleanSetName = cleanSetName.substring(8); // Remove "Pokemon " (8 characters)
                }
                
                // Check if the product name or set name contains the expansion name or code
                const matchesExpansion = productName.includes(expansionName) || 
                                       productName.includes(expansionCode) ||
                                       cleanSetName.includes(expansionName) ||
                                       cleanSetName.includes(expansionCode) ||
                                       productSetName.includes(expansionName) ||
                                       productSetName.includes(expansionCode);
                
                // Also exclude any single cards (products with # in name)
                const isNotSingleCard = !productName.includes('#');
                
                return matchesExpansion && isNotSingleCard;
              });
              
              console.log(`📦 Filtered sealed products for ${expansionName}: ${filteredSealed.length} of ${priceChartingSealed.length}`)
              
              return {
                data: filteredSealed,
                total: filteredSealed.length,
                page: 1,
                pageSize: filteredSealed.length,
                hasMore: false,
                source: 'pricecharting'
              }
            }
          }
        }
        
        const emptyResult = {
          data: [],
          total: 0,
          page: 1,
          pageSize: 20,
          hasMore: false,
          source: 'none'
        }
        
        // Cache empty result too
        await searchCacheService.setCachedResults(
          cacheKey, 
          '', 
          'pokemon', 
          'expansion', 
          emptyResult, 
          0, 
          page, 
          pageSize, 
          expansionId
        )
        
        return emptyResult
      }
    } catch (error) {
      console.error('❌ Error getting sealed products for expansion:', error)
      
      // Fallback to PriceCharting on error
      if (priceChartingApiService.isInitialized) {
        try {
          const expansion = await scrydexApiService.getExpansion(expansionId)
          if (expansion) {
            const query = `pokemon ${expansion.name}`
            const priceChartingSealed = await priceChartingApiService.searchSealedProducts(query, 'pokemon')
            
            if (priceChartingSealed && priceChartingSealed.length > 0) {
              console.log(`📦 Fallback: Found ${priceChartingSealed.length} PriceCharting sealed products for expansion ${expansionId}`)
              
              // Apply the same filtering logic as the main path
              const expansionName = expansion.name?.toLowerCase() || '';
              const expansionCode = expansion.code?.toLowerCase() || '';
              
              const filteredSealed = priceChartingSealed.filter(product => {
                // Use raw PriceCharting field names for filtering
                const productName = product['product-name']?.toLowerCase() || '';
                const productSetName = product['console-name']?.toLowerCase() || '';
                
                // Remove "Pokemon" prefix from set name for comparison (same logic as formatProductData)
                let cleanSetName = productSetName;
                if (cleanSetName.startsWith('pokemon ')) {
                  cleanSetName = cleanSetName.substring(8); // Remove "Pokemon " (8 characters)
                }
                
                // Check if the product name or set name contains the expansion name or code
                const matchesExpansion = productName.includes(expansionName) || 
                                       productName.includes(expansionCode) ||
                                       cleanSetName.includes(expansionName) ||
                                       cleanSetName.includes(expansionCode) ||
                                       productSetName.includes(expansionName) ||
                                       productSetName.includes(expansionCode);
                
                // Also exclude any single cards (products with # in name)
                const isNotSingleCard = !productName.includes('#');
                
                return matchesExpansion && isNotSingleCard;
              });
              
              console.log(`📦 Fallback: Filtered sealed products for ${expansionName}: ${filteredSealed.length} of ${priceChartingSealed.length}`)
              
              return {
                data: filteredSealed,
                total: filteredSealed.length,
                page: 1,
                pageSize: filteredSealed.length,
                hasMore: false,
                source: 'pricecharting-fallback'
              }
            }
          }
        } catch (fallbackError) {
          console.error('❌ Fallback to PriceCharting also failed:', fallbackError)
        }
      }
      
      return {
        data: [],
        total: 0,
        page: 1,
        pageSize: 20,
        hasMore: false,
        source: 'error'
      }
    }
  }

  // Sort sealed products by expansion using Scrydex expansion data
  async sortSealedProductsByExpansion(sealedProducts, expansionId) {
    try {
      // Get expansion details from Scrydex
      const expansion = await scrydexApiService.getExpansion(expansionId)
      if (!expansion) {
        console.warn('⚠️ Expansion not found:', expansionId)
        return sealedProducts
      }

      const expansionName = expansion.name.toLowerCase()
      const expansionCode = expansion.code?.toLowerCase() || ''
      
      console.log('🔍 Sorting sealed products for expansion:', expansionName, expansionCode)

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

      console.log(`🔍 Found ${matchingProducts.length} matching sealed products for ${expansionName}`)
      return matchingProducts
    } catch (error) {
      console.warn('⚠️ Error sorting sealed products by expansion:', error)
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
          const singleResults = await scrydexApiService.getExpansions(game)
          results.singles = singleResults.expansions || []
        } catch (error) {
          console.warn('⚠️ Singles game search failed:', error)
        }
      }

      if (includeSealed && priceChartingApiService.isInitialized) {
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
