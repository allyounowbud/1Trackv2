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
        'X-Api-Key': this.config.apiKey,
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
    syncType: 'full' | 'pricing' | 'test',
    totalCards?: number,
    totalExpansions?: number,
    syncInProgress?: boolean,
    error?: string
  ) {
    try {
      const { error: dbError } = await this.supabase
        .from('sync_status')
        .upsert({
          sync_type: syncType,
          total_cards: totalCards,
          total_expansions: totalExpansions,
          sync_in_progress: syncInProgress,
          error: error,
          updated_at: new Date().toISOString()
        }, { onConflict: 'sync_type' });

    if (dbError) {
      console.error('Failed to update sync status:', dbError);
      }
    } catch (error) {
      console.error('Failed to update sync status:', error);
    }
  }

  // Sync all expansions
  private async syncExpansions(): Promise<number> {
    console.log('🔄 Syncing expansions...');
    
    const result = await this.makeRequest('/pokemon/v1/expansions', {
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

  // Sync all cards with pricing (batched for efficiency)
  private async syncCards(): Promise<number> {
    console.log('🔄 Syncing cards with batching...');
    
    // Get popular Pokemon to sync (reduced list to save API credits)
    const popularPokemon = [
      'pikachu', 'charizard', 'blastoise', 'venusaur', 'mewtwo',
      'lucario', 'mew', 'celebi', 'jirachi', 'rayquaza'
    ];

    const allCards: ScrydexCard[] = [];
    let totalSynced = 0;
    const batchSize = 5; // Process 5 Pokemon at a time

    // Process Pokemon in batches
    for (let i = 0; i < popularPokemon.length; i += batchSize) {
      const batch = popularPokemon.slice(i, i + batchSize);
      console.log(`📦 Processing batch ${Math.floor(i/batchSize) + 1}: ${batch.join(', ')}`);
      
      // Process batch in parallel (but with rate limiting)
      const batchPromises = batch.map(async (pokemon) => {
        try {
          const result = await this.makeRequest('/pokemon/v1/cards', {
          q: pokemon,
            pageSize: 20, // Reduced from 50 to save API credits
            include: 'prices' // Include pricing data
        });

        let cards: ScrydexCard[] = [];
        if (Array.isArray(result)) {
          cards = result;
        } else if (result?.data && Array.isArray(result.data)) {
          cards = result.data;
        } else if (result?.cards && Array.isArray(result.cards)) {
          cards = result.cards;
        }

          console.log(`📦 Found ${cards.length} cards for ${pokemon}`);
          return cards;
        } catch (error) {
          console.warn(`Failed to sync cards for ${pokemon}:`, error);
          return [];
        }
      });

      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises);
      
      // Flatten results
      for (const cards of batchResults) {
        allCards.push(...cards);
        totalSynced += cards.length;
      }
      
      // Rate limiting between batches
      if (i + batchSize < popularPokemon.length) {
        console.log('⏳ Waiting 2 seconds between batches...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    if (allCards.length === 0) {
      console.log('⚠️ No cards found');
      return 0;
    }

    // Format cards for database (using same schema as syncCardsLimited)
    const formattedCards = allCards.map(card => {
      // Extract pricing data from variants
      let rawPricing = null;
      let gradedPricing = null;
      
      if (card.variants && Array.isArray(card.variants)) {
        for (const variant of card.variants) {
          if (variant.prices && Array.isArray(variant.prices)) {
            for (const price of variant.prices) {
              if (price.type === 'raw') {
                rawPricing = price;
              } else if (price.type === 'graded') {
                gradedPricing = price;
              }
            }
          }
        }
      }

      return {
        id: card.id,
        name: card.name,
        supertype: card.supertype,
        types: card.types || [],
        subtypes: card.subtypes || [],
        hp: card.hp,
        number: card.number,
        rarity: card.rarity,
        rarity_code: card.rarity_code,
        expansion: card.expansion,
        expansion_id: card.expansion?.id,
        expansion_name: card.expansion?.name,
        expansion_series: card.expansion?.series,
        expansion_total: card.expansion?.total,
        expansion_printed_total: card.expansion?.printed_total,
        expansion_language: card.expansion?.language,
        expansion_language_code: card.expansion?.language_code,
        expansion_release_date: card.expansion?.release_date,
        expansion_is_online_only: card.expansion?.is_online_only,
        expansion_sort_order: card.expansion_sort_order,
        images: card.images,
        image_small: card.images?.[0]?.small,
        image_medium: card.images?.[0]?.medium,
        image_large: card.images?.[0]?.large,
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
        variants: card.variants,
        // Raw pricing fields
        raw_condition: rawPricing?.condition,
        raw_is_perfect: rawPricing?.is_perfect,
        raw_is_signed: rawPricing?.is_signed,
        raw_is_error: rawPricing?.is_error,
        raw_type: rawPricing?.type || 'raw',
        raw_low: rawPricing?.low,
        raw_market: rawPricing?.market,
        raw_currency: rawPricing?.currency || 'USD',
        raw_trend_1d_percent: rawPricing?.trends?.days_1?.percent_change,
        raw_trend_1d_price: rawPricing?.trends?.days_1?.price_change,
        raw_trend_7d_percent: rawPricing?.trends?.days_7?.percent_change,
        raw_trend_7d_price: rawPricing?.trends?.days_7?.price_change,
        raw_trend_14d_percent: rawPricing?.trends?.days_14?.percent_change,
        raw_trend_14d_price: rawPricing?.trends?.days_14?.price_change,
        raw_trend_30d_percent: rawPricing?.trends?.days_30?.percent_change,
        raw_trend_30d_price: rawPricing?.trends?.days_30?.price_change,
        raw_trend_90d_percent: rawPricing?.trends?.days_90?.percent_change,
        raw_trend_90d_price: rawPricing?.trends?.days_90?.price_change,
        raw_trend_180d_percent: rawPricing?.trends?.days_180?.percent_change,
        raw_trend_180d_price: rawPricing?.trends?.days_180?.price_change,
        // Graded pricing fields
        graded_grade: gradedPricing?.grade,
        graded_company: gradedPricing?.company,
        graded_is_perfect: gradedPricing?.is_perfect,
        graded_is_signed: gradedPricing?.is_signed,
        graded_is_error: gradedPricing?.is_error,
        graded_type: gradedPricing?.type || 'graded',
        graded_low: gradedPricing?.low,
        graded_mid: gradedPricing?.mid,
        graded_high: gradedPricing?.high,
        graded_market: gradedPricing?.market,
        graded_currency: gradedPricing?.currency || 'USD',
        graded_trend_1d_percent: gradedPricing?.trends?.days_1?.percent_change,
        graded_trend_1d_price: gradedPricing?.trends?.days_1?.price_change,
        graded_trend_7d_percent: gradedPricing?.trends?.days_7?.percent_change,
        graded_trend_7d_price: gradedPricing?.trends?.days_7?.price_change,
        graded_trend_14d_percent: gradedPricing?.trends?.days_14?.percent_change,
        graded_trend_14d_price: gradedPricing?.trends?.days_14?.price_change,
        graded_trend_30d_percent: gradedPricing?.trends?.days_30?.percent_change,
        graded_trend_30d_price: gradedPricing?.trends?.days_30?.price_change,
        graded_trend_90d_percent: gradedPricing?.trends?.days_90?.percent_change,
        graded_trend_90d_price: gradedPricing?.trends?.days_90?.price_change,
        graded_trend_180d_percent: gradedPricing?.trends?.days_180?.percent_change,
        graded_trend_180d_price: gradedPricing?.trends?.days_180?.price_change,
        // Store complete pricing objects
        raw_pricing: rawPricing,
        graded_pricing: gradedPricing,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });

    // Insert cards in batches to avoid database timeouts
    const dbBatchSize = 50;
    let totalInserted = 0;
    
    for (let i = 0; i < formattedCards.length; i += dbBatchSize) {
      const batch = formattedCards.slice(i, i + dbBatchSize);
      
      const { error } = await this.supabase
        .from('pokemon_cards')
        .upsert(batch, { onConflict: 'id' });

      if (error) {
        throw new Error(`Failed to save cards batch: ${error.message}`);
      }
      
      totalInserted += batch.length;
      console.log(`💾 Inserted ${totalInserted}/${formattedCards.length} cards`);
    }

    console.log(`✅ Synced ${totalInserted} cards with pricing data`);
    return totalInserted;
  }

  // Comprehensive sync for entire database using pagination
  private async syncAllCards(startPage: number = 1): Promise<{ totalProcessed: number; newCards: number; duplicates: number; errors: number; lastPage: number }> {
    console.log(`🔄 Starting comprehensive database sync with pagination from page ${startPage}...`);
    
    const pageSize = 250; // Use API's maximum page size
    let currentPage = startPage;
    let totalProcessed = 0;
    let newCards = 0;
    let duplicates = 0;
    let errors = 0;
    let hasMorePages = true;
    let consecutiveErrors = 0;
    let consecutiveDuplicatePages = 0;
    const maxConsecutiveErrors = 2; // Reduced to 2 consecutive errors
    const maxConsecutiveDuplicatePages = 5; // Skip 5 pages if all duplicates
    const maxPages = startPage + 20; // Process 20 pages per run (5,000 cards max per run)

    console.log(`📊 Starting conservative pagination sync with ${pageSize} cards per page (max ${maxPages} pages) from page ${startPage}...`);

    while (hasMorePages && consecutiveErrors < maxConsecutiveErrors && currentPage <= maxPages) {
      try {
        console.log(`📦 Fetching page ${currentPage} (${pageSize} cards)...`);
        
        const result = await this.makeRequest('/pokemon/v1/cards', {
          page: currentPage,
          pageSize: pageSize,
          include: 'prices' // Include pricing data
        });

        let cards: ScrydexCard[] = [];
        if (Array.isArray(result)) {
          cards = result;
        } else if (result?.data && Array.isArray(result.data)) {
          cards = result.data;
        } else if (result?.cards && Array.isArray(result.cards)) {
          cards = result.cards;
        }

            console.log(`📦 Found ${cards.length} cards on page ${currentPage}`);
            totalProcessed += cards.length;

            if (cards.length === 0) {
              console.log('📄 No more cards found - reached end of database');
              hasMorePages = false;
              break;
            }

            // Check which cards we already have
            const cardIds = cards.map(card => card.id);
            const { data: existingCards, error: checkError } = await this.supabase
              .from('pokemon_cards')
              .select('id')
              .in('id', cardIds);

            if (checkError) {
              console.warn(`Failed to check existing cards: ${checkError.message}`);
              errors++;
              consecutiveErrors++;
              currentPage++;
              continue;
            }

            const existingIds = new Set(existingCards?.map(card => card.id) || []);
            const newCardsToInsert = cards.filter(card => !existingIds.has(card.id));
            const duplicateCount = cards.length - newCardsToInsert.length;

            console.log(`📊 Page ${currentPage}: ${newCardsToInsert.length} new cards, ${duplicateCount} duplicates`);
            newCards += newCardsToInsert.length;
            duplicates += duplicateCount;

        // Format only new cards for database
        const formattedCards = newCardsToInsert.map(card => {
          // Extract pricing data from variants - find the best prices
          let rawPricing = null;
          let gradedPricing = null;
          
          if (card.variants && Array.isArray(card.variants)) {
            // Collect all raw and graded prices
            const allRawPrices = [];
            const allGradedPrices = [];
            
            for (const variant of card.variants) {
              if (variant.prices && Array.isArray(variant.prices)) {
                for (const price of variant.prices) {
                  if (price.type === 'raw' && price.market) {
                    allRawPrices.push(price);
                  } else if (price.type === 'graded' && price.market) {
                    allGradedPrices.push(price);
                  }
                }
              }
            }
            
            // Find the best raw price (prefer NM condition, then lowest market price)
            if (allRawPrices.length > 0) {
              // Sort by condition preference (NM > LP > MP > DM) then by market price
              const conditionOrder = { 'NM': 1, 'LP': 2, 'MP': 3, 'DM': 4 };
              rawPricing = allRawPrices.sort((a, b) => {
                const aCondition = conditionOrder[a.condition] || 5;
                const bCondition = conditionOrder[b.condition] || 5;
                if (aCondition !== bCondition) {
                  return aCondition - bCondition;
                }
                return a.market - b.market;
              })[0];
            }
            
            // Find the best graded price (prefer PSA 10, then highest market price)
            if (allGradedPrices.length > 0) {
              gradedPricing = allGradedPrices.sort((a, b) => {
                // Prefer PSA 10, then by market price (highest first for graded)
                if (a.company === 'PSA' && a.grade === '10' && b.company !== 'PSA') return -1;
                if (b.company === 'PSA' && b.grade === '10' && a.company !== 'PSA') return 1;
                return b.market - a.market;
              })[0];
            }
          }

          return {
            id: card.id,
            name: card.name,
            supertype: card.supertype,
            types: card.types || [],
            subtypes: card.subtypes || [],
            hp: card.hp,
            number: card.number,
            rarity: card.rarity,
            rarity_code: card.rarity_code,
            expansion: card.expansion,
            expansion_id: card.expansion?.id,
            expansion_name: card.expansion?.name,
            expansion_series: card.expansion?.series,
            expansion_total: card.expansion?.total,
            expansion_printed_total: card.expansion?.printed_total,
            expansion_language: card.expansion?.language,
            expansion_language_code: card.expansion?.language_code,
            expansion_release_date: card.expansion?.release_date,
            expansion_is_online_only: card.expansion?.is_online_only,
            expansion_sort_order: card.expansion_sort_order,
            images: card.images,
            image_small: card.images?.[0]?.small,
            image_medium: card.images?.[0]?.medium,
            image_large: card.images?.[0]?.large,
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
            variants: card.variants,
            // Raw pricing fields
            raw_condition: rawPricing?.condition,
            raw_is_perfect: rawPricing?.is_perfect,
            raw_is_signed: rawPricing?.is_signed,
            raw_is_error: rawPricing?.is_error,
            raw_type: rawPricing?.type || 'raw',
            raw_low: rawPricing?.low,
            raw_market: rawPricing?.market,
            raw_currency: rawPricing?.currency || 'USD',
            raw_trend_1d_percent: rawPricing?.trends?.days_1?.percent_change,
            raw_trend_1d_price: rawPricing?.trends?.days_1?.price_change,
            raw_trend_7d_percent: rawPricing?.trends?.days_7?.percent_change,
            raw_trend_7d_price: rawPricing?.trends?.days_7?.price_change,
            raw_trend_14d_percent: rawPricing?.trends?.days_14?.percent_change,
            raw_trend_14d_price: rawPricing?.trends?.days_14?.price_change,
            raw_trend_30d_percent: rawPricing?.trends?.days_30?.percent_change,
            raw_trend_30d_price: rawPricing?.trends?.days_30?.price_change,
            raw_trend_90d_percent: rawPricing?.trends?.days_90?.percent_change,
            raw_trend_90d_price: rawPricing?.trends?.days_90?.price_change,
            raw_trend_180d_percent: rawPricing?.trends?.days_180?.percent_change,
            raw_trend_180d_price: rawPricing?.trends?.days_180?.price_change,
            // Graded pricing fields
            graded_grade: gradedPricing?.grade,
            graded_company: gradedPricing?.company,
            graded_is_perfect: gradedPricing?.is_perfect,
            graded_is_signed: gradedPricing?.is_signed,
            graded_is_error: gradedPricing?.is_error,
            graded_type: gradedPricing?.type || 'graded',
            graded_low: gradedPricing?.low,
            graded_mid: gradedPricing?.mid,
            graded_high: gradedPricing?.high,
            graded_market: gradedPricing?.market,
            graded_currency: gradedPricing?.currency || 'USD',
            graded_trend_1d_percent: gradedPricing?.trends?.days_1?.percent_change,
            graded_trend_1d_price: gradedPricing?.trends?.days_1?.price_change,
            graded_trend_7d_percent: gradedPricing?.trends?.days_7?.percent_change,
            graded_trend_7d_price: gradedPricing?.trends?.days_7?.price_change,
            graded_trend_14d_percent: gradedPricing?.trends?.days_14?.percent_change,
            graded_trend_14d_price: gradedPricing?.trends?.days_14?.price_change,
            graded_trend_30d_percent: gradedPricing?.trends?.days_30?.percent_change,
            graded_trend_30d_price: gradedPricing?.trends?.days_30?.price_change,
            graded_trend_90d_percent: gradedPricing?.trends?.days_90?.percent_change,
            graded_trend_90d_price: gradedPricing?.trends?.days_90?.price_change,
            graded_trend_180d_percent: gradedPricing?.trends?.days_180?.percent_change,
            graded_trend_180d_price: gradedPricing?.trends?.days_180?.price_change,
            // Store complete pricing objects
            raw_pricing: rawPricing,
            graded_pricing: gradedPricing,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        });

        // Insert only new cards into database
        if (formattedCards.length > 0) {
          const { error } = await this.supabase
            .from('pokemon_cards')
            .insert(formattedCards);

          if (error) {
            console.warn(`Failed to save page ${currentPage}: ${error.message}`);
            errors++;
            consecutiveErrors++;
          } else {
            consecutiveErrors = 0; // Reset error counter on success
            console.log(`💾 Successfully inserted ${formattedCards.length} new cards from page ${currentPage}`);
            
            // Update sync status periodically (less frequently to reduce overhead)
            if (currentPage % 5 === 0) {
              try {
                const { count: totalCards } = await this.supabase
                  .from('pokemon_cards')
                  .select('*', { count: 'exact', head: true });
                
                await this.updateSyncStatus('comprehensive', totalCards || 0, 0, true);
                console.log(`📊 Progress update: ${newCards} new cards added, ${duplicates} duplicates skipped, ${totalCards} total in database`);
              } catch (statusError) {
                console.warn('Failed to update sync status:', statusError);
                // Continue anyway - don't let status update failures stop the sync
              }
            }
          }
        } else {
          console.log(`📄 Page ${currentPage}: No new cards to insert (all duplicates)`);
          consecutiveErrors = 0; // Reset error counter since this isn't an error
          consecutiveDuplicatePages++;
          
          // If we hit too many consecutive duplicate pages, skip ahead
          if (consecutiveDuplicatePages >= maxConsecutiveDuplicatePages) {
            console.log(`⚠️ Skipping ahead ${maxConsecutiveDuplicatePages} pages due to consecutive duplicates`);
            currentPage += maxConsecutiveDuplicatePages;
            consecutiveDuplicatePages = 0;
            continue;
          }
        }

        // Check if we got fewer cards than expected (end of database)
        if (cards.length < pageSize) {
          console.log('📄 Reached end of database - fewer cards than page size');
          hasMorePages = false;
        }

        currentPage++;
        
        // More conservative rate limiting between pages
        console.log('⏳ Waiting 2 seconds before next page...');
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.warn(`Failed to fetch page ${currentPage}:`, error);
        consecutiveErrors++;
        
        if (consecutiveErrors >= maxConsecutiveErrors) {
          console.error(`❌ Too many consecutive errors (${consecutiveErrors}), stopping sync`);
          break;
        }
        
        // Wait longer before retrying
        console.log('⏳ Waiting 10 seconds before retrying...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        currentPage++; // Skip the failed page
      }
    }

    if (consecutiveErrors >= maxConsecutiveErrors) {
      console.log(`⚠️ Sync stopped due to ${consecutiveErrors} consecutive errors. You can run it again to continue from where it left off.`);
    } else if (currentPage > maxPages) {
      console.log(`⚠️ Sync stopped after ${maxPages} pages to prevent timeout. You can run it again to continue.`);
    }

    // Final status update with correct total count
    const { count: totalCards } = await this.supabase
      .from('pokemon_cards')
      .select('*', { count: 'exact', head: true });
    
    await this.updateSyncStatus('comprehensive', totalCards || 0, 0, false);
    
    console.log(`✅ Comprehensive sync completed:`);
    console.log(`📊 Processed: ${totalProcessed} cards total`);
    console.log(`🆕 New cards added: ${newCards}`);
    console.log(`🔄 Duplicates skipped: ${duplicates}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📄 Pages processed: ${currentPage - 1}`);
    console.log(`💾 Total cards in database: ${totalCards}`);
    
    if (currentPage <= maxPages && hasMorePages) {
      console.log(`🔄 More cards available - run sync again to continue from page ${currentPage}`);
    }
    
    return { totalProcessed, newCards, duplicates, errors, lastPage: currentPage };
  }

  // Sync limited number of cards for testing
  async syncCardsLimited(limit: number): Promise<number> {
    console.log(`🔄 Syncing ${limit} cards for testing...`);
    
    // Get just a few popular Pokemon for testing
    const testPokemon = [
      'pikachu', 'charizard', 'blastoise'
    ];

    const allCards: ScrydexCard[] = [];
    let totalSynced = 0;

    for (const pokemon of testPokemon) {
      if (allCards.length >= limit) break;
      
      try {
        const result = await this.makeRequest('/pokemon/v1/cards', {
          q: pokemon,
          pageSize: Math.min(10, limit - allCards.length), // Limit per Pokemon
          include: 'prices' // Include pricing data
        });

        console.log(`🔍 API Response for ${pokemon}:`, JSON.stringify(result, null, 2));

        let cards: ScrydexCard[] = [];
        if (Array.isArray(result)) {
          cards = result;
        } else if (result?.data && Array.isArray(result.data)) {
          cards = result.data;
        } else if (result?.cards && Array.isArray(result.cards)) {
          cards = result.cards;
        }

        console.log(`📦 Found ${cards.length} cards for ${pokemon}`);

        // Limit to the requested number
        const remainingSlots = limit - allCards.length;
        const cardsToAdd = cards.slice(0, remainingSlots);
        
        allCards.push(...cardsToAdd);
        totalSynced += cardsToAdd.length;
        
        console.log(`📦 Synced ${cardsToAdd.length} cards for ${pokemon} (${allCards.length}/${limit} total)`);
        
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

    // Format cards for database (using updated schema structure)
    const formattedCards = allCards.map(card => {
      // Extract pricing data from variants
      let rawPricing = null;
      let gradedPricing = null;
      
      if (card.variants && Array.isArray(card.variants)) {
        for (const variant of card.variants) {
          if (variant.prices && Array.isArray(variant.prices)) {
            for (const price of variant.prices) {
              if (price.type === 'raw') {
                rawPricing = price;
              } else if (price.type === 'graded') {
                gradedPricing = price;
              }
            }
          }
        }
      }

      return {
      id: card.id,
      name: card.name,
      supertype: card.supertype,
      types: card.types || [],
      subtypes: card.subtypes || [],
      hp: card.hp,
      number: card.number,
      rarity: card.rarity,
        rarity_code: card.rarity_code,
        expansion: card.expansion,
      expansion_id: card.expansion?.id,
      expansion_name: card.expansion?.name,
        expansion_series: card.expansion?.series,
        expansion_total: card.expansion?.total,
        expansion_printed_total: card.expansion?.printed_total,
        expansion_language: card.expansion?.language,
        expansion_language_code: card.expansion?.language_code,
        expansion_release_date: card.expansion?.release_date,
        expansion_is_online_only: card.expansion?.is_online_only,
        expansion_sort_order: card.expansion_sort_order,
        images: card.images,
        image_small: card.images?.[0]?.small,
        image_medium: card.images?.[0]?.medium,
        image_large: card.images?.[0]?.large,
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
        variants: card.variants,
        // Raw pricing fields
        raw_condition: rawPricing?.condition,
        raw_is_perfect: rawPricing?.is_perfect,
        raw_is_signed: rawPricing?.is_signed,
        raw_is_error: rawPricing?.is_error,
        raw_type: rawPricing?.type || 'raw',
        raw_low: rawPricing?.low,
        raw_market: rawPricing?.market,
        raw_currency: rawPricing?.currency || 'USD',
        raw_trend_1d_percent: rawPricing?.trends?.days_1?.percent_change,
        raw_trend_1d_price: rawPricing?.trends?.days_1?.price_change,
        raw_trend_7d_percent: rawPricing?.trends?.days_7?.percent_change,
        raw_trend_7d_price: rawPricing?.trends?.days_7?.price_change,
        raw_trend_14d_percent: rawPricing?.trends?.days_14?.percent_change,
        raw_trend_14d_price: rawPricing?.trends?.days_14?.price_change,
        raw_trend_30d_percent: rawPricing?.trends?.days_30?.percent_change,
        raw_trend_30d_price: rawPricing?.trends?.days_30?.price_change,
        raw_trend_90d_percent: rawPricing?.trends?.days_90?.percent_change,
        raw_trend_90d_price: rawPricing?.trends?.days_90?.price_change,
        raw_trend_180d_percent: rawPricing?.trends?.days_180?.percent_change,
        raw_trend_180d_price: rawPricing?.trends?.days_180?.price_change,
        // Graded pricing fields
        graded_grade: gradedPricing?.grade,
        graded_company: gradedPricing?.company,
        graded_is_perfect: gradedPricing?.is_perfect,
        graded_is_signed: gradedPricing?.is_signed,
        graded_is_error: gradedPricing?.is_error,
        graded_type: gradedPricing?.type || 'graded',
        graded_low: gradedPricing?.low,
        graded_mid: gradedPricing?.mid,
        graded_high: gradedPricing?.high,
        graded_market: gradedPricing?.market,
        graded_currency: gradedPricing?.currency || 'USD',
        graded_trend_1d_percent: gradedPricing?.trends?.days_1?.percent_change,
        graded_trend_1d_price: gradedPricing?.trends?.days_1?.price_change,
        graded_trend_7d_percent: gradedPricing?.trends?.days_7?.percent_change,
        graded_trend_7d_price: gradedPricing?.trends?.days_7?.price_change,
        graded_trend_14d_percent: gradedPricing?.trends?.days_14?.percent_change,
        graded_trend_14d_price: gradedPricing?.trends?.days_14?.price_change,
        graded_trend_30d_percent: gradedPricing?.trends?.days_30?.percent_change,
        graded_trend_30d_price: gradedPricing?.trends?.days_30?.price_change,
        graded_trend_90d_percent: gradedPricing?.trends?.days_90?.percent_change,
        graded_trend_90d_price: gradedPricing?.trends?.days_90?.price_change,
        graded_trend_180d_percent: gradedPricing?.trends?.days_180?.percent_change,
        graded_trend_180d_price: gradedPricing?.trends?.days_180?.price_change,
        // Store complete pricing objects
        raw_pricing: rawPricing,
        graded_pricing: gradedPricing,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
      };
    });

    // Insert cards using the existing schema (temporary)
    const { error } = await this.supabase
      .from('pokemon_cards')
      .upsert(formattedCards, { onConflict: 'id' });

    if (error) {
      throw new Error(`Failed to save cards: ${error.message}`);
    }

    console.log(`✅ Test sync completed: ${formattedCards.length} cards`);
    return formattedCards.length;
  }

  // Sync pricing for all cards (dedicated pricing sync)
  private async syncPricing(): Promise<number> {
    console.log('💰 Syncing pricing data only...');
    
    try {
      // Get all cards that need pricing updates (prioritize stale data)
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
      
      const { data: cards, error: cardsError } = await this.supabase
        .from('pokemon_cards')
        .select('id, updated_at')
        .order('updated_at', { ascending: true }) // Oldest first
        .limit(500); // Limit to prevent overwhelming the API

      if (cardsError) {
        console.error('Failed to get cards for pricing sync:', cardsError);
        return 0;
      }

      if (!cards || cards.length === 0) {
        console.log('No cards found for pricing sync');
        return 0;
      }

      // Filter to only cards that need pricing updates
      const staleCards = cards.filter(card => 
        !card.updated_at || new Date(card.updated_at) < new Date(twelveHoursAgo)
      );

      console.log(`Found ${staleCards.length} stale cards out of ${cards.length} total cards`);
      
      let totalUpdated = 0;
      const batchSize = 5; // Smaller batches for pricing-only sync

      for (let i = 0; i < staleCards.length; i += batchSize) {
        const batch = staleCards.slice(i, i + batchSize);
        
        for (const card of batch) {
          try {
            // Get updated pricing data from Scrydex
            const result = await this.makeRequest(`/pokemon/cards/${card.id}`, {
              include: 'prices'
            });

            if (result?.prices) {
              // Update pricing data in pokemon_cards table
              const pricingUpdate = {
                // Raw pricing data (from Scrydex)
                raw_market: result.prices.raw?.market,
                raw_low: result.prices.raw?.low,
                raw_condition: result.prices.raw?.condition,
                raw_currency: result.prices.raw?.currency,
                raw_is_perfect: result.prices.raw?.is_perfect,
                raw_is_signed: result.prices.raw?.is_signed,
                raw_is_error: result.prices.raw?.is_error,
                raw_trend_7d_percent: result.prices.raw?.trends?.days_7?.percent_change,
                raw_trend_30d_percent: result.prices.raw?.trends?.days_30?.percent_change,
                raw_trend_90d_percent: result.prices.raw?.trends?.days_90?.percent_change,
                raw_trend_180d_percent: result.prices.raw?.trends?.days_180?.percent_change,
                
                // Graded pricing data
                graded_market: result.prices.graded?.market,
                graded_low: result.prices.graded?.low,
                graded_mid: result.prices.graded?.mid,
                graded_high: result.prices.graded?.high,
                graded_grade: result.prices.graded?.grade,
                graded_company: result.prices.graded?.company,
                graded_currency: result.prices.graded?.currency,
                graded_trend_7d_percent: result.prices.graded?.trends?.days_7?.percent_change,
                graded_trend_30d_percent: result.prices.graded?.trends?.days_30?.percent_change,
                graded_trend_90d_percent: result.prices.graded?.trends?.days_90?.percent_change,
                graded_trend_180d_percent: result.prices.graded?.trends?.days_180?.percent_change,
                
                // Store complete pricing data
                prices: result.prices,
                
                // Update timestamp
                updated_at: new Date().toISOString()
              };

              // Update the pokemon card with new pricing
              const { error } = await this.supabase
                .from('pokemon_cards')
                .update(pricingUpdate)
                .eq('id', card.id);

              if (error) {
                console.warn(`Failed to update pricing for card ${card.id}:`, error);
              } else {
                totalUpdated++;
                console.log(`✅ Updated pricing for ${card.id}`);
              }
            }

            // Small delay to respect rate limits
            await new Promise(resolve => setTimeout(resolve, 300));
          } catch (error) {
            console.warn(`Failed to get pricing for card ${card.id}:`, error);
          }
        }

        console.log(`📊 Updated pricing for ${totalUpdated}/${staleCards.length} stale cards`);
        
        // Longer delay between batches to be respectful to the API
        if (i + batchSize < staleCards.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log(`✅ Pricing sync completed: ${totalUpdated} cards updated`);
      return totalUpdated;
    } catch (error) {
      console.error('Error syncing pricing:', error);
      return 0;
    }
  }

  // Full sync (expansions + cards)
  async fullSync(): Promise<{ expansions: number; cards: number }> {
    try {
      await this.updateSyncStatus('full', undefined, undefined, true);

      // Skip expansions for now since the endpoint is returning 404
      // const expansions = await this.syncExpansions();
      const expansions = 0;
      console.log('⚠️ Skipping expansions sync due to API endpoint issues');
      
      const cards = await this.syncCards();

      await this.updateSyncStatus('full', cards, expansions, false);

      return { expansions, cards };
    } catch (error) {
      await this.updateSyncStatus('full', undefined, undefined, false, error.message);
      throw error;
    }
  }

  // Get the last successful page by calculating based on current database count
  private async getLastSuccessfulPage(): Promise<number> {
    try {
      // Get current database count
      const { count: currentCount } = await this.supabase
        .from('pokemon_cards')
        .select('*', { count: 'exact', head: true });

      const pageSize = 250;
      const estimatedPagesProcessed = Math.floor((currentCount || 0) / pageSize);
      const startPage = estimatedPagesProcessed + 1;

      console.log(`📊 Current database count: ${currentCount}`);
      console.log(`📊 Estimated pages processed: ${estimatedPagesProcessed}`);
      console.log(`📊 Starting from page: ${startPage}`);

      // For now, just return the calculated start page
      // We'll let the sync logic handle duplicate detection
      return startPage;

    } catch (error) {
      console.log('Error calculating start page, starting from page 1');
      return 1;
    }
  }

  // Update the last successful page (simplified - just update the timestamp)
  private async updateLastSuccessfulPage(page: number): Promise<void> {
    try {
      await this.supabase
        .from('sync_status')
        .upsert({
          id: 1,
          updated_at: new Date().toISOString()
        });
    } catch (error) {
      console.warn('Failed to update sync status:', error);
    }
  }

  // Sync all expansions from Scrydex API
  async syncAllExpansions(): Promise<number> {
    try {
      console.log('🔄 Starting expansions sync...');
      
      // Try different approaches to get all expansions
      let allExpansions: any[] = [];
      
      // First, try the basic endpoint with a large page size
      console.log('📄 Trying basic endpoint with large page size...');
      try {
        const result = await this.makeRequest('/pokemon/v1/expansions', {
          pageSize: 1000
        });

        let expansions: any[] = [];
        if (Array.isArray(result)) {
          expansions = result;
        } else if (result?.data && Array.isArray(result.data)) {
          expansions = result.data;
        }

        console.log(`📦 Found ${expansions.length} expansions from basic endpoint`);
        allExpansions = expansions;
        
        // Log the total if available
        if (result?.total) {
          console.log(`📊 API reports total: ${result.total}`);
        } else if (result?.totalCount) {
          console.log(`📊 API reports total: ${result.totalCount}`);
        }
        
      } catch (error) {
        console.error('❌ Basic endpoint failed:', error);
      }
      
      // If we got fewer than expected, try with different parameters and language endpoints
      if (allExpansions.length < 300) {
        console.log('📄 Trying with different parameters...');
        try {
          const result2 = await this.makeRequest('/pokemon/v1/expansions', {
            limit: 1000
          });

          let expansions2: any[] = [];
          if (Array.isArray(result2)) {
            expansions2 = result2;
          } else if (result2?.data && Array.isArray(result2.data)) {
            expansions2 = result2.data;
          }

          console.log(`📦 Found ${expansions2.length} expansions with limit parameter`);
          
          // Merge unique expansions
          const existingIds = new Set(allExpansions.map(exp => exp.id));
          const newExpansions = expansions2.filter(exp => !existingIds.has(exp.id));
          allExpansions = allExpansions.concat(newExpansions);
          
        } catch (error) {
          console.error('❌ Limit parameter failed:', error);
        }
        
        // Try Japanese expansions endpoint
        console.log('📄 Trying Japanese expansions endpoint...');
        try {
          const result3 = await this.makeRequest('/pokemon/v1/ja/expansions', {
            pageSize: 1000
          });

          let expansions3: any[] = [];
          if (Array.isArray(result3)) {
            expansions3 = result3;
          } else if (result3?.data && Array.isArray(result3.data)) {
            expansions3 = result3.data;
          }

          console.log(`📦 Found ${expansions3.length} Japanese expansions`);
          
          // Merge unique expansions
          const existingIds = new Set(allExpansions.map(exp => exp.id));
          const newExpansions = expansions3.filter(exp => !existingIds.has(exp.id));
          allExpansions = allExpansions.concat(newExpansions);
          
        } catch (error) {
          console.error('❌ Japanese expansions failed:', error);
        }
        
        // Try English expansions endpoint
        console.log('📄 Trying English expansions endpoint...');
        try {
          const result4 = await this.makeRequest('/pokemon/v1/en/expansions', {
            pageSize: 1000
          });

          let expansions4: any[] = [];
          if (Array.isArray(result4)) {
            expansions4 = result4;
          } else if (result4?.data && Array.isArray(result4.data)) {
            expansions4 = result4.data;
          }

          console.log(`📦 Found ${expansions4.length} English expansions`);
          
          // Merge unique expansions
          const existingIds = new Set(allExpansions.map(exp => exp.id));
          const newExpansions = expansions4.filter(exp => !existingIds.has(exp.id));
          allExpansions = allExpansions.concat(newExpansions);
          
        } catch (error) {
          console.error('❌ English expansions failed:', error);
        }
      }

      console.log(`📦 Total unique expansions found: ${allExpansions.length}`);

      if (allExpansions.length === 0) {
        console.log('⚠️ No expansions found');
        return 0;
      }

      // Format expansions for database
      const formattedExpansions = allExpansions.map(expansion => ({
        id: expansion.id,
        name: expansion.name,
        series: expansion.series,
        code: expansion.code,
        total: expansion.total,
        printed_total: expansion.printed_total,
        language: expansion.language,
        language_code: expansion.language_code,
        release_date: expansion.release_date,
        is_online_only: expansion.is_online_only || false,
        logo: expansion.logo,
        symbol: expansion.symbol,
        translation: expansion.translation,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      // Insert expansions into database (upsert to handle updates)
      const { error } = await this.supabase
        .from('pokemon_expansions')
        .upsert(formattedExpansions, { onConflict: 'id' });

      if (error) {
        console.error('Failed to save expansions:', error);
        throw error;
      }

      console.log(`💾 Successfully synced ${formattedExpansions.length} expansions`);
      return formattedExpansions.length;

    } catch (error) {
      console.error('Expansions sync failed:', error);
      throw error;
    }
  }

  // Comprehensive database sync
  async comprehensiveSync(): Promise<{ expansions: number; cards: number }> {
    try {
      await this.updateSyncStatus('comprehensive', undefined, undefined, true);

      // Sync expansions first
      console.log('🔄 Starting comprehensive sync with expansions...');
      const expansions = await this.syncAllExpansions();
      
      // Get the last successful page to continue from
      const startPage = await this.getLastSuccessfulPage();
      console.log(`🔄 Continuing sync from page ${startPage}`);
      
      const syncResult = await this.syncAllCards(startPage);

      // Update the last successful page
      await this.updateLastSuccessfulPage(syncResult.lastPage);

      // Get actual total count from database
      const { count: totalCards } = await this.supabase
        .from('pokemon_cards')
        .select('*', { count: 'exact', head: true });

      await this.updateSyncStatus('comprehensive', totalCards || 0, expansions, false);

      return { expansions, cards: syncResult.newCards, syncDetails: syncResult };
    } catch (error) {
      await this.updateSyncStatus('comprehensive', undefined, undefined, false, error.message);
      throw error;
    }
  }

  // Resume sync from a specific page
  async resumeSync(startPage: number): Promise<{ expansions: number; cards: number }> {
    try {
      await this.updateSyncStatus('resume', undefined, undefined, true);

      // Sync expansions first
      console.log('🔄 Starting resume sync with expansions...');
      const expansions = await this.syncAllExpansions();
      
      const syncResult = await this.syncAllCards(startPage);

      // Get actual total count from database
      const { count: totalCards } = await this.supabase
        .from('pokemon_cards')
        .select('*', { count: 'exact', head: true });

      await this.updateSyncStatus('resume', totalCards || 0, expansions, false);

      return { expansions, cards: syncResult.newCards, syncDetails: syncResult };
    } catch (error) {
      await this.updateSyncStatus('resume', undefined, undefined, false, error.message);
      throw error;
    }
  }

  // Test sync (limited to 10 cards)
  async testSync(): Promise<{ expansions: number; cards: number }> {
    try {
      await this.updateSyncStatus('test', undefined, undefined, true);

      // Skip expansions for now since the endpoint is returning 404
      const expansions = 0;
      console.log('⚠️ Skipping expansions sync in test mode due to API endpoint issues');
      
      // Sync only 10 cards for testing
      const cards = await this.syncCardsLimited(10);

      await this.updateSyncStatus('test', cards, expansions, false);

      return { expansions, cards };
    } catch (error) {
      await this.updateSyncStatus('test', undefined, undefined, false, error.message);
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
    try {
      const { data, error } = await this.supabase
        .from('sync_status')
        .select('*')
        .single();
    
    if (error) {
        console.error(`Failed to get sync status: ${error.message}`);
        return null;
      }

      return data;
    } catch (error) {
      console.error(`Failed to get sync status: ${error.message}`);
      return null;
    }
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

    console.log('Environment variables check:');
    console.log('SCRYDEX_API_KEY:', scrydexApiKey ? 'SET' : 'MISSING');
    console.log('SCRYDEX_TEAM_ID:', scrydexTeamId ? 'SET' : 'MISSING');
    console.log('SUPABASE_URL:', supabaseUrl ? 'SET' : 'MISSING');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'SET' : 'MISSING');

    if (!scrydexApiKey || !scrydexTeamId || !supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create sync service
    const syncService = new ScrydexSyncService(supabase, {
      apiKey: scrydexApiKey,
      teamId: scrydexTeamId,
      baseUrl: 'https://api.scrydex.com'
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

      case 'comprehensive-sync':
        const comprehensiveResult = await syncService.comprehensiveSync();
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Comprehensive database sync completed',
            data: comprehensiveResult
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'resume-sync':
        const startPage = parseInt(url.searchParams.get('startPage') || '1');
        const resumeResult = await syncService.resumeSync(startPage);
        return new Response(
          JSON.stringify({
            success: true,
            message: `Resume sync completed from page ${startPage}`,
            data: resumeResult
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'test-sync':
        try {
          console.log('=== TEST SYNC STARTED (10 cards) ===');
          
          // Use the same sync service instance that was created above
          // Sync 10 cards
          console.log('Starting 10-card sync...');
          const result = await syncService.syncCardsLimited(10);
          
          console.log('Test sync completed:', result);
          
          return new Response(
            JSON.stringify({
              success: true,
              message: 'Test sync completed successfully',
              data: result
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          console.error('=== TEST SYNC FAILED ===');
          console.error('Error:', error);
          
          return new Response(
            JSON.stringify({
              success: false,
              error: error.message,
              message: 'Test sync failed'
            }),
            { 
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

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

      case 'expansions-sync':
        try {
          const expansions = await syncService.syncAllExpansions();
          return new Response(
            JSON.stringify({
              success: true,
              message: 'Expansions sync completed',
              data: { expansions }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          console.error('=== EXPANSIONS SYNC FAILED ===');
          console.error('Error:', error);
          
          return new Response(
            JSON.stringify({
              success: false,
              error: error.message,
              message: 'Expansions sync failed'
            }),
            { 
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

      case 'test-expansion-endpoint':
        try {
          const endpoint = searchParams.endpoint || '/pokemon/v1/expansions';
          const pageSize = searchParams.pageSize || '1000';
          
          console.log(`🔍 Testing expansion endpoint: ${endpoint} with pageSize: ${pageSize}`);
          
          const result = await syncService.makeRequest(endpoint, { pageSize });
          
          let expansionCount = 0;
          if (Array.isArray(result)) {
            expansionCount = result.length;
          } else if (result?.data && Array.isArray(result.data)) {
            expansionCount = result.data.length;
          }
          
          return new Response(
            JSON.stringify({
              success: true,
              message: 'Expansion endpoint test completed',
              data: {
                endpoint,
                pageSize,
                expansionCount,
                resultType: Array.isArray(result) ? 'array' : typeof result,
                hasData: !!result?.data,
                total: result?.total || result?.totalCount || 'unknown',
                sampleKeys: result?.data?.[0] ? Object.keys(result.data[0]) : 'no data'
              }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          console.error('=== EXPANSION ENDPOINT TEST FAILED ===');
          console.error('Error:', error);
          
          return new Response(
            JSON.stringify({
              success: false,
              error: error.message,
              message: 'Expansion endpoint test failed'
            }),
            { 
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

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
            error: 'Invalid action. Use: full-sync, comprehensive-sync, resume-sync, test-sync, pricing-sync, expansions-sync, test-expansion-endpoint, or status'
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