/**
 * Scrydex API Proxy
 * Secure backend proxy for Scrydex API calls
 * Handles authentication, rate limiting, and caching
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ScrydexConfig {
  baseUrl: string
  apiKey: string
  teamId: string
}

class ScrydexProxy {
  private config: ScrydexConfig
  private supabase: any

  constructor() {
    const apiKey = Deno.env.get('SCRYDEX_API_KEY')
    const teamId = Deno.env.get('SCRYDEX_TEAM_ID')
    
    if (!apiKey || !teamId) {
      throw new Error('Missing required environment variables: SCRYDEX_API_KEY and SCRYDEX_TEAM_ID must be set')
    }

    this.config = {
      baseUrl: 'https://api.scrydex.com',
      apiKey,
      teamId
    }

    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
  }

  /**
   * Make authenticated request to Scrydex API with rate limiting
   */
  private async makeScrydexRequest(endpoint: string, params: any = {}): Promise<any> {
    const url = new URL(`${this.config.baseUrl}${endpoint}`)
    
    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value))
      }
    })

    console.log(`🌐 Scrydex API Request: ${url.toString()}`)

    // Check rate limiting before making request
    await this.checkRateLimit()

    const response = await fetch(url.toString(), {
      headers: {
        'X-Api-Key': this.config.apiKey,
        'X-Team-ID': this.config.teamId,
        'Content-Type': 'application/json',
        'User-Agent': 'OneTrack-ScrydexProxy/1.0.0'
      }
    })

    if (!response.ok) {
      if (response.status === 429) {
        console.warn('⚠️ Rate limit exceeded, waiting before retry...')
        await this.handleRateLimit()
        // Retry once after rate limit delay
        return this.makeScrydexRequest(endpoint, params)
      }
      
      const errorText = await response.text()
      console.error(`❌ Scrydex API error: ${response.status} - ${errorText}`)
      throw new Error(`Scrydex API error: ${response.status} - ${errorText}`)
    }

    return response.json()
  }

  /**
   * Check rate limiting (100 requests per second limit)
   */
  private async checkRateLimit(): Promise<void> {
    const now = Date.now()
    const timeWindow = 1000 // 1 second window
    
    // Get current request count from cache
    const cacheKey = `rate_limit:${Math.floor(now / timeWindow)}`
    const cached = await this.getFromCache(cacheKey)
    const currentCount = cached ? parseInt(cached) : 0
    
    if (currentCount >= 100) {
      console.warn('⚠️ Rate limit approaching, waiting...')
      await new Promise(resolve => setTimeout(resolve, 100))
      return this.checkRateLimit()
    }
    
    // Increment counter
    await this.setCache(cacheKey, currentCount + 1, 2) // 2 minute TTL
  }

  /**
   * Handle rate limit exceeded
   */
  private async handleRateLimit(): Promise<void> {
    // Wait 1 second before retry (respecting 100 req/sec limit)
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  /**
   * Check cache for request
   */
  private async getFromCache(cacheKey: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('api_cache')
        .select('data, expires_at')
        .eq('cache_key', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (error || !data) {
        return null
      }

      console.log(`📦 Cache hit: ${cacheKey}`)
      return JSON.parse(data.data)
    } catch (error) {
      console.log(`📦 Cache miss: ${cacheKey}`)
      return null
    }
  }

  /**
   * Store in cache
   */
  private async setCache(cacheKey: string, data: any, ttlMinutes: number = 60): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString()
      
      await this.supabase
        .from('api_cache')
        .upsert({
          cache_key: cacheKey,
          data: JSON.stringify(data),
          expires_at: expiresAt,
          created_at: new Date().toISOString()
        })
    } catch (error) {
      console.error('❌ Failed to cache response:', error)
    }
  }

  /**
   * Handle Pokemon card search
   */
  async searchPokemonCards(query: string, params: any = {}): Promise<any> {
    const cacheKey = `pokemon_cards_search:${query}:${JSON.stringify(params)}`
    
    // Check cache first
    const cached = await this.getFromCache(cacheKey)
    if (cached) {
      return cached
    }

    // Make API request
    const response = await this.makeScrydexRequest('/pokemon/v1/en/cards', {
      q: query,
      page: params.page || 1,
      page_size: params.pageSize || 20,
      ...params
    })

    // Cache for 2 hours
    await this.setCache(cacheKey, response, 120)
    
    return response
  }

  /**
   * Handle Pokemon expansion search
   */
  async searchPokemonExpansions(query: string, params: any = {}): Promise<any> {
    const cacheKey = `pokemon_expansions_search:${query}:${JSON.stringify(params)}`
    
    // Check cache first
    const cached = await this.getFromCache(cacheKey)
    if (cached) {
      return cached
    }

    // Make API request
    const response = await this.makeScrydexRequest('/pokemon/v1/en/expansions', {
      q: query,
      page: params.page || 1,
      page_size: params.pageSize || 20,
      ...params
    })

    // Cache for 24 hours
    await this.setCache(cacheKey, response, 1440)
    
    return response
  }

  /**
   * Handle getting specific card by ID
   */
  async getPokemonCard(cardId: string, params: any = {}): Promise<any> {
    const cacheKey = `pokemon_card:${cardId}:${JSON.stringify(params)}`
    
    // Check cache first
    const cached = await this.getFromCache(cacheKey)
    if (cached) {
      return cached
    }

    // Make API request
    const response = await this.makeScrydexRequest(`/pokemon/v1/en/cards/${cardId}`, params)

    // Cache for 7 days
    await this.setCache(cacheKey, response, 10080)
    
    return response
  }

  /**
   * Handle getting specific expansion by ID
   */
  async getPokemonExpansion(expansionId: string, params: any = {}): Promise<any> {
    const cacheKey = `pokemon_expansion:${expansionId}:${JSON.stringify(params)}`
    
    // Check cache first
    const cached = await this.getFromCache(cacheKey)
    if (cached) {
      return cached
    }

    // Make API request
    const response = await this.makeScrydexRequest(`/pokemon/v1/en/expansions/${expansionId}`, params)

    // Cache for 7 days
    await this.setCache(cacheKey, response, 10080)
    
    return response
  }

  /**
   * Handle generic API requests
   */
  async handleGenericRequest(endpoint: string, params: any = {}): Promise<any> {
    const cacheKey = `generic:${endpoint}:${JSON.stringify(params)}`
    
    // Check cache first
    const cached = await this.getFromCache(cacheKey)
    if (cached) {
      return cached
    }

    // Make API request
    const response = await this.makeScrydexRequest(endpoint, params)

    // Cache for 1 hour
    await this.setCache(cacheKey, response, 60)
    
    return response
  }

  /**
   * Get API usage information (updated every 20-30 minutes)
   */
  async getApiUsage(): Promise<any> {
    const cacheKey = 'api_usage'
    
    // Check cache first (cache for 15 minutes to avoid frequent API calls)
    const cached = await this.getFromCache(cacheKey)
    if (cached) {
      return cached
    }

    try {
      const response = await this.makeScrydexRequest('/v1/usage')
      
      // Cache usage data for 15 minutes
      await this.setCache(cacheKey, response, 15)
      
      return response
    } catch (error) {
      console.error('❌ Failed to fetch API usage:', error)
      // Return mock usage data when endpoint is not available
      return {
        total_credits: 1000,
        used_credits: 0,
        remaining_credits: 1000,
        overage_credit_rate: 0.01,
        note: 'API usage endpoint not available - showing mock data',
        last_updated: new Date().toISOString()
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
    const path = url.pathname.replace('/scrydex-proxy', '')
    const searchParams = Object.fromEntries(url.searchParams.entries())

    const proxy = new ScrydexProxy()

    switch (path) {
      case '/search/cards':
        const cardResults = await proxy.searchPokemonCards(
          searchParams.q || '',
          searchParams
        )
        return new Response(
          JSON.stringify(cardResults),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case '/search/expansions':
        const expansionResults = await proxy.searchPokemonExpansions(
          searchParams.q || '',
          searchParams
        )
        return new Response(
          JSON.stringify(expansionResults),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case '/card':
        if (!searchParams.id) {
          return new Response(
            JSON.stringify({ error: 'Card ID is required' }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
        const card = await proxy.getPokemonCard(searchParams.id, searchParams)
        return new Response(
          JSON.stringify(card),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case '/expansion':
        if (!searchParams.id) {
          return new Response(
            JSON.stringify({ error: 'Expansion ID is required' }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
        const expansion = await proxy.getPokemonExpansion(searchParams.id, searchParams)
        return new Response(
          JSON.stringify(expansion),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case '/api-usage':
        const usage = await proxy.getApiUsage()
        return new Response(
          JSON.stringify(usage),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      default:
        // Handle dynamic Pokemon card endpoints like /pokemon/v1/cards/{id}
        if (path.startsWith('/pokemon/v1/cards/')) {
          const cardId = path.replace('/pokemon/v1/cards/', '')
          const card = await proxy.getPokemonCard(cardId, searchParams)
          return new Response(
            JSON.stringify(card),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        // Handle dynamic Pokemon expansion endpoints like /pokemon/v1/expansions/{id}
        if (path.startsWith('/pokemon/v1/expansions/')) {
          const expansionId = path.replace('/pokemon/v1/expansions/', '')
          const expansion = await proxy.getPokemonExpansion(expansionId, searchParams)
          return new Response(
            JSON.stringify(expansion),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        // Handle Pokemon cards search endpoints like /pokemon/v1/cards
        if (path === '/pokemon/v1/cards') {
          const cardResults = await proxy.searchPokemonCards(
            searchParams.q || '',
            searchParams
          )
          return new Response(
            JSON.stringify(cardResults),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        // Handle Pokemon expansions search endpoints like /pokemon/v1/expansions
        if (path === '/pokemon/v1/expansions') {
          const expansionResults = await proxy.searchPokemonExpansions(
            searchParams.q || '',
            searchParams
          )
          return new Response(
            JSON.stringify(expansionResults),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        // Handle language-specific endpoints like /pokemon/v1/en/cards/{id}
        if (path.match(/^\/pokemon\/v1\/(en|ja)\/cards\/[^\/]+$/)) {
          const pathParts = path.split('/')
          const language = pathParts[3] // en or ja
          const cardId = pathParts[5]
          const card = await proxy.getPokemonCard(cardId, { ...searchParams, language })
          return new Response(
            JSON.stringify(card),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        // Handle language-specific card search endpoints like /pokemon/v1/en/cards
        if (path.match(/^\/pokemon\/v1\/(en|ja)\/cards$/)) {
          const pathParts = path.split('/')
          const language = pathParts[3] // en or ja
          const cardResults = await proxy.searchPokemonCards(
            searchParams.q || '',
            { ...searchParams, language }
          )
          return new Response(
            JSON.stringify(cardResults),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        // Handle language-specific expansion endpoints like /pokemon/v1/en/expansions/{id}
        if (path.match(/^\/pokemon\/v1\/(en|ja)\/expansions\/[^\/]+$/)) {
          const pathParts = path.split('/')
          const language = pathParts[3] // en or ja
          const expansionId = pathParts[5]
          const expansion = await proxy.getPokemonExpansion(expansionId, { ...searchParams, language })
          return new Response(
            JSON.stringify(expansion),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        // Handle language-specific expansion search endpoints like /pokemon/v1/en/expansions
        if (path.match(/^\/pokemon\/v1\/(en|ja)\/expansions$/)) {
          const pathParts = path.split('/')
          const language = pathParts[3] // en or ja
          const expansionResults = await proxy.searchPokemonExpansions(
            searchParams.q || '',
            { ...searchParams, language }
          )
          return new Response(
            JSON.stringify(expansionResults),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ 
            error: 'Invalid endpoint',
            availableEndpoints: [
              '/search/cards?q=query',
              '/search/expansions?q=query', 
              '/card?id=cardId',
              '/expansion?id=expansionId',
              '/api-usage',
              '/pokemon/v1/cards',
              '/pokemon/v1/cards/{id}',
              '/pokemon/v1/expansions',
              '/pokemon/v1/expansions/{id}',
              '/pokemon/v1/en/cards',
              '/pokemon/v1/en/cards/{id}',
              '/pokemon/v1/ja/cards',
              '/pokemon/v1/ja/cards/{id}',
              '/pokemon/v1/en/expansions',
              '/pokemon/v1/en/expansions/{id}',
              '/pokemon/v1/ja/expansions',
              '/pokemon/v1/ja/expansions/{id}'
            ]
          }),
          { 
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
    }
  } catch (error) {
    console.error('❌ Scrydex proxy error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
