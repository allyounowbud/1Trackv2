/**
 * Scrydex Background Sync Service
 * Handles background synchronization of Scrydex data
 * Runs scheduled jobs to keep data fresh and minimize API calls
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

class ScrydexSyncService {
  private supabase: any
  private config: ScrydexConfig
  
  constructor() {
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    this.config = {
      baseUrl: 'https://api.scrydex.com',
      apiKey: Deno.env.get('SCRYDEX_API_KEY') ?? '',
      teamId: Deno.env.get('SCRYDEX_TEAM_ID') ?? ''
    }
  }

  /**
   * Make request to Scrydex API
   */
  private async makeScrydexRequest(endpoint: string, params: any = {}): Promise<any> {
    const url = new URL(`${this.config.baseUrl}${endpoint}`)
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value))
      }
    })

    const response = await fetch(url.toString(), {
      headers: {
        'X-Api-Key': this.config.apiKey,
        'X-Team-ID': this.config.teamId,
        'Content-Type': 'application/json',
        'User-Agent': 'OneTrack-Sync/2.2.0'
      }
    })

    if (!response.ok) {
      throw new Error(`Scrydex API error: ${response.status}`)
    }

    return await response.json()
  }

  /**
   * Sync Pokemon expansions
   */
  async syncPokemonExpansions(): Promise<any> {
    try {
      console.log('🔄 Syncing Pokemon expansions...')
      
      // Get all expansions from Scrydex
      const expansionsData = await this.makeScrydexRequest('/pokemon/v1/expansions', {
        pageSize: 1000
      })

      if (!expansionsData.data || !Array.isArray(expansionsData.data)) {
        throw new Error('Invalid expansions data received')
      }

      // Process and store expansions
      const expansionsToStore = expansionsData.data.map((expansion: any) => ({
        id: `pokemon_${expansion.id}`,
        game: 'pokemon',
        scrydex_id: expansion.id,
        name: expansion.name,
        code: expansion.code,
        release_date: expansion.releaseDate,
        total_cards: expansion.totalCards,
        image_url: expansion.images?.logo,
        symbol_url: expansion.images?.symbol,
        logo_url: expansion.images?.logo,
        raw_data: expansion,
        created_at: new Date().toISOString()
      }))

      // Upsert expansions
      const { error } = await this.supabase
        .from('scrydex_expansions')
        .upsert(expansionsToStore, { onConflict: 'id' })

      if (error) throw error

      console.log(`✅ Synced ${expansionsToStore.length} Pokemon expansions`)
      
      return {
        success: true,
        count: expansionsToStore.length,
        message: `Synced ${expansionsToStore.length} Pokemon expansions`
      }
    } catch (error) {
      console.error('❌ Error syncing Pokemon expansions:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Sync popular Pokemon cards
   */
  async syncPopularPokemonCards(): Promise<any> {
    try {
      console.log('🔄 Syncing popular Pokemon cards...')
      
      // Get popular cards from Scrydex
      const cardsData = await this.makeScrydexRequest('/pokemon/v1/cards', {
        pageSize: 500,
        orderBy: 'popularity'
      })

      if (!cardsData.data || !Array.isArray(cardsData.data)) {
        throw new Error('Invalid cards data received')
      }

      // Process and store cards
      const cardsToStore = cardsData.data.map((card: any) => ({
        id: `pokemon_${card.id}`,
        game: 'pokemon',
        scrydex_id: card.id,
        name: card.name,
        set_name: card.set?.name,
        set_code: card.set?.code,
        number: card.number,
        rarity: card.rarity,
        image_url: card.images?.large,
        small_image_url: card.images?.small,
        large_image_url: card.images?.large,
        tcgplayer_id: card.tcgplayer?.id,
        cardmarket_id: card.cardmarket?.id,
        prices: card.prices,
        legalities: card.legalities,
        raw_data: card,
        created_at: new Date().toISOString()
      }))

      // Upsert cards
      const { error } = await this.supabase
        .from('scrydex_cards')
        .upsert(cardsToStore, { onConflict: 'id' })

      if (error) throw error

      console.log(`✅ Synced ${cardsToStore.length} popular Pokemon cards`)
      
      return {
        success: true,
        count: cardsToStore.length,
        message: `Synced ${cardsToStore.length} popular Pokemon cards`
      }
    } catch (error) {
      console.error('❌ Error syncing popular Pokemon cards:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Clean up expired cache entries
   */
  async cleanupExpiredCache(): Promise<any> {
    try {
      console.log('🧹 Cleaning up expired cache entries...')
      
      const { data, error } = await this.supabase
        .rpc('cleanup_expired_scrydex_cache')

      if (error) throw error

      console.log(`✅ Cleaned up ${data} expired cache entries`)
      
      return {
        success: true,
        count: data,
        message: `Cleaned up ${data} expired cache entries`
      }
    } catch (error) {
      console.error('❌ Error cleaning up expired cache:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Get sync status and statistics
   */
  async getSyncStatus(): Promise<any> {
    try {
      // Get counts from database
      const [cardsCount, expansionsCount, cacheCount] = await Promise.all([
        this.supabase.from('scrydex_cards').select('*', { count: 'exact', head: true }),
        this.supabase.from('scrydex_expansions').select('*', { count: 'exact', head: true }),
        this.supabase.from('scrydex_search_cache').select('*', { count: 'exact', head: true })
      ])

      // Get API usage stats
      const { data: usageStats } = await this.supabase
        .rpc('get_scrydex_usage_stats', { days_back: 7 })

      return {
        success: true,
        data: {
          cards: cardsCount.count || 0,
          expansions: expansionsCount.count || 0,
          cacheEntries: cacheCount.count || 0,
          usageStats: usageStats?.[0] || null
        }
      }
    } catch (error) {
      console.error('❌ Error getting sync status:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Full sync - sync all data
   */
  async fullSync(): Promise<any> {
    try {
      console.log('🚀 Starting full Scrydex sync...')
      
      const results = await Promise.allSettled([
        this.syncPokemonExpansions(),
        this.syncPopularPokemonCards(),
        this.cleanupExpiredCache()
      ])

      const successful = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length

      console.log(`✅ Full sync completed: ${successful} successful, ${failed} failed`)
      
      return {
        success: true,
        results: results.map(r => r.status === 'fulfilled' ? r.value : r.reason),
        summary: {
          successful,
          failed,
          total: results.length
        }
      }
    } catch (error) {
      console.error('❌ Error in full sync:', error)
      return {
        success: false,
        error: error.message
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
    const action = url.searchParams.get('action') || 'status'
    
    console.log(`🔍 Scrydex Sync Request: ${action}`)
    
    const syncService = new ScrydexSyncService()
    let result: any

    switch (action) {
      case 'sync-expansions':
        result = await syncService.syncPokemonExpansions()
        break
      
      case 'sync-cards':
        result = await syncService.syncPopularPokemonCards()
        break
      
      case 'cleanup-cache':
        result = await syncService.cleanupExpiredCache()
        break
      
      case 'full-sync':
        result = await syncService.fullSync()
        break
      
      case 'status':
      default:
        result = await syncService.getSyncStatus()
        break
    }

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Scrydex Sync error:', error)
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
