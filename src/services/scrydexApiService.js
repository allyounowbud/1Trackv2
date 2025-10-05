/**
 * Secure Scrydex API Service
 * This service makes requests to our secure backend API endpoints
 * All sensitive API keys are kept server-side
 * Implements Scrydex caching best practices to reduce API credit usage
 */

import apiCacheService from './apiCacheService.js'

class ScrydexApiService {
  constructor() {
    // Use the full Supabase URL for the Edge Function
    this.baseUrl = 'https://hcpubmtohdnlmcjixbnl.supabase.co/functions/v1/scrydex-api'
    this.isInitialized = false
  }

  // Get authentication headers
  getAuthHeaders() {
    // Use the correct anon key provided by the user
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
      console.log('✅ Scrydex API Service initialized')
      return true
    } catch (error) {
      console.error('❌ Failed to initialize Scrydex API Service:', error)
      return false
    }
  }

  // Test connection to the API
  async testConnection() {
    try {
      const response = await fetch(`${this.baseUrl}/expansions?pageSize=1`, {
        headers: this.getAuthHeaders()
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`API test failed: ${response.status}`, errorText)
        throw new Error(`API test failed: ${response.status} - ${errorText}`)
      }
      
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text()
        console.error('API returned non-JSON response:', responseText.substring(0, 200))
        throw new Error('API returned HTML instead of JSON. Check Edge Function configuration.')
      }
      
      const data = await response.json()
      console.log('✅ API connection test successful:', data)
      return true
    } catch (error) {
      console.error('❌ Connection test failed:', error)
      throw new Error(`Connection test failed: ${error.message}`)
    }
  }

  // Search Pokemon cards
  async searchCards(query, options = {}) {
    let searchQuery = query || ''

    const params = new URLSearchParams({
      q: searchQuery,
      page: options.page || '1',
      pageSize: options.pageSize || '20',
    })

    // Add optional filters
    if (options.rarity) params.append('rarity', options.rarity)
    if (options.type) params.append('type', options.type)
    if (options.supertype) params.append('supertype', options.supertype)
    if (options.expansionId) params.append('expansionId', options.expansionId)
    
    // Add sorting parameters
    if (options.sortBy && options.sortBy !== 'Default') {
      params.append('sortBy', options.sortBy.toLowerCase().replace(' ', '_'))
      params.append('sortOrder', options.sortOrder || 'asc')
    }

    // Check cache first
    const cacheKey = apiCacheService.generateCacheKey('/search/cards', Object.fromEntries(params), 'search')
    const cachedData = apiCacheService.get(cacheKey)
    
    if (cachedData) {
      console.log('📦 Using cached search results for:', searchQuery)
      return cachedData
    }

    try {
      console.log('🔍 Fetching fresh search results for:', searchQuery)
      const response = await fetch(`${this.baseUrl}/search/cards?${params}`, {
        headers: this.getAuthHeaders()
      })
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const cards = data.data || []
      
      // Debug logging
      console.log('Raw API response:', data)
      console.log('Raw total_count:', data.total_count)
      console.log('Raw count:', data.count)
      
      // Format response
      const result = {
        data: cards,
        total: data.total_count || data.totalCount || data.total || 0,
        page: data.page || parseInt(options.page) || 1,
        pageSize: data.page_size || data.pageSize || parseInt(options.pageSize) || 20,
        totalPages: Math.ceil((data.total_count || data.totalCount || data.total || 0) / (data.page_size || data.pageSize || parseInt(options.pageSize) || 20))
      }
      
      // Cache the result
      apiCacheService.set(cacheKey, result, 'search')
      
      return result
    } catch (error) {
      console.error('Search cards error:', error)
      throw error
    }
  }

  // Get Pokemon expansions with caching
  async getExpansions(options = {}) {
    const params = new URLSearchParams({
      page: options.page || '1',
      pageSize: options.pageSize || '100',
      // Select only the fields we need to reduce payload size
      select: 'id,name,series,code,total,printed_total,language,language_code,release_date,logo,symbol,translation,is_online_only'
    })

    if (options.series) {
      params.append('series', options.series)
    }
    
    // Add language filter if specified
    if (options.language) {
      params.append('language', options.language)
    }
    
    // Test: Try to get Japanese expansions specifically
    if (options.testJapanese) {
      params.append('language_code', 'JA')
    }

    // Check cache first
    const cacheKey = apiCacheService.generateCacheKey('/expansions', Object.fromEntries(params), 'expansion')
    const cachedData = apiCacheService.get(cacheKey)
    
    if (cachedData) {
      console.log('📦 Using cached expansions data')
      return cachedData
    }

    try {
      console.log('🔍 Fetching fresh expansions data')
      console.log('🔍 API URL:', `${this.baseUrl}/expansions?${params}`)
      console.log('📋 API Params:', params.toString())
      
      const response = await fetch(`${this.baseUrl}/expansions?${params}`, {
        headers: this.getAuthHeaders()
      })
      
      if (!response.ok) {
        throw new Error(`Get expansions failed: ${response.status} ${response.statusText}`)
      }

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text()
        console.error('API returned HTML instead of JSON:', responseText.substring(0, 200))
        // Return empty array as fallback
        return []
      }

      const data = await response.json()
      let expansions = data.data || []
      
      console.log('📦 API Response:', expansions.length, 'expansions')
      console.log('🎯 Sample expansions:', expansions.slice(0, 3).map(exp => `${exp.name} (${exp.series})`))
      
      // Client-side filter to exclude online-only expansions
      expansions = expansions.filter(expansion => !expansion.is_online_only)
      
      console.log('🚫 Filtered out online-only:', data.data.length - expansions.length, 'expansions')
      console.log('✅ Final count:', expansions.length, 'physical expansions')
      
      // Cache the result
      apiCacheService.set(cacheKey, expansions, 'expansion')
      
      return expansions
    } catch (error) {
      console.error('Get expansions error:', error)
      // Return empty array as fallback instead of throwing
      return []
    }
  }

  // Get a specific card by ID with caching
  async getCard(cardId) {
    // Check cache first
    const cacheKey = apiCacheService.generateCacheKey(`/cards/${cardId}`, {}, 'card')
    const cachedData = apiCacheService.get(cacheKey)
    
    if (cachedData) {
      console.log('📦 Using cached card data for:', cardId)
      return cachedData
    }

    try {
      console.log('🔍 Fetching fresh card data for:', cardId)
      const response = await fetch(`${this.baseUrl}/cards/${cardId}`, {
        headers: this.getAuthHeaders()
      })
      
      if (!response.ok) {
        throw new Error(`Get card failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const result = data.data || data.card || data
      
      // Cache the result
      apiCacheService.set(cacheKey, result, 'card')
      
      return result
    } catch (error) {
      console.error('Get card error:', error)
      throw error
    }
  }

  // Get a specific expansion by ID with caching
  async getExpansion(expansionId) {
    // Check cache first
    const cacheKey = apiCacheService.generateCacheKey(`/expansions/${expansionId}`, {}, 'expansion')
    const cachedData = apiCacheService.get(cacheKey)
    
    if (cachedData) {
      console.log('📦 Using cached expansion data for:', expansionId)
      return cachedData
    }

    try {
      console.log('🔍 Fetching fresh expansion data for:', expansionId)
      const response = await fetch(`${this.baseUrl}/expansions/${expansionId}`, {
        headers: this.getAuthHeaders()
      })
      
      if (!response.ok) {
        throw new Error(`Get expansion failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const result = data.data || data.expansion || data
      
      // Cache the result
      apiCacheService.set(cacheKey, result, 'expansion')
      
      return result
    } catch (error) {
      console.error('Get expansion error:', error)
      throw error
    }
  }

  // Get pricing data for a card with caching
  async getCardPricing(cardId) {
    // Check cache first
    const cacheKey = apiCacheService.generateCacheKey(`/cards/${cardId}/pricing`, {}, 'price')
    const cachedData = apiCacheService.get(cacheKey)
    
    if (cachedData) {
      console.log('📦 Using cached pricing data for:', cardId)
      return cachedData
    }

    try {
      console.log('🔍 Fetching fresh pricing data for:', cardId)
      const response = await fetch(`${this.baseUrl}/cards/${cardId}/pricing`, {
        headers: this.getAuthHeaders()
      })
      
      if (!response.ok) {
        throw new Error(`Get pricing failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const result = data.data || data.pricing || data
      
      // Cache the result
      apiCacheService.set(cacheKey, result, 'price')
      
      return result
    } catch (error) {
      console.error('Get pricing error:', error)
      throw error
    }
  }

  // Search cards with pricing data
  async searchCardsWithPricing(query, options = {}) {
    try {
      // First get the cards
      const cardsResult = await this.searchCards(query, options)
      
      // Then get pricing for each card (this could be optimized with batch requests)
      const cardsWithPricing = await Promise.all(
        cardsResult.data.map(async (card) => {
          try {
            const pricing = await this.getCardPricing(card.id)
            return {
              ...card,
              pricing: pricing
            }
          } catch (error) {
            console.warn(`Failed to get pricing for card ${card.id}:`, error)
            return {
              ...card,
              pricing: null
            }
          }
        })
      )

      return {
        ...cardsResult,
        data: cardsWithPricing
      }
    } catch (error) {
      console.error('Search cards with pricing error:', error)
      throw error
    }
  }

  // Get cards by expansion
  async getCardsByExpansion(expansionId, options = {}) {
    return this.searchCards('', {
      ...options,
      expansionId: expansionId
    })
  }

  // Get cards by rarity
  async getCardsByRarity(rarity, options = {}) {
    return this.searchCards('', {
      ...options,
      rarity: rarity
    })
  }

  // Get cards by type
  async getCardsByType(type, options = {}) {
    return this.searchCards('', {
      ...options,
      type: type
    })
  }

  // Get cards by supertype
  async getCardsBySupertype(supertype, options = {}) {
    return this.searchCards('', {
      ...options,
      supertype: supertype
    })
  }

  // Get filter options (extract unique values from recent searches)
  async getFilterOptions() {
    try {
      // Get some cards to extract filter options
      const cardsResult = await this.searchCards('', { pageSize: 100 })
      const expansionsResult = await this.getExpansions({ pageSize: 100 })
      
      const cards = cardsResult.data || []
      const expansions = expansionsResult || []

      return {
        rarities: [...new Set(cards.map(card => card.rarity).filter(Boolean))].sort(),
        types: [...new Set(cards.flatMap(card => card.types || []))].sort(),
        supertypes: [...new Set(cards.map(card => card.supertype).filter(Boolean))].sort(),
        series: [...new Set(expansions.map(exp => exp.series).filter(Boolean))].sort()
      }
    } catch (error) {
      console.error('Get filter options error:', error)
      return {
        rarities: [],
        types: [],
        supertypes: [],
        series: []
      }
    }
  }

  // Check if the service has data (always true for API service)
  async hasData() {
    try {
      await this.testConnection()
      return true
    } catch (error) {
      return false
    }
  }

  // Search sealed products
  async searchSealedProducts(query, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Scrydex API Service not initialized')
    }

    try {
      const { page = 1, pageSize = 20 } = options
      const searchQuery = encodeURIComponent(query)
      
      console.log('🔍 Scrydex sealed search:', `${this.baseUrl}/sealed?q=${searchQuery}&page=${page}&pageSize=${pageSize}`)
      
      const response = await fetch(`${this.baseUrl}/sealed?q=${searchQuery}&page=${page}&pageSize=${pageSize}`, {
        headers: this.getAuthHeaders()
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Scrydex sealed search failed: ${response.status}`, errorText)
        throw new Error(`Scrydex sealed search failed: ${response.status}`)
      }

      const data = await response.json()
      console.log('📦 Scrydex sealed search response:', data)

      return {
        data: data.data || data.products || [],
        total: data.total || data.count || 0,
        page: data.page || page,
        pageSize: data.pageSize || pageSize,
        hasMore: data.hasMore || false
      }
    } catch (error) {
      console.error('❌ Scrydex sealed search error:', error)
      throw error
    }
  }

  // Get sealed products by expansion
  async getSealedProductsByExpansion(expansionId, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Scrydex API Service not initialized')
    }

    try {
      const { page = 1, pageSize = 20 } = options
      
      console.log('🔍 Scrydex expansion sealed:', `${this.baseUrl}/expansions/${expansionId}/sealed?page=${page}&pageSize=${pageSize}`)
      
      const response = await fetch(`${this.baseUrl}/expansions/${expansionId}/sealed?page=${page}&pageSize=${pageSize}`, {
        headers: this.getAuthHeaders()
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Scrydex expansion sealed failed: ${response.status}`, errorText)
        throw new Error(`Scrydex expansion sealed failed: ${response.status}`)
      }

      const data = await response.json()
      console.log('📦 Scrydex expansion sealed response:', data)

      return {
        data: data.data || data.products || [],
        total: data.total || data.count || 0,
        page: data.page || page,
        pageSize: data.pageSize || pageSize,
        hasMore: data.hasMore || false
      }
    } catch (error) {
      console.error('❌ Scrydex expansion sealed error:', error)
      throw error
    }
  }

  // Get service statistics
  async getStatistics() {
    try {
      const connectionOk = await this.hasData()
      
      return {
        serviceType: 'API',
        connectionStatus: connectionOk ? 'connected' : 'disconnected',
        lastChecked: new Date().toISOString(),
        totalCards: 'Unknown (API)',
        totalExpansions: 'Unknown (API)',
        syncInProgress: false,
        lastError: null
      }
    } catch (error) {
      return {
        serviceType: 'API',
        connectionStatus: 'error',
        lastChecked: new Date().toISOString(),
        totalCards: 'Unknown',
        totalExpansions: 'Unknown',
        syncInProgress: false,
        lastError: error.message
      }
    }
  }
}

// Export singleton instance
const scrydexApiService = new ScrydexApiService()
export default scrydexApiService