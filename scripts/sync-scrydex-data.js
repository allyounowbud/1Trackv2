#!/usr/bin/env node

/**
 * Sync Scrydex API data to Supabase tables
 * This script fetches data from Scrydex API and stores it in local Supabase tables
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   VITE_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Set' : '❌ Missing');
  console.error('\n📋 Please set these in your .env.local file or environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Scrydex API configuration
const SCRYDEX_API_KEY = '3afbdca9aaae128736728a33c52b734abda3278545f9406c02c9c91ab0e728a7';
const SCRYDEX_TEAM_ID = 'onetracking';
const SCRYDEX_BASE_URL = 'https://api.scrydex.com/v1';

/**
 * Make API request to Scrydex
 */
async function makeScrydexRequest(endpoint, params = {}) {
  const url = new URL(`${SCRYDEX_BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  console.log(`🔍 Fetching: ${url.toString()}`);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'X-Api-Key': SCRYDEX_API_KEY,
      'X-Team-ID': SCRYDEX_TEAM_ID,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Scrydex API error ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Sync expansions from Scrydex to Supabase
 */
async function syncExpansions() {
  console.log('\n🔄 Syncing expansions...');
  
  try {
    // Fetch expansions from Scrydex
    const expansionsData = await makeScrydexRequest('/pokemon/expansions', {
      select: 'id,name,series,code,total,printed_total,language_code,release_date,logo_url,symbol_url',
      orderBy: 'release_date desc',
      limit: 100
    });

    const expansions = Array.isArray(expansionsData) ? expansionsData : expansionsData.data || [];

    if (expansions.length === 0) {
      console.log('⚠️ No expansions found');
      return;
    }

    console.log(`📦 Found ${expansions.length} expansions`);

    // Transform data for Supabase
    const transformedExpansions = expansions.map(expansion => ({
      id: expansion.id,
      name: expansion.name,
      series: expansion.series,
      code: expansion.code,
      total: expansion.total,
      printed_total: expansion.printed_total,
      language_code: expansion.language_code || 'en',
      release_date: expansion.release_date,
      logo_url: expansion.logo_url,
      symbol_url: expansion.symbol_url,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    // Upsert expansions to Supabase
    const { data, error } = await supabase
      .from('pokemon_expansions')
      .upsert(transformedExpansions, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      });

    if (error) {
      throw error;
    }

    console.log(`✅ Synced ${transformedExpansions.length} expansions to Supabase`);

    // Update sync status
    await supabase
      .from('sync_status')
      .upsert({
        table_name: 'pokemon_expansions',
        last_sync: new Date().toISOString(),
        record_count: transformedExpansions.length,
        status: 'completed'
      }, { onConflict: 'table_name' });

  } catch (error) {
    console.error('❌ Error syncing expansions:', error.message);
    throw error;
  }
}

/**
 * Sync cards from Scrydex to Supabase
 */
async function syncCards() {
  console.log('\n🔄 Syncing cards...');
  
  try {
    // First, get expansions to sync cards for
    const { data: expansions, error: expansionsError } = await supabase
      .from('pokemon_expansions')
      .select('id, code, name')
      .limit(10); // Start with first 10 expansions

    if (expansionsError) {
      throw expansionsError;
    }

    if (!expansions || expansions.length === 0) {
      console.log('⚠️ No expansions found. Please sync expansions first.');
      return;
    }

    console.log(`📦 Syncing cards for ${expansions.length} expansions`);

    let totalCards = 0;

    for (const expansion of expansions) {
      try {
        console.log(`🔍 Fetching cards for expansion: ${expansion.name} (${expansion.code})`);
        
        // Fetch cards for this expansion
        const cardsData = await makeScrydexRequest('/pokemon/cards', {
          select: 'id,name,number,rarity,images,expansion,types,subtypes,supertype,hp,abilities,attacks,weaknesses,resistances,retreat_cost,converted_retreat_cost,artist,flavor_text,regulation_mark,language,language_code',
          expansion: expansion.code,
          limit: 100
        });

        const cards = Array.isArray(cardsData) ? cardsData : cardsData.data || [];

        if (cards.length === 0) {
          console.log(`⚠️ No cards found for expansion ${expansion.name}`);
          continue;
        }

        console.log(`📦 Found ${cards.length} cards for ${expansion.name}`);

        // Transform data for Supabase
        const transformedCards = cards.map(card => ({
          id: card.id,
          name: card.name,
          number: card.number,
          rarity: card.rarity,
          image_url: card.images?.large || card.images?.small || null,
          expansion_id: expansion.id,
          expansion_name: expansion.name,
          expansion_code: expansion.code,
          types: card.types || [],
          subtypes: card.subtypes || [],
          supertype: card.supertype,
          hp: card.hp,
          abilities: card.abilities || [],
          attacks: card.attacks || [],
          weaknesses: card.weaknesses || [],
          resistances: card.resistances || [],
          retreat_cost: card.retreat_cost,
          converted_retreat_cost: card.converted_retreat_cost,
          artist: card.artist,
          flavor_text: card.flavor_text,
          regulation_mark: card.regulation_mark,
          language: card.language || 'en',
          language_code: card.language_code || 'en',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

        // Upsert cards to Supabase
        const { error: cardsError } = await supabase
          .from('pokemon_cards')
          .upsert(transformedCards, { 
            onConflict: 'id',
            ignoreDuplicates: false 
          });

        if (cardsError) {
          throw cardsError;
        }

        totalCards += transformedCards.length;
        console.log(`✅ Synced ${transformedCards.length} cards for ${expansion.name}`);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ Error syncing cards for expansion ${expansion.name}:`, error.message);
        // Continue with next expansion
      }
    }

    console.log(`✅ Total cards synced: ${totalCards}`);

    // Update sync status
    await supabase
      .from('sync_status')
      .upsert({
        table_name: 'pokemon_cards',
        last_sync: new Date().toISOString(),
        record_count: totalCards,
        status: 'completed'
      }, { onConflict: 'table_name' });

  } catch (error) {
    console.error('❌ Error syncing cards:', error.message);
    throw error;
  }
}

/**
 * Check if tables exist
 */
async function checkTables() {
  console.log('🔍 Checking if tables exist...');
  
  const tables = ['pokemon_expansions', 'pokemon_cards', 'sync_status'];
  
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);
    
    if (error) {
      console.error(`❌ Table ${table} does not exist or is not accessible`);
      console.error(`   Error: ${error.message}`);
      return false;
    }
    
    console.log(`✅ Table ${table} exists`);
  }
  
  return true;
}

/**
 * Main sync function
 */
async function main() {
  console.log('🚀 Starting Scrydex data sync...');
  console.log(`📊 Supabase URL: ${supabaseUrl}`);
  console.log(`🔑 API Key: ${SCRYDEX_API_KEY.substring(0, 8)}...`);
  console.log(`👥 Team ID: ${SCRYDEX_TEAM_ID}`);

  try {
    // Check if tables exist
    const tablesExist = await checkTables();
    if (!tablesExist) {
      console.error('\n❌ Required tables do not exist. Please run the table creation script first.');
      console.error('   Run: npm run setup-scrydex');
      process.exit(1);
    }

    // Sync expansions first
    await syncExpansions();

    // Then sync cards
    await syncCards();

    console.log('\n🎉 Data sync completed successfully!');
    console.log('📊 You can now use the search functionality with local data.');

  } catch (error) {
    console.error('\n❌ Sync failed:', error.message);
    process.exit(1);
  }
}

// Run the sync
main();


