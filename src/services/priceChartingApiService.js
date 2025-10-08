/**
 * PriceCharting API Service for Sealed Product Pricing
 * This service handles sealed product pricing via PriceCharting API
 * Only used for sealed products, not singles
 * All API calls go through our secure backend
 * Implements caching to reduce API credit usage
 */

import apiCacheService from './apiCacheService.js'

class PriceChartingApiService {
  constructor() {
    // Use our secure backend endpoint instead of direct API calls
    this.baseUrl = 'https://hcpubmtohdnlmcjixbnl.supabase.co/functions/v1/pricecharting-api'
    this.isInitialized = false
  }

  // Get authentication headers for Supabase
  getAuthHeaders() {
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjcHVibXRvaGRubG1jaml4Ym5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0ODIzOTYsImV4cCI6MjA3NDA1ODM5Nn0.Lh0ndJZe34B_2EoIBR0VDTG8GJ7dzB4M5OnIICz_PkA'
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${anonKey}`
    }
  }

  // Initialize the service
  async initialize() {
    if (this.isInitialized) return true
    
    try {
      // Test the connection
      await this.testConnection()
      this.isInitialized = true
      return true
    } catch (error) {
      // Service not available - this is expected in development
      this.isInitialized = false
      return false
    }
  }

  // Test connection to the API
  async testConnection() {
    try {
      const response = await fetch(`${this.baseUrl}?endpoint=test`, {
        headers: this.getAuthHeaders()
      })
      
      if (!response.ok) {
        throw new Error(`API function not deployed (${response.status})`)
      }
      
      const data = await response.json()
      
      if (data.status !== 'success') {
        throw new Error(data['error-message'] || 'API test failed')
      }
      
      return data
    } catch (error) {
      // Silently fail - this is expected if function isn't deployed
      throw error
    }
  }

  // Search for sealed products using PriceCharting API
  async searchSealedProducts(query, game = 'pokemon') {
    if (!this.isInitialized) {
      throw new Error('PriceCharting API Service not initialized')
    }

    // Check cache first
    const cacheKey = apiCacheService.generateCacheKey('/search', { q: query, game }, 'sealed')
    const cachedData = apiCacheService.get(cacheKey)
    
    if (cachedData) {
      return cachedData
    }

    try {
      // Search for sealed products specifically
      const searchQuery = encodeURIComponent(query)
      const response = await fetch(`${this.baseUrl}?endpoint=search&q=${searchQuery}&game=${game}`, {
        headers: this.getAuthHeaders()
      })
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.status !== 'success') {
        throw new Error(data['error-message'] || 'Search failed')
      }
      
      // Filter for sealed products only
      const sealedProducts = data.products?.filter(product => 
        product['product-name']?.toLowerCase().includes('booster') ||
        product['product-name']?.toLowerCase().includes('box') ||
        product['product-name']?.toLowerCase().includes('pack') ||
        product['product-name']?.toLowerCase().includes('collection') ||
        product['product-name']?.toLowerCase().includes('bundle') ||
        product['product-name']?.toLowerCase().includes('tin') ||
        product['product-name']?.toLowerCase().includes('elite trainer') ||
        product['product-name']?.toLowerCase().includes('etb')
      ) || []

      // Cache the result
      apiCacheService.set(cacheKey, sealedProducts, 'sealed')
      
      
      return sealedProducts
    } catch (error) {
      console.error('❌ Error searching sealed products:', error)
      throw error
    }
  }

  // Get product details by ID with caching
  async getProductDetails(productId) {
    if (!this.isInitialized) {
      throw new Error('PriceCharting API Service not initialized')
    }

    // Check cache first
    const cacheKey = apiCacheService.generateCacheKey('/product', { id: productId }, 'sealed')
    const cachedData = apiCacheService.get(cacheKey)
    
    if (cachedData) {
      return cachedData
    }

    try {
      const response = await fetch(`${this.baseUrl}?endpoint=product&id=${productId}`, {
        headers: this.getAuthHeaders()
      })
      
      if (!response.ok) {
        throw new Error(`Product details failed: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.status !== 'success') {
        throw new Error(data['error-message'] || 'Product details failed')
      }
      
      // Cache the result
      apiCacheService.set(cacheKey, data, 'sealed')
      
      return data
    } catch (error) {
      console.error('❌ Error getting product details:', error)
      throw error
    }
  }

  // Get pricing data for a product
  async getProductPricing(productId) {
    if (!this.isInitialized) {
      throw new Error('PriceCharting API Service not initialized')
    }

    try {
      const response = await fetch(`${this.baseUrl}?endpoint=pricing&id=${productId}`, {
        headers: this.getAuthHeaders()
      })
      
      if (!response.ok) {
        throw new Error(`Pricing failed: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.status !== 'success') {
        throw new Error(data['error-message'] || 'Pricing failed')
      }
      
      return data
    } catch (error) {
      console.error('❌ Error getting product pricing:', error)
      throw error
    }
  }

  // Search by game category
  async searchByGame(game, sealedOnly = true) {
    if (!this.isInitialized) {
      throw new Error('PriceCharting API Service not initialized')
    }

    try {
      let searchQuery = game
      if (sealedOnly) {
        searchQuery += ' sealed booster'
      }
      
      const encodedQuery = encodeURIComponent(searchQuery)
      const response = await fetch(`${this.baseUrl}?endpoint=search&q=${encodedQuery}&game=${game}`, {
        headers: this.getAuthHeaders()
      })
      
      if (!response.ok) {
        throw new Error(`Game search failed: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.status !== 'success') {
        throw new Error(data['error-message'] || 'Game search failed')
      }
      
      if (sealedOnly) {
        // Filter for sealed products only
        const sealedProducts = data.products?.filter(product => 
          product['product-name']?.toLowerCase().includes('booster') ||
          product['product-name']?.toLowerCase().includes('box') ||
          product['product-name']?.toLowerCase().includes('pack') ||
          product['product-name']?.toLowerCase().includes('collection') ||
          product['product-name']?.toLowerCase().includes('bundle') ||
          product['product-name']?.toLowerCase().includes('tin') ||
          product['product-name']?.toLowerCase().includes('elite trainer') ||
          product['product-name']?.toLowerCase().includes('etb')
        ) || []
        
        return {
          products: sealedProducts,
          total: sealedProducts.length
        }
      }
      
      return data
    } catch (error) {
      console.error('❌ Error searching by game:', error)
      throw error
    }
  }

  // Format product data for our app
  formatProductData(product) {
    
    // Handle missing or undefined fields - use correct PriceCharting field names
    const productName = product['product-name'] || product.name || product.product_name || 'Unknown Product';
    let setName = product['console-name'] || product.set_name || product.setName || 'Unknown Set';
    
    // Remove "Pokemon" prefix from set names since we're already in the Pokemon section
    if (setName.toLowerCase().startsWith('pokemon ')) {
      setName = setName.substring(8); // Remove "Pokemon " (8 characters)
    }
    // Convert from cents to dollars (PriceCharting returns prices in cents)
    const marketPrice = ((product['new-price'] || product['cib-price'] || product['loose-price'] || product.market_price || product.marketPrice || 0) / 100);
    const lowPrice = ((product['retail-new-buy'] || product['retail-cib-buy'] || product['retail-loose-buy'] || product.low_price || product.lowPrice || 0) / 100);
    const midPrice = ((product['new-price'] || product['cib-price'] || product['loose-price'] || product.mid_price || product.midPrice || 0) / 100);
    const highPrice = ((product['retail-new-sell'] || product['retail-cib-sell'] || product['retail-loose-sell'] || product.high_price || product.highPrice || 0) / 100);
    
    // Use the best available price (market > mid > low)
    const marketValue = marketPrice > 0 ? marketPrice : (midPrice > 0 ? midPrice : (lowPrice > 0 ? lowPrice : 0));
    
    return {
      id: product.id || product.product_id || `pricecharting_${Date.now()}_${Math.random()}`,
      name: productName,
      set_name: setName,
      item_type: 'Sealed', // Always sealed for PriceCharting
      image_url: product.image_url || product.imageUrl || null,
      market_value: marketValue,
      market_value_cents: Math.round(marketValue * 100),
      source: 'pricecharting',
      // Additional PriceCharting specific data
      pricecharting_id: product.id || product.product_id,
      // Pricing data
      market_price: marketPrice,
      low_price: lowPrice,
      mid_price: midPrice,
      high_price: highPrice,
      // Use best available price as market value
      market_price_best: marketValue,
      // Add rarity info for display
      rarity: 'Sealed',
      card_number: null,
      supertype: 'Sealed',
      // PriceCharting specific data
      pricecharting_url: product.pricecharting_url || product.url
    }
  }
}

// Create and export a singleton instance
const priceChartingApiService = new PriceChartingApiService()
export default priceChartingApiService
