/**
 * Hybrid Search Service
 * Combines Scrydex API for singles and TCGGo/PriceCharting API for sealed products
 * RapidAPI is used for image enhancement and TCGGo pricing
 * Automatically routes searches based on product type
 */

import localSearchService from './localSearchService'
import priceChartingApiService from './priceChartingApiService'
import rapidApiService from './rapidApiService'
import tcggoSealedPricingService from './tcggoSealedPricingService'
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
      
      // Initialize PriceCharting service (optional - may fail if no API key)
      const priceChartingInitialized = await priceChartingApiService.initialize()
      if (!priceChartingInitialized) {
        console.warn('⚠️ PriceCharting not available - sealed product pricing disabled')
      }
      
      // Initialize RapidAPI service for image enhancement (optional - may fail if no API key)
      const rapidApiInitialized = await rapidApiService.initialize()
      if (!rapidApiInitialized) {
        console.warn('⚠️ RapidAPI not available - image enhancement disabled')
      }
      
      // Initialize TCGGo Sealed Pricing service (optional - may fail if no API key)
      const tcggoSealedInitialized = await tcggoSealedPricingService.initialize()
      if (!tcggoSealedInitialized) {
        console.warn('⚠️ TCGGo Sealed Pricing not available - falling back to PriceCharting')
      }
      
      this.isInitialized = true
      console.log('✅ Hybrid Search Service initialized')
      return true
    } catch (error) {
      console.error('❌ Failed to initialize Hybrid Search Service:', error)
      // Still mark as initialized if local search service works
      if (localSearchService.isInitialized) {
        this.isInitialized = true
        console.log('✅ Hybrid Search Service initialized (limited functionality)')
        return true
      }
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
      console.log('🔍 HybridSearch smartSearch - pageSize:', pageSize, 'page:', page, 'sortBy:', sortBy, 'sortOrder:', sortOrder, 'filters:', { supertype, types, subtypes, rarity, artists, weaknesses, resistances });
      
      // Use local search service for both Pokémon cards and sealed products
      console.log('🎯 Using local database search for Pokémon cards and sealed products')
      
      let singlesResults = []
      let sealedResults = []
      let totalSingles = 0
      let totalSealed = 0
      
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
          console.log(`✅ Found ${singlesResults.length} Pokémon cards in local database`)
        }
      } catch (localError) {
        console.warn('⚠️ Local Pokémon cards search failed:', localError.message)
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
            console.log(`✅ Found ${sealedResults.length} sealed products in local database`)
          }
        }
      } catch (sealedError) {
        console.warn('⚠️ Local sealed products search failed:', sealedError.message)
      }
      
      // Return combined results if we found anything
      if (singlesResults.length > 0 || sealedResults.length > 0) {
        const totalResults = totalSingles + totalSealed
        console.log(`✅ Found ${singlesResults.length} singles + ${sealedResults.length} sealed = ${totalResults} total results`)
        
        return {
          singles: singlesResults,
          sealed: sealedResults,
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

    // Try TCGGo first (better pricing from TCGPlayer/CardMarket)
    if (tcggoSealedPricingService.isReady()) {
      try {
        console.log('🔍 Using TCGGo for sealed product search')
        const results = await tcggoSealedPricingService.searchSealedProducts(query, game)
        return {
          products: results.map(product => ({
            ...product,
            source: 'tcggo'
          })),
          total: results.length,
          source: 'tcggo'
        }
      } catch (error) {
        console.warn('⚠️ TCGGo sealed search failed, falling back to PriceCharting:', error.message)
      }
    }

    // Fallback to PriceCharting
    if (!priceChartingApiService.isInitialized) {
      console.warn('⚠️ Neither TCGGo nor PriceCharting available - cannot search sealed products')
      return {
        products: [],
        total: 0,
        source: 'none'
      }
    }

    try {
      console.log('🔍 Using PriceCharting for sealed product search')
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
      console.error('❌ Singles search failed:', error)
      throw error
    }
  }

  // Get product details (works for both singles and sealed)
  async getProductDetails(productId, source = 'local') {
    if (!this.isInitialized) {
      throw new Error('Search service not initialized')
    }

    try {
      if (source === 'pricecharting') {
        return await priceChartingApiService.getProductDetails(productId)
      } else {
        return await localSearchService.getCardById(productId)
      }
    } catch (error) {
      console.error('❌ Product details failed:', error)
      throw error
    }
  }

  // Get pricing data
  async getProductPricing(productId, source = 'local') {
    if (!this.isInitialized) {
      throw new Error('Search service not initialized')
    }

    try {
      if (source === 'pricecharting') {
        return await priceChartingApiService.getProductPricing(productId)
      } else {
        // Local pricing is included in card details
        const cardDetails = await localSearchService.getCardById(productId)
        return {
          market_price: cardDetails.raw_market || cardDetails.graded_market || 0,
          source: 'local'
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
      
      console.log('🔍 Getting sealed products for expansion:', expansionId)
      
      // Get sealed products from database (fast and consistent)
      console.log('📦 Getting sealed products from database')
      
      try {
        const sealedResults = await localSearchService.getSealedProductsByExpansion(expansionId, options)
        
        if (sealedResults && sealedResults.data && sealedResults.data.length > 0) {
          console.log(`📦 Found ${sealedResults.data.length} sealed products in database for expansion ${expansionId}`)
          
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
        } else {
          console.log('📦 No sealed products found in database for expansion:', expansionId)
        }
      } catch (error) {
        console.error('❌ Error getting sealed products from database:', error)
      }
      
      // Fallback to TCGGo API if no data in database
      console.log('📦 No database results, falling back to TCGGo API')
      
      // Try TCGGo first, then fallback to PriceCharting
      let sealedProducts = []
      let pricingSource = 'none'
      
      // Try TCGGo first (better pricing from TCGPlayer/CardMarket)
      console.log('🔍 Checking TCGGo service status:', tcggoSealedPricingService.isReady())
      if (tcggoSealedPricingService.isReady()) {
        try {
          console.log('🔍 Trying TCGGo for expansion sealed products')
          const expansions = await localSearchService.getExpansions()
          const expansion = expansions.find(exp => exp.id === expansionId)
          console.log('🔍 Found expansion:', expansion?.name, 'ID:', expansion?.id)
          if (expansion) {
            // Pass the expansion ID for CardMarket API (it will handle episode ID mapping internally)
            console.log('🚀 Calling TCGGo API for sealed products...')
            sealedProducts = await tcggoSealedPricingService.getSealedProductsForExpansion(expansion.name, 'pokemon', expansion.id)
            pricingSource = 'tcggo'
            console.log(`📦 TCGGo API returned ${sealedProducts.length} sealed products for ${expansion.name}`)
            console.log('📦 First few products:', sealedProducts.slice(0, 3).map(p => ({ name: p.name, pricing: p.pricing })))
          } else {
            console.warn('⚠️ Expansion not found for ID:', expansionId)
          }
        } catch (error) {
          console.warn('⚠️ TCGGo expansion search failed:', error.message)
          console.error('❌ Full error:', error)
        }
      } else {
        console.warn('⚠️ TCGGo service not ready')
      }
      
      // Fallback to PriceCharting if TCGGo didn't work or found no results
      if (sealedProducts.length === 0 && priceChartingApiService.isInitialized) {
        // Get expansion details from local database
        const expansions = await localSearchService.getExpansions()
        const expansion = expansions.find(exp => exp.id === expansionId)
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
            pricingSource = 'pricecharting'
            
            // Format PriceCharting results
            sealedProducts = priceChartingSealed.map(product => 
              priceChartingApiService.formatProductData(product)
            )
            
            // Filter results to only include products that match the expansion
            const expansionName = expansion.name?.toLowerCase() || '';
            const expansionCode = expansion.code?.toLowerCase() || '';
            
            sealedProducts = sealedProducts.filter(product => {
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
            
            console.log(`📦 Filtered sealed products for ${expansionName}: ${sealedProducts.length} of ${priceChartingSealed.length}`)
          }
        }
      }
      
      // Return results from either TCGGo or PriceCharting
      if (sealedProducts.length > 0) {
        const result = {
          data: sealedProducts,
          total: sealedProducts.length,
          page: 1,
          pageSize: sealedProducts.length,
          hasMore: false,
          source: pricingSource
        }
        
        // Cache the result
        await searchCacheService.setCachedResults(
          cacheKey, 
          '', 
          'pokemon', 
          'sealed', 
          result, 
          result.total, 
          1, 
          sealedProducts.length, 
          expansionId
        )
        
        return result
      }
      
      const emptyResult = {
        data: [],
        total: 0,
        page: 1,
        pageSize: 30,
        hasMore: false,
        source: 'none'
      }
      
      // Cache empty result too
      await searchCacheService.setCachedResults(
        cacheKey, 
        '', 
        'pokemon',
        'sealed', 
        emptyResult, 
        0, 
        page, 
        pageSize, 
        expansionId
      )
      
      return emptyResult
    } catch (error) {
      console.error('❌ Error getting sealed products for expansion:', error)
      
      // Fallback to PriceCharting on error
      if (priceChartingApiService.isInitialized) {
        try {
          // Get expansion details from local database
          const expansions = await localSearchService.getExpansions()
          const expansion = expansions.find(exp => exp.id === expansionId)
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
          const singleResults = await localSearchService.getExpansions()
          results.singles = singleResults || []
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
