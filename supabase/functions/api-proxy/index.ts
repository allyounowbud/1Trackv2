/**
 * OneTrack API Proxy Service
 * Centralized backend service that handles all external API calls
 * Provides consistent data to frontend with caching and rate limiting
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ApiConfig {
  tcgGo: {
    baseUrl: string
    apiKey: string
  }
  priceCharting: {
    baseUrl: string
    apiKey: string
  }
}

interface CacheEntry {
  data: any
  timestamp: number
  expiresAt: number
}

class ApiProxyService {
  private supabase: any
  private cache: Map<string, CacheEntry> = new Map()
  private rateLimitMap: Map<string, number[]> = new Map()
  
  constructor() {
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
  }

  /**
   * Get API configuration from environment
   */
  private getApiConfig(): ApiConfig {
    return {
      tcgGo: {
        baseUrl: 'https://cardmarket-api-tcg.p.rapidapi.com',
        apiKey: Deno.env.get('RAPIDAPI_KEY') ?? ''
      },
      priceCharting: {
        baseUrl: 'https://www.pricecharting.com/api',
        apiKey: Deno.env.get('PRICECHARTING_API_KEY') ?? ''
      }
    }
  }

  /**
   * Rate limiting check
   */
  private checkRateLimit(identifier: string, maxRequests: number = 100, windowMs: number = 60000): boolean {
    const now = Date.now()
    const windowStart = now - windowMs
    
    if (!this.rateLimitMap.has(identifier)) {
      this.rateLimitMap.set(identifier, [])
    }
    
    const requests = this.rateLimitMap.get(identifier)!
    const recentRequests = requests.filter(time => time > windowStart)
    
    if (recentRequests.length >= maxRequests) {
      return false
    }
    
    recentRequests.push(now)
    this.rateLimitMap.set(identifier, recentRequests)
    return true
  }

  /**
   * Cache management
   */
  private getCacheKey(service: string, endpoint: string, params: any): string {
    return `${service}:${endpoint}:${JSON.stringify(params)}`
  }

  private getFromCache(key: string): any | null {
    const entry = this.cache.get(key)
    if (entry && Date.now() < entry.expiresAt) {
      return entry.data
    }
    this.cache.delete(key)
    return null
  }

  private setCache(key: string, data: any, ttlMs: number = 3600000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttlMs
    })
  }

  /**
   * Store data in Supabase for persistence
   */
  private async storeInDatabase(table: string, data: any): Promise<void> {
    try {
      const { error } = await this.supabase
        .from(table)
        .upsert(data, { onConflict: 'id' })
      
      if (error) {
        console.error(`Error storing in ${table}:`, error)
      }
    } catch (error) {
      console.error(`Database storage error for ${table}:`, error)
    }
  }

  /**
   * Get data from Supabase cache
   */
  private async getFromDatabase(table: string, filters: any = {}): Promise<any[]> {
    try {
      let query = this.supabase.from(table).select('*')
      
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value)
      })
      
      const { data, error } = await query
      
      if (error) {
        console.error(`Error fetching from ${table}:`, error)
        return []
      }
      
      return data || []
    } catch (error) {
      console.error(`Database fetch error for ${table}:`, error)
      return []
    }
  }

  /**
   * TCG Go API proxy
   */
  async proxyTcgGoRequest(endpoint: string, params: any = {}): Promise<any> {
    const config = this.getApiConfig()
    const cacheKey = this.getCacheKey('tcgGo', endpoint, params)
    
    // Check cache first
    const cached = this.getFromCache(cacheKey)
    if (cached) {
      console.log(`📦 Cache hit for TCG Go: ${endpoint}`)
      return cached
    }

    // Check rate limiting
    if (!this.checkRateLimit('tcgGo', 100, 60000)) {
      throw new Error('Rate limit exceeded for TCG Go API')
    }

    try {
      const url = new URL(`${config.tcgGo.baseUrl}${endpoint}`)
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, String(value))
      })

      const response = await fetch(url.toString(), {
        headers: {
          'X-RapidAPI-Key': config.tcgGo.apiKey,
          'X-RapidAPI-Host': 'cardmarket-api-tcg.p.rapidapi.com'
        }
      })

      if (!response.ok) {
        throw new Error(`TCG Go API error: ${response.status}`)
      }

      const data = await response.json()
      
      // Cache the result
      this.setCache(cacheKey, data, 3600000) // 1 hour cache
      
      // Store in database for persistence
      await this.storeInDatabase('api_cache', {
        id: cacheKey,
        service: 'tcgGo',
        endpoint,
        data,
        created_at: new Date().toISOString()
      })

      return data
    } catch (error) {
      console.error('TCG Go API error:', error)
      throw error
    }
  }

  /**
   * PriceCharting API proxy
   */
  async proxyPriceChartingRequest(endpoint: string, params: any = {}): Promise<any> {
    const config = this.getApiConfig()
    const cacheKey = this.getCacheKey('priceCharting', endpoint, params)
    
    // Check cache first
    const cached = this.getFromCache(cacheKey)
    if (cached) {
      console.log(`📦 Cache hit for PriceCharting: ${endpoint}`)
      return cached
    }

    // Check rate limiting
    if (!this.checkRateLimit('priceCharting', 50, 60000)) {
      throw new Error('Rate limit exceeded for PriceCharting API')
    }

    try {
      const url = new URL(`${config.priceCharting.baseUrl}${endpoint}`)
      url.searchParams.set('api_key', config.priceCharting.apiKey)
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, String(value))
      })

      const response = await fetch(url.toString())

      if (!response.ok) {
        throw new Error(`PriceCharting API error: ${response.status}`)
      }

      const data = await response.json()
      
      // Cache the result
      this.setCache(cacheKey, data, 7200000) // 2 hour cache
      
      // Store in database for persistence
      await this.storeInDatabase('api_cache', {
        id: cacheKey,
        service: 'priceCharting',
        endpoint,
        data,
        created_at: new Date().toISOString()
      })

      return data
    } catch (error) {
      console.error('PriceCharting API error:', error)
      throw error
    }
  }

  /**
   * Search cards endpoint
   */
  async searchCards(query: string, limit: number = 20): Promise<any> {
    try {
      // Try to get from database cache first
      const cachedResults = await this.getFromDatabase('cached_cards', { 
        search_term: query.toLowerCase() 
      })
      
      if (cachedResults.length > 0) {
        console.log(`📦 Database cache hit for cards: ${query}`)
        return {
          success: true,
          data: cachedResults.slice(0, limit),
          source: 'database_cache'
        }
      }

      // Fetch from TCG Go API
      const tcgGoData = await this.proxyTcgGoRequest('/pokemon/cards', {
        search: query,
        limit: limit,
        sort: 'price_lowest'
      })

      // Store in database
      if (tcgGoData && Array.isArray(tcgGoData)) {
        const cardsToStore = tcgGoData.map((card: any) => ({
          id: `tcg_${card.id || card.product_id}`,
          search_term: query.toLowerCase(),
          name: card.name,
          set: card.set,
          rarity: card.rarity,
          price: card.price,
          image_url: card.image_url,
          product_id: card.id || card.product_id,
          data: card,
          created_at: new Date().toISOString()
        }))

        await this.storeInDatabase('cached_cards', cardsToStore)
      }

      return {
        success: true,
        data: tcgGoData || [],
        source: 'tcgGo_api'
      }
    } catch (error) {
      console.error('Search cards error:', error)
      return {
        success: false,
        error: error.message,
        data: []
      }
    }
  }

  /**
   * Search products endpoint
   */
  async searchProducts(query: string, limit: number = 20): Promise<any> {
    try {
      // Try to get from database cache first
      const cachedResults = await this.getFromDatabase('cached_products', { 
        search_term: query.toLowerCase() 
      })
      
      if (cachedResults.length > 0) {
        console.log(`📦 Database cache hit for products: ${query}`)
        return {
          success: true,
          data: cachedResults.slice(0, limit),
          source: 'database_cache'
        }
      }

      // Fetch from TCG Go API
      const tcgGoData = await this.proxyTcgGoRequest('/pokemon/products', {
        search: query,
        limit: limit,
        sort: 'price_lowest'
      })

      // Store in database
      if (tcgGoData && Array.isArray(tcgGoData)) {
        const productsToStore = tcgGoData.map((product: any) => ({
          id: `tcg_${product.id || product.product_id}`,
          search_term: query.toLowerCase(),
          name: product.name,
          set: product.set,
          price: product.price,
          image_url: product.image_url,
          product_id: product.id || product.product_id,
          data: product,
          created_at: new Date().toISOString()
        }))

        await this.storeInDatabase('cached_products', productsToStore)
      }

      return {
        success: true,
        data: tcgGoData || [],
        source: 'tcgGo_api'
      }
    } catch (error) {
      console.error('Search products error:', error)
      return {
        success: false,
        error: error.message,
        data: []
      }
    }
  }

  /**
   * Get expansion data endpoint
   */
  async getExpansionData(expansionId: string): Promise<any> {
    try {
      // Try to get from database cache first
      const cachedResults = await this.getFromDatabase('cached_expansions', { 
        expansion_id: expansionId 
      })
      
      if (cachedResults.length > 0) {
        console.log(`📦 Database cache hit for expansion: ${expansionId}`)
        return {
          success: true,
          data: cachedResults[0],
          source: 'database_cache'
        }
      }

      // Fetch from TCG Go API
      const [cardsData, productsData] = await Promise.all([
        this.proxyTcgGoRequest('/pokemon/cards', {
          expansion: expansionId,
          limit: 1000
        }),
        this.proxyTcgGoRequest('/pokemon/products', {
          expansion: expansionId,
          limit: 500
        })
      ])

      const expansionData = {
        id: expansionId,
        cards: cardsData || [],
        products: productsData || [],
        totalCards: (cardsData || []).length,
        totalProducts: (productsData || []).length,
        lastUpdated: new Date().toISOString()
      }

      // Store in database
      await this.storeInDatabase('cached_expansions', [{
        id: expansionId,
        expansion_id: expansionId,
        data: expansionData,
        created_at: new Date().toISOString()
      }])

      return {
        success: true,
        data: expansionData,
        source: 'tcgGo_api'
      }
    } catch (error) {
      console.error('Get expansion data error:', error)
      return {
        success: false,
        error: error.message,
        data: null
      }
    }
  }

  /**
   * Get market data endpoint
   */
  async getMarketData(productName: string): Promise<any> {
    try {
      // Try to get from database cache first
      const cachedResults = await this.getFromDatabase('cached_market_data', { 
        product_name: productName.toLowerCase() 
      })
      
      if (cachedResults.length > 0) {
        console.log(`📦 Database cache hit for market data: ${productName}`)
        return {
          success: true,
          data: cachedResults[0],
          source: 'database_cache'
        }
      }

      // Fetch from PriceCharting API
      const priceChartingData = await this.proxyPriceChartingRequest('/search', {
        q: productName
      })

      // Store in database
      if (priceChartingData) {
        await this.storeInDatabase('cached_market_data', [{
          id: `pc_${productName.toLowerCase().replace(/\s+/g, '_')}`,
          product_name: productName.toLowerCase(),
          data: priceChartingData,
          created_at: new Date().toISOString()
        }])
      }

      return {
        success: true,
        data: priceChartingData,
        source: 'priceCharting_api'
      }
    } catch (error) {
      console.error('Get market data error:', error)
      return {
        success: false,
        error: error.message,
        data: null
      }
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const path = url.pathname
    const searchParams = Object.fromEntries(url.searchParams.entries())
    
    const apiService = new ApiProxyService()
    let result: any

    // Route requests to appropriate handlers
    switch (path) {
      case '/search/cards':
        result = await apiService.searchCards(searchParams.q, parseInt(searchParams.limit) || 20)
        break
      
      case '/search/products':
        result = await apiService.searchProducts(searchParams.q, parseInt(searchParams.limit) || 20)
        break
      
      case '/expansion':
        result = await apiService.getExpansionData(searchParams.id)
        break
      
      case '/market-data':
        result = await apiService.getMarketData(searchParams.product)
        break
      
      default:
        return new Response(
          JSON.stringify({ error: 'Endpoint not found' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
    }

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('API Proxy error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
