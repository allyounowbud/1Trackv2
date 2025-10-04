/**
 * Scrydex Sync Function
 * Server-side function to sync data from Scrydex API
 * Handles both full sync and pricing-only sync
 */

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

interface ScrydexCard {
  id: string;
  name: string;
  supertype: string;
  types?: string[];
  subtypes?: string[];
  hp?: number;
  number?: string;
  rarity?: string;
  expansion?: {
    id: string;
    name: string;
  };
  images?: {
    small?: string;
    large?: string;
  };
  abilities?: any[];
  attacks?: any[];
  weaknesses?: any[];
  resistances?: any[];
  retreat_cost?: string[];
  converted_retreat_cost?: number;
  artist?: string;
  flavor_text?: string;
  regulation_mark?: string;
  language?: string;
  language_code?: string;
  national_pokedex_numbers?: number[];
  legalities?: any;
  prices?: {
    market?: {
      usd?: number;
      eur?: number;
      gbp?: number;
    };
    tcgplayer?: {
      usd?: number;
      eur?: number;
      gbp?: number;
    };
    cardmarket?: {
      eur?: number;
      usd?: number;
      gbp?: number;
    };
  };
}

interface ScrydexExpansion {
  id: string;
  name: string;
  series?: string;
  code?: string;
  total?: number;
  printed_total?: number;
  language?: string;
  language_code?: string;
  release_date?: string;
  is_online_only?: boolean;
  logo?: string;
  symbol?: string;
  translation?: any;
}

class ScrydexSyncService {
  private supabase: any;
  private config: ScrydexConfig;

  constructor(supabase: any, config: ScrydexConfig) {
    this.supabase = supabase;
    this.config = config;
  }

  // Make API request to Scrydex
  private async makeRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    const url = new URL(`${this.config.baseUrl}${endpoint}`);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });

    console.log(`🔍 Scrydex API Request: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'X-Team-ID': this.config.teamId,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Scrydex API error ${response.status}: ${errorText}`);
    }

    return await response.json();
  }

  // Update sync status
  private async updateSyncStatus(
    syncType: 'full' | 'pricing',
    totalCards?: number,
    totalExpansions?: number,
    syncInProgress?: boolean,
    error?: string
  ) {
    const { error: dbError } = await this.supabase.rpc('update_sync_status', {
      p_sync_type: syncType,
      p_total_cards: totalCards,
      p_total_expansions: totalExpansions,
      p_sync_in_progress: syncInProgress,
      p_error: error
    });

    if (dbError) {
      console.error('Failed to update sync status:', dbError);
    }
  }

  // Sync all expansions
  private async syncExpansions(): Promise<number> {
    console.log('🔄 Syncing expansions...');
    
    const result = await this.makeRequest('/search/expansions', {
      game: 'pokemon',
      limit: 1000
    });

    let expansions: ScrydexExpansion[] = [];
    if (Array.isArray(result)) {
      expansions = result;
    } else if (result?.data && Array.isArray(result.data)) {
      expansions = result.data;
    } else if (result?.expansions && Array.isArray(result.expansions)) {
      expansions = result.expansions;
    }

    if (expansions.length === 0) {
      console.log('⚠️ No expansions found');
      return 0;
    }

    // Format expansions for database
    const formattedExpansions = expansions.map(expansion => ({
      id: expansion.id,
      name: expansion.name,
      series: expansion.series,
      code: expansion.code,
      total: expansion.total,
      printed_total: expansion.printed_total,
      language: expansion.language || 'en',
      language_code: expansion.language_code || 'en',
      release_date: expansion.release_date,
      is_online_only: expansion.is_online_only || false,
      logo_url: expansion.logo,
      symbol_url: expansion.symbol,
      translation: expansion.translation,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    // Insert expansions
    const { error } = await this.supabase
      .from('pokemon_expansions')
      .upsert(formattedExpansions, { onConflict: 'id' });

    if (error) {
      throw new Error(`Failed to save expansions: ${error.message}`);
    }

    console.log(`✅ Synced ${formattedExpansions.length} expansions`);
    return formattedExpansions.length;
  }

  // Sync all cards (without pricing)
  private async syncCards(): Promise<number> {
    console.log('🔄 Syncing cards...');
    
    // Get popular Pokemon to sync
    const popularPokemon = [
      'pikachu', 'charizard', 'blastoise', 'venusaur', 'mewtwo',
      'lucario', 'mew', 'celebi', 'jirachi', 'rayquaza',
      'dialga', 'palkia', 'giratina', 'arceus', 'reshiram',
      'zekrom', 'kyurem', 'xerneas', 'yveltal', 'zygarde'
    ];

    const allCards: ScrydexCard[] = [];
    let totalSynced = 0;

    for (const pokemon of popularPokemon) {
      try {
        const result = await this.makeRequest('/search/cards', {
          q: pokemon,
          game: 'pokemon',
          limit: 50
        });

        let cards: ScrydexCard[] = [];
        if (Array.isArray(result)) {
          cards = result;
        } else if (result?.data && Array.isArray(result.data)) {
          cards = result.data;
        } else if (result?.cards && Array.isArray(result.cards)) {
          cards = result.cards;
        }

        allCards.push(...cards);
        totalSynced += cards.length;
        
        console.log(`📦 Synced ${cards.length} cards for ${pokemon}`);
        
        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.warn(`Failed to sync cards for ${pokemon}:`, error);
      }
    }

    if (allCards.length === 0) {
      console.log('⚠️ No cards found');
      return 0;
    }

    // Format cards for database (without pricing)
    const formattedCards = allCards.map(card => ({
      id: card.id,
      name: card.name,
      supertype: card.supertype,
      types: card.types || [],
      subtypes: card.subtypes || [],
      hp: card.hp,
      number: card.number,
      rarity: card.rarity,
      expansion_id: card.expansion?.id,
      expansion_name: card.expansion?.name,
      image_url: card.images?.small,
      image_url_large: card.images?.large,
      abilities: card.abilities,
      attacks: card.attacks,
      weaknesses: card.weaknesses,
      resistances: card.resistances,
      retreat_cost: card.retreat_cost || [],
      converted_retreat_cost: card.converted_retreat_cost,
      artist: card.artist,
      flavor_text: card.flavor_text,
      regulation_mark: card.regulation_mark,
      language: card.language || 'en',
      language_code: card.language_code || 'en',
      national_pokedex_numbers: card.national_pokedex_numbers || [],
      legalities: card.legalities,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    // Insert cards
    const { error } = await this.supabase
      .from('pokemon_cards')
      .upsert(formattedCards, { onConflict: 'id' });

    if (error) {
      throw new Error(`Failed to save cards: ${error.message}`);
    }

    console.log(`✅ Synced ${formattedCards.length} cards`);
    return formattedCards.length;
  }

  // Sync pricing for all cards
  private async syncPricing(): Promise<number> {
    console.log('🔄 Syncing pricing...');
    
    // Get all card IDs from database
    const { data: cards, error: cardsError } = await this.supabase
      .from('pokemon_cards')
      .select('id');

    if (cardsError) {
      throw new Error(`Failed to get cards: ${cardsError.message}`);
    }

    if (!cards || cards.length === 0) {
      console.log('⚠️ No cards found for pricing sync');
      return 0;
    }

    let totalUpdated = 0;
    const batchSize = 10; // Process in small batches

    for (let i = 0; i < cards.length; i += batchSize) {
      const batch = cards.slice(i, i + batchSize);
      
      for (const card of batch) {
        try {
          // Get card details with pricing
          const result = await this.makeRequest(`/pokemon/cards/${card.id}`, {
            include: 'prices'
          });

          if (result?.prices) {
            const prices = {
              card_id: card.id,
              market_price_usd: result.prices.market?.usd,
              market_price_eur: result.prices.market?.eur,
              market_price_gbp: result.prices.market?.gbp,
              tcgplayer_price_usd: result.prices.tcgplayer?.usd,
              tcgplayer_price_eur: result.prices.tcgplayer?.eur,
              tcgplayer_price_gbp: result.prices.tcgplayer?.gbp,
              cardmarket_price_eur: result.prices.cardmarket?.eur,
              cardmarket_price_usd: result.prices.cardmarket?.usd,
              cardmarket_price_gbp: result.prices.cardmarket?.gbp,
              last_updated: new Date().toISOString()
            };

            // Upsert pricing
            const { error } = await this.supabase
              .from('card_prices')
              .upsert(prices, { onConflict: 'card_id' });

            if (error) {
              console.warn(`Failed to update pricing for card ${card.id}:`, error);
            } else {
              totalUpdated++;
            }
          }

          // Small delay to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          console.warn(`Failed to get pricing for card ${card.id}:`, error);
        }
      }

      console.log(`📊 Updated pricing for ${totalUpdated}/${cards.length} cards`);
    }

    console.log(`✅ Updated pricing for ${totalUpdated} cards`);
    return totalUpdated;
  }

  // Full sync (expansions + cards)
  async fullSync(): Promise<{ expansions: number; cards: number }> {
    try {
      await this.updateSyncStatus('full', undefined, undefined, true);

      const expansions = await this.syncExpansions();
      const cards = await this.syncCards();

      await this.updateSyncStatus('full', cards, expansions, false);

      return { expansions, cards };
    } catch (error) {
      await this.updateSyncStatus('full', undefined, undefined, false, error.message);
      throw error;
    }
  }

  // Pricing-only sync
  async pricingSync(): Promise<{ updated: number }> {
    try {
      await this.updateSyncStatus('pricing', undefined, undefined, true);

      const updated = await this.syncPricing();

      await this.updateSyncStatus('pricing', undefined, undefined, false);

      return { updated };
    } catch (error) {
      await this.updateSyncStatus('pricing', undefined, undefined, false, error.message);
      throw error;
    }
  }

  // Get sync status
  async getStatus() {
    const { data, error } = await this.supabase.rpc('get_sync_status');
    
    if (error) {
      throw new Error(`Failed to get sync status: ${error.message}`);
    }

    return data[0];
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const scrydexApiKey = Deno.env.get('SCRYDEX_API_KEY');
    const scrydexTeamId = Deno.env.get('SCRYDEX_TEAM_ID');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!scrydexApiKey || !scrydexTeamId || !supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create sync service
    const syncService = new ScrydexSyncService(supabase, {
      apiKey: scrydexApiKey,
      teamId: scrydexTeamId,
      baseUrl: 'https://api.scrydex.com/v1'
    });

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    switch (action) {
      case 'full-sync':
        const fullResult = await syncService.fullSync();
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Full sync completed',
            data: fullResult
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'pricing-sync':
        const pricingResult = await syncService.pricingSync();
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Pricing sync completed',
            data: pricingResult
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'status':
        const status = await syncService.getStatus();
        return new Response(
          JSON.stringify({
            success: true,
            data: status
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      default:
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Invalid action. Use: full-sync, pricing-sync, or status'
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
    }
  } catch (error) {
    console.error('Sync function error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})