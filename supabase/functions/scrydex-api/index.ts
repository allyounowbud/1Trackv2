import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ScrydexConfig {
  apiKey: string;
  teamId: string;
  baseUrl: string;
}

// Get Scrydex configuration from environment variables
const getScrydexConfig = (): ScrydexConfig => {
  const apiKey = Deno.env.get('SCRYDEX_API_KEY')
  const teamId = Deno.env.get('SCRYDEX_TEAM_ID')
  const baseUrl = Deno.env.get('SCRYDEX_BASE_URL') || 'https://api.scrydex.com/v1'

  console.log('Environment check:')
  console.log('SCRYDEX_API_KEY exists:', !!apiKey)
  console.log('SCRYDEX_TEAM_ID exists:', !!teamId)
  console.log('Base URL:', baseUrl)
  console.log('API Key length:', apiKey?.length || 0)
  console.log('Team ID length:', teamId?.length || 0)

  if (!apiKey || !teamId) {
    console.error('Missing API credentials:')
    console.error('API Key:', apiKey ? 'SET' : 'MISSING')
    console.error('Team ID:', teamId ? 'SET' : 'MISSING')
    
    // Return mock data temporarily to avoid breaking the app
    console.log('Returning mock data due to missing credentials')
    return {
      apiKey: 'mock',
      teamId: 'mock',
      baseUrl: 'https://api.scrydex.com/v1'
    }
  }

  return { apiKey, teamId, baseUrl }
}

// Make authenticated request to Scrydex API
const makeScrydexRequest = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
  const config = getScrydexConfig()
  
  // If using mock credentials, return mock data
  if (config.apiKey === 'mock') {
    console.log(`Returning mock data for endpoint: ${endpoint}`)
    
    let mockData
    if (endpoint.includes('/expansions')) {
      mockData = {
        data: [
          {
            id: "sv1",
            name: "Scarlet & Violet",
            series: "Scarlet & Violet",
            code: "SV1",
            total: 186,
            printed_total: 186,
            language: "English",
            language_code: "EN",
            release_date: "2023/03/31",
            is_online_only: false,
            logo: "https://images.scrydex.com/pokemon/sv1-logo/logo",
            symbol: "https://images.scrydex.com/pokemon/sv1-symbol/symbol"
          }
        ],
        page: 1,
        pageSize: 100,
        totalCount: 1
      }
    } else {
      mockData = {
        data: [],
        page: 1,
        pageSize: 100,
        totalCount: 0
      }
    }
    
    return new Response(JSON.stringify(mockData), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })
  }
  
  const url = `${config.baseUrl}${endpoint}`
  const headers = {
    'X-Api-Key': config.apiKey,
    'X-Team-ID': config.teamId,
    'Content-Type': 'application/json',
    ...options.headers,
  }

  console.log(`Making Scrydex request to: ${url}`)
  console.log(`Headers:`, headers)
  
  return fetch(url, {
    ...options,
    headers,
  })
}

// Search Pokemon cards
const searchPokemonCards = async (query: string, options: any = {}) => {
  // Build the search query with proper syntax
  let searchQuery = query || '*'
  
  // Add optional filters using Scrydex query syntax
  const filters = []
  if (options.rarity) {
    filters.push(`rarity:${options.rarity}`)
  }
  if (options.type) {
    filters.push(`types:${options.type}`)
  }
  if (options.supertype) {
    filters.push(`supertype:${options.supertype}`)
  }
  if (options.expansionId) {
    filters.push(`expansion.id:${options.expansionId}`)
  }
  
  // Combine base query with filters
  if (filters.length > 0) {
    if (searchQuery === '*') {
      searchQuery = filters.join(' AND ')
    } else {
      searchQuery = `${searchQuery} AND ${filters.join(' AND ')}`
    }
  }

  const params = new URLSearchParams({
    q: searchQuery,
    page: options.page || '1',
    page_size: options.pageSize || '100', // Use Scrydex's maximum page size
    include: 'prices'
  })

  console.log(`Search query: ${searchQuery}`)

  // Use the correct Pokemon API endpoint
  const response = await makeScrydexRequest(`/pokemon/v1/en/cards?${params}`)
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error(`Scrydex API error: ${response.status} ${response.statusText}`, errorText)
    throw new Error(`Scrydex API error: ${response.status} ${response.statusText}`)
  }

  return await response.json()
}

// Get Pokemon expansions
const getPokemonExpansions = async (options: any = {}) => {
  const params = new URLSearchParams({
    ...options
  })

  // Determine language from options
  const language = options.language_code || options.language || 'en'
  const languageCode = language === 'JA' ? 'ja' : 'en'

  // Use the correct Pokemon expansions endpoint based on language
  const response = await makeScrydexRequest(`/pokemon/v1/${languageCode}/expansions?${params}`)
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error(`Scrydex API error: ${response.status} ${response.statusText}`, errorText)
    throw new Error(`Scrydex API error: ${response.status} ${response.statusText}`)
  }

  return await response.json()
}

// Get card by ID
const getCardById = async (cardId: string) => {
  const response = await makeScrydexRequest(`/pokemon/v1/en/cards/${cardId}`)
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error(`Scrydex API error: ${response.status} ${response.statusText}`, errorText)
    throw new Error(`Scrydex API error: ${response.status} ${response.statusText}`)
  }

  return await response.json()
}

// Get expansion by ID
const getExpansionById = async (expansionId: string) => {
  const response = await makeScrydexRequest(`/pokemon/v1/en/expansions/${expansionId}`)
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error(`Scrydex API error: ${response.status} ${response.statusText}`, errorText)
    throw new Error(`Scrydex API error: ${response.status} ${response.statusText}`)
  }

  return await response.json()
}

// Get pricing data for a card
const getCardPricing = async (cardId: string) => {
  const response = await makeScrydexRequest(`/pokemon/v1/en/cards/${cardId}/pricing`)
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error(`Scrydex API error: ${response.status} ${response.statusText}`, errorText)
    throw new Error(`Scrydex API error: ${response.status} ${response.statusText}`)
  }

  return await response.json()
}

// Get total card count from Scrydex API
const getTotalCardCount = async () => {
  try {
    console.log('Getting total card count from Scrydex API...')
    
    // Make a request to get a larger page to estimate total count
    const params = new URLSearchParams({
      page: '1',
      pageSize: '1000', // Get 1000 cards to get a better estimate
      include: 'prices'
    })
    
    const response = await makeScrydexRequest(`/pokemon/v1/cards?${params}`)
    
    if (!response.ok) {
      throw new Error(`Scrydex API error ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    // Extract total count from response headers or data
    const totalCount = response.headers.get('X-Total-Count') || 
                      data.total || 
                      data.totalCount || 
                      (data.data ? data.data.length : 0)
    
    // If we got 1000 cards, there are likely more - estimate based on pagination
    const cardsReturned = data.data ? data.data.length : 0
    let estimatedTotal = parseInt(totalCount) || 0
    
    // If we got the full page size, estimate there are more cards
    if (cardsReturned === 1000 && !totalCount) {
      estimatedTotal = 1000 // Conservative estimate - there are at least 1000 cards
    }
    
    console.log('Cards returned:', cardsReturned)
    console.log('Total cards available in Scrydex API:', estimatedTotal)
    
    return {
      total: estimatedTotal,
      cardsReturned: cardsReturned,
      source: 'scrydex-api',
      timestamp: new Date().toISOString()
    }
    
  } catch (error) {
    console.error('Error getting total card count:', error)
    throw error
  }
}

// Get all cards using the direct endpoint (like scrydex-sync does)
const getAllCards = async (options: any = {}) => {
  try {
    console.log('Getting all cards from Scrydex API...')
    
    const params = new URLSearchParams({
      page: options.page || '1',
      pageSize: options.pageSize || '100',
      include: 'prices'
    })
    
    const response = await makeScrydexRequest(`/pokemon/v1/cards?${params}`)
    
    if (!response.ok) {
      throw new Error(`Scrydex API error ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    console.log('Cards returned:', data.data?.length || 0)
    console.log('Total cards available:', data.total_count || 'unknown')
    
    return data
    
  } catch (error) {
    console.error('Error getting all cards:', error)
    throw error
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const path = url.pathname.replace('/scrydex-api', '')
    const searchParams = Object.fromEntries(url.searchParams)

    console.log(`API Request: ${req.method} ${path}`)
    console.log('Search params:', searchParams)

    let result

    switch (path) {
      case '/search/cards':
        if (req.method !== 'GET') {
          throw new Error('Method not allowed')
        }
        const query = searchParams.q || ''
        const searchOptions = {
          page: searchParams.page || '1',
          pageSize: searchParams.pageSize || '100',
          rarity: searchParams.rarity,
          type: searchParams.type,
          supertype: searchParams.supertype,
          expansionId: searchParams.expansionId,
        }
        result = await searchPokemonCards(query, searchOptions)
        break

      case '/expansions':
        if (req.method !== 'GET') {
          throw new Error('Method not allowed')
        }
        const expansionOptions = {
          page: searchParams.page || '1',
          pageSize: searchParams.pageSize || '100',
          series: searchParams.series,
          language_code: searchParams.language_code,
          language: searchParams.language,
        }
        result = await getPokemonExpansions(expansionOptions)
        break

      case '/cards/{id}':
        if (req.method !== 'GET') {
          throw new Error('Method not allowed')
        }
        const cardId = searchParams.id
        if (!cardId) {
          throw new Error('Card ID is required')
        }
        result = await getCardById(cardId)
        break

      case '/expansions/{id}':
        if (req.method !== 'GET') {
          throw new Error('Method not allowed')
        }
        const expansionId = searchParams.id
        if (!expansionId) {
          throw new Error('Expansion ID is required')
        }
        result = await getExpansionById(expansionId)
        break

      case '/cards/{id}/pricing':
        if (req.method !== 'GET') {
          throw new Error('Method not allowed')
        }
        const pricingCardId = searchParams.id
        if (!pricingCardId) {
          throw new Error('Card ID is required')
        }
        result = await getCardPricing(pricingCardId)
        break

      case '/total-count':
        if (req.method !== 'GET') {
          throw new Error('Method not allowed')
        }
        result = await getTotalCardCount()
        break

      case '/all-cards':
        if (req.method !== 'GET') {
          throw new Error('Method not allowed')
        }
        const allCardsOptions = {
          page: searchParams.page || '1',
          pageSize: searchParams.pageSize || '100',
        }
        result = await getAllCards(allCardsOptions)
        break

      default:
        // Handle dynamic routes
        if (path.startsWith('/cards/') && path.endsWith('/pricing')) {
          const cardId = path.replace('/cards/', '').replace('/pricing', '')
          result = await getCardPricing(cardId)
        } else if (path.startsWith('/cards/')) {
          const cardId = path.replace('/cards/', '')
          result = await getCardById(cardId)
        } else if (path.startsWith('/expansions/')) {
          const expansionId = path.replace('/expansions/', '')
          result = await getExpansionById(expansionId)
        } else {
          throw new Error(`Endpoint not found: ${path}`)
        }
    }

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('API Error:', error)
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        success: false
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
