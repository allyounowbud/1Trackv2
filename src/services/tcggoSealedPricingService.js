/**
 * TCGGo Sealed Product Pricing Service
 * Uses RapidAPI to get pricing from TCGPlayer and CardMarket
 * Focuses specifically on sealed products (booster boxes, packs, etc.)
 */

import rapidApiService from './rapidApiService.js'

class TcgGoSealedPricingService {
  constructor() {
    this.isInitialized = false
    this.pricingCache = new Map() // Cache to prevent duplicate requests
    this.cacheTimeout = 30 * 60 * 1000 // 30 minutes cache
  }

  // Initialize the service
  async initialize() {
    if (this.isInitialized) return true
    
    try {
      // Initialize RapidAPI service
      const rapidApiInitialized = await rapidApiService.initialize()
      if (!rapidApiInitialized) {
        this.isInitialized = false
        return false
      }
      
      this.isInitialized = true
      return true
    } catch (error) {
      this.isInitialized = false
      return false
    }
  }

  // Check if service is ready
  isReady() {
    return this.isInitialized && rapidApiService.isInitialized
  }

  // Search for sealed products
  async searchSealedProducts(query, game = 'pokemon', expansionName = null) {
    if (!this.isReady()) {
      throw new Error('TCGGo Sealed Pricing Service not initialized')
    }

    try {
      
      // Build search query with sealed product keywords
      const sealedKeywords = [
        'booster box', 'booster pack', 'elite trainer box', 'collection box',
        'bundle', 'tin', 'display', 'premium collection', 'mini tin'
      ]
      
      let searchQuery = query
      if (expansionName) {
        searchQuery = `${expansionName} ${query}`
      }
      
      // Add sealed product context to search
      if (!sealedKeywords.some(keyword => searchQuery.toLowerCase().includes(keyword))) {
        searchQuery += ' booster box pack'
      }

      // Use RapidAPI search endpoint
      const response = await fetch(`${rapidApiService.baseUrl}?endpoint=search&q=${encodeURIComponent(searchQuery)}&game=${game}`, {
        headers: rapidApiService.getAuthHeaders()
      })

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status} ${response.statusText}`)
      }

      const searchData = await response.json()
      
      if (searchData.status === 'error') {
        throw new Error(searchData['error-message'] || 'Search failed')
      }

      // Filter results for sealed products
      const sealedProducts = this.filterSealedProducts(searchData.results || [])
      
      
      // Get pricing for each product
      const productsWithPricing = await this.addPricingToProducts(sealedProducts)
      
      return productsWithPricing
    } catch (error) {
      console.error('❌ Error searching sealed products:', error)
      throw error
    }
  }

  // Filter search results to only include sealed products
  filterSealedProducts(products) {
    const sealedKeywords = [
      'booster box', 'booster pack', 'elite trainer box', 'collection box',
      'bundle', 'tin', 'display', 'premium collection', 'mini tin',
      'sealed', 'box', 'pack', 'display box', 'booster'
    ]

    return products.filter(product => {
      const productName = (product.name || '').toLowerCase()
      const productType = (product.productType || '').toLowerCase()
      
      // Check if it's a sealed product
      const isSealed = sealedKeywords.some(keyword => 
        productName.includes(keyword) || productType.includes(keyword)
      )
      
      // Exclude individual cards
      const isNotCard = !productName.includes('single') && 
                       !productName.includes('card') &&
                       !productType.includes('card')
      
      return isSealed && isNotCard
    })
  }

  // Add pricing information to products
  async addPricingToProducts(products) {
    const productsWithPricing = []
    
    for (const product of products) {
      try {
        const pricing = await this.getProductPricing(product.productId)
        
        productsWithPricing.push({
          ...product,
          pricing: pricing || null,
          pricingSource: 'tcggo'
        })
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        console.warn(`⚠️ Failed to get pricing for ${product.name}:`, error.message)
        
        // Add product without pricing
        productsWithPricing.push({
          ...product,
          pricing: null,
          pricingSource: 'tcggo'
        })
      }
    }
    
    return productsWithPricing
  }

  // Get pricing for a specific product
  async getProductPricing(productId) {
    if (!this.isReady()) {
      throw new Error('TCGGo Sealed Pricing Service not initialized')
    }

    // Check cache first
    const cacheKey = `pricing_${productId}`
    const cached = this.pricingCache.get(cacheKey)
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.data
    }

    try {
      
      const response = await fetch(`${rapidApiService.baseUrl}?endpoint=pricing&id=${productId}`, {
        headers: rapidApiService.getAuthHeaders()
      })

      if (!response.ok) {
        throw new Error(`Pricing request failed: ${response.status} ${response.statusText}`)
      }

      const pricingData = await response.json()
      
      if (pricingData.status === 'error') {
        throw new Error(pricingData['error-message'] || 'Pricing request failed')
      }

      // Format pricing data
      const formattedPricing = this.formatPricingData(pricingData)
      
      // Cache the result
      this.pricingCache.set(cacheKey, {
        data: formattedPricing,
        timestamp: Date.now()
      })
      
      return formattedPricing
    } catch (error) {
      console.error(`❌ Error getting pricing for product ${productId}:`, error)
      throw error
    }
  }

  // Format pricing data from RapidAPI response
  formatPricingData(pricingData) {
    if (!pricingData.results || !Array.isArray(pricingData.results)) {
      return null
    }

    const results = pricingData.results
    const pricing = {
      low: null,
      mid: null,
      high: null,
      market: null,
      directLow: null,
      tcgplayer: null,
      cardmarket: null,
      sources: []
    }

    // Extract pricing from results
    results.forEach(result => {
      if (result.subTypeName === 'Normal') {
        pricing.low = result.lowPrice || null
        pricing.mid = result.midPrice || null
        pricing.high = result.highPrice || null
        pricing.market = result.marketPrice || null
        pricing.directLow = result.directLowPrice || null
      }
    })

    // Add source information
    if (pricing.low || pricing.mid || pricing.high) {
      pricing.sources.push('tcgplayer')
    }

    return pricing
  }

  // Get sealed products for a specific expansion using CardMarket API
  async getSealedProductsForExpansion(expansionName, game = 'pokemon', expansionId = null) {
    if (!this.isReady()) {
      throw new Error('TCGGo Sealed Pricing Service not initialized')
    }

    try {
      
      // Try CardMarket API first if we have a known episode ID mapping
      const episodeId = this.getEpisodeId(expansionId)
      if (episodeId) {
        try {
          const cardmarketProducts = await this.getCardMarketExpansionProducts(episodeId)
          if (cardmarketProducts && cardmarketProducts.length > 0) {
            return cardmarketProducts
          }
        } catch (error) {
          console.warn('⚠️ CardMarket API failed, falling back to search:', error.message)
        }
      } else {
      }
      
      // Fallback to search-based approach
      
      // Common sealed product types to search for
      const sealedTypes = [
        'booster box',
        'elite trainer box',
        'collection box',
        'bundle',
        'booster pack'
      ]
      
      const allProducts = []
      
      for (const type of sealedTypes) {
        try {
          const query = `${expansionName} ${type}`
          const products = await this.searchSealedProducts(query, game)
          allProducts.push(...products)
        } catch (error) {
          console.warn(`⚠️ Failed to search for ${type}:`, error.message)
        }
      }
      
      // Remove duplicates based on product ID
      const uniqueProducts = allProducts.filter((product, index, self) => 
        index === self.findIndex(p => p.productId === product.productId)
      )
      
      
      return uniqueProducts
    } catch (error) {
      console.error('❌ Error getting sealed products for expansion:', error)
      throw error
    }
  }

  // Get sealed products from CardMarket API using episode ID
  async getCardMarketExpansionProducts(episodeId, sort = 'price_highest') {
    if (!this.isReady()) {
      throw new Error('TCGGo Sealed Pricing Service not initialized')
    }

    try {
      
      const response = await fetch(`${rapidApiService.baseUrl}?endpoint=expansion-products&episodeId=${episodeId}&sort=${sort}`, {
        headers: rapidApiService.getAuthHeaders()
      })

      if (!response.ok) {
        throw new Error(`CardMarket API request failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.status === 'error') {
        throw new Error(data['error-message'] || 'CardMarket API request failed')
      }

      // Filter for sealed products and format the data
      const sealedProducts = this.filterAndFormatCardMarketProducts(data.data || data.results || [])
      
      
      return sealedProducts
    } catch (error) {
      console.error('❌ Error getting CardMarket expansion products:', error)
      throw error
    }
  }

  // Filter and format CardMarket API results for sealed products
  filterAndFormatCardMarketProducts(products) {
    const sealedKeywords = [
      'booster box', 'booster pack', 'elite trainer box', 'collection box',
      'bundle', 'tin', 'display', 'premium collection', 'mini tin',
      'sealed', 'box', 'pack', 'display box', 'booster'
    ]

    return products
      .filter(product => {
        const productName = (product.name || product.productName || '').toLowerCase()
        const productType = (product.type || product.productType || '').toLowerCase()
        
        // Check if it's a sealed product
        const isSealed = sealedKeywords.some(keyword => 
          productName.includes(keyword) || productType.includes(keyword)
        )
        
        // Exclude individual cards
        const isNotCard = !productName.includes('single') && 
                         !productName.includes('card') &&
                         !productType.includes('card')
        
        return isSealed && isNotCard
      })
      .map(product => ({
        id: product.id,
        name: product.name,
        type: 'sealed', // All CardMarket results are sealed products
        image: product.image,
        pricing: {
          low: product.prices?.cardmarket?.lowest || null,
          mid: null, // CardMarket doesn't provide mid price
          high: null, // CardMarket doesn't provide high price
          market: product.prices?.cardmarket?.lowest || null, // Use lowest as market price
          currency: product.prices?.cardmarket?.currency || 'EUR',
          sources: ['cardmarket']
        },
        pricingSource: 'cardmarket',
        source: 'cardmarket',
        episode: product.episode, // Keep episode info for reference
        tcggoUrl: product.tcggo_url,
        cardmarketUrl: product.links?.cardmarket,
        rawData: product // Keep original data for reference
      }))
  }

  // Check if we have a known CardMarket episode ID for our expansion ID
  isKnownEpisodeId(expansionId) {
    // Known mappings from our expansion IDs to CardMarket episode IDs
    const episodeIdMappings = {
      'crz': 21,  // Crown Zenith
      'me1': 230, // Mega Evolution
      'blk': 223, // Black Bolt
      'mew': 16,  // 151
      // Add more mappings as needed
    }
    
    return episodeIdMappings[expansionId.toLowerCase()] !== undefined
  }

  // Get CardMarket episode ID for our expansion ID
  getEpisodeId(expansionId) {
    const episodeIdMappings = {
      'crz': 21,  // Crown Zenith
      'me1': 230, // Mega Evolution
      'blk': 223, // Black Bolt
      'mew': 16,  // 151
      // Add more mappings as needed
    }
    
    return episodeIdMappings[expansionId.toLowerCase()] || null
  }

  // Clear pricing cache
  clearCache() {
    this.pricingCache.clear()
  }

  // Get cache statistics
  getCacheStats() {
    return {
      size: this.pricingCache.size,
      maxAge: this.cacheTimeout
    }
  }
}

// Create and export a singleton instance
const tcggoSealedPricingService = new TcgGoSealedPricingService()
export default tcggoSealedPricingService
