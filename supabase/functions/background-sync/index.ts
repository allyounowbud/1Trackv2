/**
 * Background Sync Service
 * Keeps cached data fresh by periodically updating from external APIs
 * Runs on a schedule to ensure data is always up-to-date
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SyncConfig {
  tcgGo: {
    baseUrl: string
    apiKey: string
  }
  priceCharting: {
    baseUrl: string
    apiKey: string
  }
}

class BackgroundSyncService {
  private supabase: any
  
  constructor() {
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
  }

  /**
   * Get API configuration
   */
  private getApiConfig(): SyncConfig {
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
   * Sync popular search terms in large batches
   */
  async syncPopularSearches(): Promise<void> {
    console.log('🔄 Starting popular searches sync...')
    
    const popularTerms = [
      'pikachu',
      'charizard',
      'mew',
      'mewtwo',
      'lugia',
      'ho-oh',
      'rayquaza',
      'garchomp',
      'lucario',
      'gengar',
      'blastoise',
      'venusaur',
      'dragonite',
      'tyranitar',
      'metagross',
      'salamence',
      'gardevoir',
      'absol',
      'flygon',
      'milotic'
    ]

    // Process in batches of 5 to maximize API efficiency
    const batchSize = 5
    for (let i = 0; i < popularTerms.length; i += batchSize) {
      const batch = popularTerms.slice(i, i + batchSize)
      
      try {
        await this.syncSearchTermBatch(batch)
        // Wait 5 seconds between batches to respect rate limits
        if (i + batchSize < popularTerms.length) {
          await new Promise(resolve => setTimeout(resolve, 5000))
        }
      } catch (error) {
        console.error(`Error syncing batch:`, error)
      }
    }
    
    console.log('✅ Popular searches sync completed')
  }

  /**
   * Sync multiple search terms in a single batch
   */
  async syncSearchTermBatch(terms: string[]): Promise<void> {
    const config = this.getApiConfig()
    
    try {
      // Create a single search query that includes multiple terms
      const searchQuery = terms.join(' OR ')
      
      // Fetch cards for all terms in one API call
      const cardsUrl = `${config.tcgGo.baseUrl}/pokemon/cards?search=${encodeURIComponent(searchQuery)}&limit=100&sort=price_lowest`
      const cardsResponse = await fetch(cardsUrl, {
        headers: {
          'X-RapidAPI-Key': config.tcgGo.apiKey,
          'X-RapidAPI-Host': 'cardmarket-api-tcg.p.rapidapi.com'
        }
      })

      if (cardsResponse.ok) {
        const cardsData = await cardsResponse.json()
        
        // Store in database
        if (cardsData && Array.isArray(cardsData)) {
          const cardsToStore = cardsData.map((card: any) => ({
            id: `tcg_${card.id || card.product_id}`,
            search_term: this.extractSearchTerm(card.name, terms),
            name: card.name,
            set: card.set,
            rarity: card.rarity,
            price: card.price,
            image_url: card.image_url,
            product_id: card.id || card.product_id,
            data: card,
            created_at: new Date().toISOString()
          }))

          await this.supabase
            .from('cached_cards')
            .upsert(cardsToStore, { onConflict: 'id' })
        }
      }

      // Fetch products for all terms in one API call
      const productsUrl = `${config.tcgGo.baseUrl}/pokemon/products?search=${encodeURIComponent(searchQuery)}&limit=100&sort=price_lowest`
      const productsResponse = await fetch(productsUrl, {
        headers: {
          'X-RapidAPI-Key': config.tcgGo.apiKey,
          'X-RapidAPI-Host': 'cardmarket-api-tcg.p.rapidapi.com'
        }
      })

      if (productsResponse.ok) {
        const productsData = await productsResponse.json()
        
        // Store in database
        if (productsData && Array.isArray(productsData)) {
          const productsToStore = productsData.map((product: any) => ({
            id: `tcg_${product.id || product.product_id}`,
            search_term: this.extractSearchTerm(product.name, terms),
            name: product.name,
            set: product.set,
            price: product.price,
            image_url: product.image_url,
            product_id: product.id || product.product_id,
            data: product,
            created_at: new Date().toISOString()
          }))

          await this.supabase
            .from('cached_products')
            .upsert(productsToStore, { onConflict: 'id' })
        }
      }

      console.log(`✅ Synced batch: ${terms.join(', ')}`)
    } catch (error) {
      console.error(`❌ Error syncing batch:`, error)
    }
  }

  /**
   * Extract the most relevant search term from a product name
   */
  private extractSearchTerm(productName: string, terms: string[]): string {
    const lowerName = productName.toLowerCase()
    for (const term of terms) {
      if (lowerName.includes(term.toLowerCase())) {
        return term.toLowerCase()
      }
    }
    return terms[0].toLowerCase() // fallback to first term
  }

  /**
   * Sync a specific search term (legacy method for individual calls)
   */
  async syncSearchTerm(term: string): Promise<void> {
    const config = this.getApiConfig()
    
    try {
      // Sync cards
      const cardsUrl = `${config.tcgGo.baseUrl}/pokemon/cards?search=${encodeURIComponent(term)}&limit=20&sort=price_lowest`
      const cardsResponse = await fetch(cardsUrl, {
        headers: {
          'X-RapidAPI-Key': config.tcgGo.apiKey,
          'X-RapidAPI-Host': 'cardmarket-api-tcg.p.rapidapi.com'
        }
      })

      if (cardsResponse.ok) {
        const cardsData = await cardsResponse.json()
        
        // Store in database
        if (cardsData && Array.isArray(cardsData)) {
          const cardsToStore = cardsData.map((card: any) => ({
            id: `tcg_${card.id || card.product_id}`,
            search_term: term.toLowerCase(),
            name: card.name,
            set: card.set,
            rarity: card.rarity,
            price: card.price,
            image_url: card.image_url,
            product_id: card.id || card.product_id,
            data: card,
            created_at: new Date().toISOString()
          }))

          await this.supabase
            .from('cached_cards')
            .upsert(cardsToStore, { onConflict: 'id' })
        }
      }

      // Sync products
      const productsUrl = `${config.tcgGo.baseUrl}/pokemon/products?search=${encodeURIComponent(term)}&limit=20&sort=price_lowest`
      const productsResponse = await fetch(productsUrl, {
        headers: {
          'X-RapidAPI-Key': config.tcgGo.apiKey,
          'X-RapidAPI-Host': 'cardmarket-api-tcg.p.rapidapi.com'
        }
      })

      if (productsResponse.ok) {
        const productsData = await productsResponse.json()
        
        // Store in database
        if (productsData && Array.isArray(productsData)) {
          const productsToStore = productsData.map((product: any) => ({
            id: `tcg_${product.id || product.product_id}`,
            search_term: term.toLowerCase(),
            name: product.name,
            set: product.set,
            price: product.price,
            image_url: product.image_url,
            product_id: product.id || product.product_id,
            data: product,
            created_at: new Date().toISOString()
          }))

          await this.supabase
            .from('cached_products')
            .upsert(productsToStore, { onConflict: 'id' })
        }
      }

      console.log(`✅ Synced search term: ${term}`)
    } catch (error) {
      console.error(`❌ Error syncing search term "${term}":`, error)
    }
  }

  /**
   * Sync market data for popular products in batches
   */
  async syncMarketData(): Promise<void> {
    console.log('🔄 Starting market data sync...')
    
    const popularProducts = [
      'Pikachu ex',
      'Charizard ex',
      'Mew ex',
      'Lugia V',
      'Rayquaza VMAX',
      'Garchomp V',
      'Lucario VSTAR',
      'Gengar VMAX',
      'Blastoise ex',
      'Venusaur ex',
      'Dragonite V',
      'Tyranitar V',
      'Metagross VMAX',
      'Salamence V',
      'Gardevoir ex',
      'Absol V'
    ]

    // Process in batches of 4 to maximize API efficiency
    const batchSize = 4
    for (let i = 0; i < popularProducts.length; i += batchSize) {
      const batch = popularProducts.slice(i, i + batchSize)
      
      try {
        await this.syncProductMarketDataBatch(batch)
        // Wait 10 seconds between batches to respect rate limits
        if (i + batchSize < popularProducts.length) {
          await new Promise(resolve => setTimeout(resolve, 10000))
        }
      } catch (error) {
        console.error(`Error syncing market data batch:`, error)
      }
    }
    
    console.log('✅ Market data sync completed')
  }

  /**
   * Sync market data for multiple products in a single batch
   */
  async syncProductMarketDataBatch(products: string[]): Promise<void> {
    const config = this.getApiConfig()
    
    try {
      // Create a single search query for all products
      const searchQuery = products.join(' OR ')
      
      const url = `${config.priceCharting.baseUrl}/search?api_key=${config.priceCharting.apiKey}&q=${encodeURIComponent(searchQuery)}`
      const response = await fetch(url)

      if (response.ok) {
        const data = await response.json()
        
        // Store in database with individual product mappings
        if (data && Array.isArray(data)) {
          const marketDataToStore = data.map((item: any) => ({
            id: `pc_${item.product_name?.toLowerCase().replace(/\s+/g, '_') || 'unknown'}`,
            product_name: item.product_name?.toLowerCase() || 'unknown',
            data: item,
            created_at: new Date().toISOString()
          }))

          await this.supabase
            .from('cached_market_data')
            .upsert(marketDataToStore, { onConflict: 'id' })

          console.log(`✅ Synced market data batch: ${products.join(', ')}`)
        }
      }
    } catch (error) {
      console.error(`❌ Error syncing market data batch:`, error)
    }
  }

  /**
   * Sync market data for a specific product (legacy method)
   */
  async syncProductMarketData(productName: string): Promise<void> {
    const config = this.getApiConfig()
    
    try {
      const url = `${config.priceCharting.baseUrl}/search?api_key=${config.priceCharting.apiKey}&q=${encodeURIComponent(productName)}`
      const response = await fetch(url)

      if (response.ok) {
        const data = await response.json()
        
        // Store in database
        await this.supabase
          .from('cached_market_data')
          .upsert([{
            id: `pc_${productName.toLowerCase().replace(/\s+/g, '_')}`,
            product_name: productName.toLowerCase(),
            data: data,
            created_at: new Date().toISOString()
          }], { onConflict: 'id' })

        console.log(`✅ Synced market data for: ${productName}`)
      }
    } catch (error) {
      console.error(`❌ Error syncing market data for "${productName}":`, error)
    }
  }

  /**
   * Clean up old cache entries (only market data, keep static data forever)
   */
  async cleanupOldCache(): Promise<void> {
    console.log('🧹 Starting cache cleanup...')
    
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 30) // Keep market data for 30 days
    
    try {
      // Only clean up old market data (prices change frequently)
      // Keep static data (cards, products, expansions) forever
      const { error: marketDataError } = await this.supabase
        .from('cached_market_data')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
      
      if (marketDataError) {
        console.error('Error cleaning cached_market_data:', marketDataError)
      } else {
        console.log('✅ Cleaned up old market data')
      }

      // Clean up old general API cache entries
      const { error: apiCacheError } = await this.supabase
        .from('api_cache')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
      
      if (apiCacheError) {
        console.error('Error cleaning api_cache:', apiCacheError)
      } else {
        console.log('✅ Cleaned up old API cache entries')
      }

      console.log('✅ Cache cleanup completed')
    } catch (error) {
      console.error('❌ Error during cache cleanup:', error)
    }
  }

  /**
   * Check if sync is needed (avoid running too frequently)
   */
  async isSyncNeeded(): Promise<boolean> {
    try {
      const { data } = await this.supabase
        .from('api_cache')
        .select('created_at')
        .eq('service', 'sync_status')
        .eq('endpoint', 'last_full_sync')
        .single()

      if (!data) {
        return true // First time running
      }

      const lastSync = new Date(data.created_at)
      const now = new Date()
      const hoursSinceLastSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60)

      return hoursSinceLastSync >= 12 // Run every 12 hours
    } catch (error) {
      console.error('Error checking sync status:', error)
      return true // Default to running if we can't check
    }
  }

  /**
   * Mark sync as completed
   */
  async markSyncCompleted(): Promise<void> {
    try {
      await this.supabase
        .from('api_cache')
        .upsert({
          id: 'sync_status_last_full_sync',
          service: 'sync_status',
          endpoint: 'last_full_sync',
          data: { lastSync: new Date().toISOString() },
          created_at: new Date().toISOString()
        })
    } catch (error) {
      console.error('Error marking sync as completed:', error)
    }
  }

  /**
   * Full sync process (only runs every 12 hours)
   */
  async runFullSync(): Promise<void> {
    console.log('🚀 Starting full background sync...')
    
    // Check if sync is needed
    const syncNeeded = await this.isSyncNeeded()
    if (!syncNeeded) {
      console.log('⏭️ Sync not needed - last sync was less than 12 hours ago')
      return
    }
    
    try {
      await this.syncPopularSearches()
      await this.syncMarketData()
      await this.cleanupOldCache()
      await this.markSyncCompleted()
      
      console.log('✅ Full background sync completed')
    } catch (error) {
      console.error('❌ Error during full sync:', error)
      throw error
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
    const action = url.searchParams.get('action') || 'full'
    
    const syncService = new BackgroundSyncService()
    let result: any

    switch (action) {
      case 'popular-searches':
        await syncService.syncPopularSearches()
        result = { success: true, message: 'Popular searches synced' }
        break
      
      case 'market-data':
        await syncService.syncMarketData()
        result = { success: true, message: 'Market data synced' }
        break
      
      case 'cleanup':
        await syncService.cleanupOldCache()
        result = { success: true, message: 'Cache cleaned up' }
        break
      
      case 'full':
      default:
        await syncService.runFullSync()
        result = { success: true, message: 'Full sync completed' }
        break
    }

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Background sync error:', error)
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
