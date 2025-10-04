/**
 * PriceCharting API Service
 * This service handles sealed product pricing and data from PriceCharting
 * Only used for sealed products, not singles
 * All API calls go through our secure backend
 */

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
      console.log('✅ PriceCharting API Service initialized')
      return true
    } catch (error) {
      console.error('❌ Failed to initialize PriceCharting API Service:', error)
      return false
    }
  }

  // Test connection to the API
  async testConnection() {
    try {
      const response = await fetch(`${this.baseUrl}?endpoint=products&q=pokemon+booster+box`, {
        headers: this.getAuthHeaders()
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`PriceCharting API test failed: ${response.status}`, errorText)
        throw new Error(`API test failed: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.status !== 'success') {
        throw new Error(data['error-message'] || 'API test failed')
      }
      
      console.log('✅ PriceCharting API connection successful')
      return data
    } catch (error) {
      console.error('❌ PriceCharting API connection failed:', error)
      throw error
    }
  }

  // Search for sealed products
  async searchSealedProducts(query, game = 'pokemon') {
    if (!this.isInitialized) {
      throw new Error('PriceCharting API Service not initialized')
    }

    try {
      // Search for sealed products specifically
      const searchQuery = encodeURIComponent(`${query} sealed booster box`)
      console.log('🔍 PriceCharting API call:', `${this.baseUrl}?endpoint=products&q=${searchQuery}`)
      const response = await fetch(`${this.baseUrl}?endpoint=products&q=${searchQuery}`, {
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
        product['product-name']?.toLowerCase().includes('tin')
      ) || []

      return {
        products: sealedProducts,
        total: sealedProducts.length
      }
    } catch (error) {
      console.error('❌ Error searching sealed products:', error)
      throw error
    }
  }

  // Get product details by ID
  async getProductDetails(productId) {
    if (!this.isInitialized) {
      throw new Error('PriceCharting API Service not initialized')
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
      
      return data
    } catch (error) {
      console.error('❌ Error getting product details:', error)
      throw error
    }
  }

  // Get pricing data for a product (same as product details for PriceCharting)
  async getProductPricing(productId) {
    if (!this.isInitialized) {
      throw new Error('PriceCharting API Service not initialized')
    }

    try {
      // PriceCharting includes pricing in product details
      const productDetails = await this.getProductDetails(productId)
      return productDetails
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
      const response = await fetch(`${this.baseUrl}?endpoint=products&q=${encodedQuery}`, {
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
          product['product-name']?.toLowerCase().includes('tin')
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
    console.log('🔍 PriceCharting product data:', product);
    
    // Handle missing or undefined fields
    const productName = product['product-name'] || product.product_name || 'Unknown Product';
    const consoleName = product['console-name'] || product.console_name || 'Unknown Console';
    const newPrice = product['new-price'] || product.new_price || 0;
    const cibPrice = product['cib-price'] || product.cib_price || 0;
    const loosePrice = product['loose-price'] || product.loose_price || 0;
    const releaseDate = product['release-date'] || product.release_date || null;
    
    // Use the best available price (new > cib > loose)
    const marketValue = newPrice > 0 ? newPrice / 100 : (cibPrice > 0 ? cibPrice / 100 : (loosePrice > 0 ? loosePrice / 100 : 0));
    
    return {
      id: product.id || `pc_${Date.now()}_${Math.random()}`,
      name: productName,
      set_name: consoleName,
      item_type: 'Sealed Product', // Always sealed for PriceCharting
      image_url: null, // PriceCharting doesn't provide images in API - use placeholder
      market_value: marketValue,
      market_value_cents: Math.round(marketValue * 100),
      source: 'pricecharting',
      // Additional PriceCharting specific data
      pricecharting_id: product.id,
      release_date: releaseDate,
      console_name: consoleName,
      // Pricing data (all in cents)
      new_price: newPrice / 100,
      cib_price: cibPrice / 100,
      loose_price: loosePrice / 100,
      // Use best available price as market value
      market_price: marketValue,
      // Add rarity info for display
      rarity: 'Sealed Product',
      card_number: null,
      supertype: 'Sealed Product'
    }
  }
}

// Create and export a singleton instance
const priceChartingApiService = new PriceChartingApiService()
export default priceChartingApiService
