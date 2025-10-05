/**
 * RapidAPI Service for Image Enhancement
 * This service handles image enhancement for products that don't have images
 * Only used for image enhancement, not pricing or product data
 * All API calls go through our secure backend
 */

class RapidApiService {
  constructor() {
    // Use our secure backend endpoint instead of direct API calls
    this.baseUrl = 'https://hcpubmtohdnlmcjixbnl.supabase.co/functions/v1/rapidapi'
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
      console.log('✅ RapidAPI Service initialized')
      return true
    } catch (error) {
      console.warn('⚠️ RapidAPI Service not available:', error.message)
      // Don't throw error - allow app to continue without RapidAPI
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
        const errorText = await response.text()
        console.error(`RapidAPI test failed: ${response.status}`, errorText)
        throw new Error(`API test failed: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.status !== 'success') {
        throw new Error(data['error-message'] || 'API test failed')
      }
      
      console.log('✅ RapidAPI connection successful')
      return data
    } catch (error) {
      console.error('❌ RapidAPI connection failed:', error)
      throw error
    }
  }

  // Find best image for a product
  async findBestImage(productName, game = 'pokemon', setName = null) {
    if (!this.isInitialized) {
      console.warn('⚠️ RapidAPI not available for image enhancement')
      return null
    }

    try {
      // Search for images using TCGPlayer API
      const searchQuery = encodeURIComponent(`${productName} ${setName || ''}`)
      console.log('🖼️ RapidAPI image search:', `${this.baseUrl}?endpoint=search&q=${searchQuery}&game=${game}`)
      const response = await fetch(`${this.baseUrl}?endpoint=search&q=${searchQuery}&game=${game}`, {
        headers: this.getAuthHeaders()
      })
      
      if (!response.ok) {
        console.warn(`Image search failed: ${response.status}`)
        return null
      }
      
      const data = await response.json()
      
      if (data.status !== 'success' || !data.products?.length) {
        return null
      }
      
      // Find the best matching product with an image
      const productWithImage = data.products.find(product => 
        product.imageUrl && 
        product.name?.toLowerCase().includes(productName.toLowerCase())
      )
      
      if (productWithImage) {
        return {
          image_url: productWithImage.imageUrl,
          image_url_large: productWithImage.imageUrl,
          source: 'rapidapi'
        }
      }
      
      return null
    } catch (error) {
      console.warn('⚠️ Error finding image:', error)
      return null
    }
  }

  // Get product details by ID
  async getProductDetails(productId) {
    if (!this.isInitialized) {
      throw new Error('RapidAPI Service not initialized')
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

  // Get pricing data for a product
  async getProductPricing(productId) {
    if (!this.isInitialized) {
      throw new Error('RapidAPI Service not initialized')
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

  // Enhance product with better image if available
  async enhanceProductImage(product) {
    if (!this.isInitialized || !product) {
      return product
    }

    // Skip if product already has a good image
    if (product.image_url && product.image_url.includes('scrydex.com')) {
      return product
    }

    try {
      const enhancedImage = await this.findBestImage(
        product.name, 
        'pokemon', // Default to pokemon for now
        product.set_name || product.expansion_name
      )
      
      if (enhancedImage) {
        return {
          ...product,
          image_url: enhancedImage.image_url,
          image_url_large: enhancedImage.image_url_large,
          image_source: 'rapidapi'
        }
      }
      
      return product
    } catch (error) {
      console.warn('⚠️ Error enhancing product image:', error)
      return product
    }
  }

  // This service is now only for image enhancement
  // Product data formatting is handled by PriceCharting service
}

// Create and export a singleton instance
const rapidApiService = new RapidApiService()
export default rapidApiService
