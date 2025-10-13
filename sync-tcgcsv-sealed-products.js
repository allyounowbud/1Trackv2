/**
 * TCGCSV Sealed Products Sync Script
 * Imports all sealed Pokemon products from TCGCSV into local database
 * 
 * Usage:
 *   node sync-tcgcsv-sealed-products.js [options]
 * 
 * Options:
 *   --limit=10    - Limit number of groups to sync (for testing)
 *   --full        - Run full sync of all groups
 *   --recent      - Sync only recent 20 groups (default)
 */

import { createClient } from '@supabase/supabase-js';

// Use the same hardcoded credentials as the main app
const supabaseUrl = 'https://hcpubmtohdnlmcjixbnl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjcHVibXRvaGRubG1jaml4Ym5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0ODIzOTYsImV4cCI6MjA3NDA1ODM5Nn0.Lh0ndJZe34B_2EoIBR0VDTG8GJ7dzB4M5OnIICz_PkA';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});

// TCGCSV configuration
const TCGCSV_BASE_URL = 'https://tcgcsv.com';
const POKEMON_CATEGORY_ID = 3;

/**
 * Determine if a product is sealed based on its extendedData
 * PRIMARY METHOD: Sealed products do NOT have a "Number" field in extendedData
 * Individual cards ALWAYS have a "Number" field (e.g., "001/162")
 * 
 * This is the most reliable method per user confirmation:
 * - Mega Evolution has 225 total products
 * - 32 are sealed (no Number field)
 * - 193 are singles (have Number field)
 */
function isSealedProduct(product) {
  // PRIMARY METHOD: Check extendedData for Number field
  // Sealed products don't have card numbers, singles do
  if (Array.isArray(product.extendedData)) {
    const hasNumber = product.extendedData.some(item => 
      item.name === 'Number' && item.value
    );
    
    // If it has a Number field, it's a single card, not sealed
    if (hasNumber) {
      return false;
    }
  }

  // SECONDARY CHECK: Exclude code cards explicitly
  // Code cards don't have numbers but are still not physical sealed products
  const name = (product.name || '').toLowerCase();
  const cleanName = (product.cleanName || '').toLowerCase();
  
  const excludeKeywords = [
    'code card', 'digital', 'online code'
  ];

  const isExcluded = excludeKeywords.some(keyword =>
    name.includes(keyword) || cleanName.includes(keyword)
  );

  // If no Number field and not a code card, it's sealed
  return !isExcluded;
}

/**
 * Extract useful data from extended_data array
 */
function extractExtendedData(extendedData) {
  if (!Array.isArray(extendedData)) return {};

  const result = {};
  
  extendedData.forEach(item => {
    if (item.name === 'CardText') {
      result.cardText = item.value;
    } else if (item.name === 'UPC') {
      result.upc = item.value;
    } else if (item.name === 'Rarity') {
      result.rarity = item.value;
    }
  });

  return result;
}

/**
 * Fetch all Pokemon groups from TCGCSV
 */
async function fetchGroups() {
  const url = `${TCGCSV_BASE_URL}/tcgplayer/${POKEMON_CATEGORY_ID}/groups`;
  console.log(`📋 Fetching groups from: ${url}`);
  
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': '1Track-Pokemon-Sync-Script'
    }
  });

  if (!response.ok) {
    throw new Error(`TCGCSV API error: ${response.status}`);
  }

  const data = await response.json();
  console.log(`✅ Found ${data.totalItems} groups\n`);
  
  return data.results || [];
}

/**
 * Fetch products for a group
 */
async function fetchProducts(groupId) {
  const url = `${TCGCSV_BASE_URL}/tcgplayer/${POKEMON_CATEGORY_ID}/${groupId}/products`;
  
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': '1Track-Pokemon-Sync-Script'
    }
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  return data.results || [];
}

/**
 * Fetch prices for a group
 */
async function fetchPrices(groupId) {
  const url = `${TCGCSV_BASE_URL}/tcgplayer/${POKEMON_CATEGORY_ID}/${groupId}/prices`;
  
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': '1Track-Pokemon-Sync-Script'
    }
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  return data.results || [];
}

/**
 * Get our expansion ID from TCGCSV group ID
 */
async function getExpansionIdByGroupId(groupId) {
  const { data, error } = await supabase
    .from('pokemon_expansions')
    .select('id, name')
    .eq('tcgcsv_group_id', groupId)
    .single();

  if (error || !data) return null;
  return data.id;
}

/**
 * Sync a single group
 */
async function syncGroup(group) {
  const { groupId, name } = group;
  console.log(`📦 [${groupId}] ${name}`);

  try {
    // Fetch products and prices in parallel
    const [products, prices] = await Promise.all([
      fetchProducts(groupId),
      fetchPrices(groupId)
    ]);

    console.log(`   ├─ Total products: ${products.length}`);

    // Filter for sealed products
    const sealedProducts = products.filter(p => isSealedProduct(p));
    console.log(`   ├─ Sealed products: ${sealedProducts.length}`);

    if (sealedProducts.length === 0) {
      console.log(`   └─ ⏭️  No sealed products, skipping\n`);
      return { groupId, name, imported: 0, skipped: products.length };
    }

    // Create price lookup
    const priceMap = new Map();
    prices.forEach(price => {
      priceMap.set(price.productId, price);
    });

    // Get our expansion ID
    const expansionId = await getExpansionIdByGroupId(groupId);

    // Prepare data for insertion
    const productsToInsert = sealedProducts.map(product => {
      const pricing = priceMap.get(product.productId) || {};
      const extendedData = extractExtendedData(product.extendedData);

      return {
        product_id: product.productId,
        tcgcsv_group_id: groupId,
        name: product.name,
        clean_name: product.cleanName,
        image_url: product.imageUrl,
        url: product.url,
        product_type: 'Sealed Product',
        market_price: pricing.marketPrice || null,
        low_price: pricing.lowPrice || null,
        mid_price: pricing.midPrice || null,
        high_price: pricing.highPrice || null,
        direct_low_price: pricing.directLowPrice || null,
        sub_type_name: pricing.subTypeName || 'Normal',
        category_id: product.categoryId || 3,
        image_count: product.imageCount || 0,
        modified_on: product.modifiedOn || null,
        is_presale: product.presaleInfo?.isPresale || false,
        released_on: product.presaleInfo?.releasedOn || null,
        presale_note: product.presaleInfo?.note || null,
        extended_data: product.extendedData || null,
        card_text: extendedData.cardText || null,
        upc: extendedData.upc || null,
        expansion_id: expansionId,
        expansion_name: name,
        last_synced_at: new Date().toISOString()
      };
    });

    // Insert into database
    const { error } = await supabase
      .from('pokemon_sealed_products')
      .upsert(productsToInsert, { 
        onConflict: 'product_id',
        ignoreDuplicates: false 
      });

    if (error) {
      console.error(`   └─ ❌ Error:`, error.message);
      return { groupId, name, imported: 0, error: error.message };
    }

    console.log(`   └─ ✅ Imported ${productsToInsert.length} products\n`);
    
    return {
      groupId,
      name,
      imported: productsToInsert.length,
      skipped: products.length - sealedProducts.length
    };

  } catch (error) {
    console.error(`   └─ ❌ Error:`, error.message, '\n');
    return { groupId, name, imported: 0, error: error.message };
  }
}

/**
 * Main sync function
 */
async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find(arg => arg.startsWith('--limit='));
  const isFull = args.includes('--full');
  const isRecent = args.includes('--recent') || !isFull;

  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;

  console.log('\n' + '='.repeat(60));
  console.log('🚀 TCGCSV SEALED PRODUCTS SYNC');
  console.log('='.repeat(60));
  console.log(`📅 ${new Date().toISOString()}`);
  console.log(`🎯 Mode: ${isFull ? 'FULL SYNC' : isRecent ? 'RECENT (20 groups)' : `LIMITED (${limit} groups)`}`);
  console.log('='.repeat(60) + '\n');

  const startTime = Date.now();

  try {
    // Update sync status
    await supabase
      .from('pokemon_sealed_products_sync_status')
      .update({ 
        sync_status: 'in_progress',
        sync_error: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', 1);

    // Fetch all groups
    const allGroups = await fetchGroups();
    
    // Determine which groups to sync
    let groupsToSync = allGroups;
    if (limit) {
      groupsToSync = allGroups.slice(0, limit);
    } else if (isRecent) {
      groupsToSync = allGroups.slice(0, 20);
    }

    console.log(`📊 Syncing ${groupsToSync.length} of ${allGroups.length} total groups\n`);

    // Sync all groups
    const results = [];
    let totalImported = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (let i = 0; i < groupsToSync.length; i++) {
      const group = groupsToSync[i];
      console.log(`[${i + 1}/${groupsToSync.length}]`);
      
      const result = await syncGroup(group);
      results.push(result);
      
      totalImported += result.imported || 0;
      totalSkipped += result.skipped || 0;
      if (result.error) totalErrors++;

      // Small delay to be nice to the API
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Update sync status
    await supabase
      .from('pokemon_sealed_products_sync_status')
      .update({ 
        sync_status: 'completed',
        last_full_sync: isFull ? new Date().toISOString() : undefined,
        last_incremental_sync: new Date().toISOString(),
        total_products: totalImported,
        total_groups_synced: groupsToSync.length,
        sync_error: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', 1);

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ SYNC COMPLETE!');
    console.log('='.repeat(60));
    console.log(`📊 Groups synced: ${groupsToSync.length}`);
    console.log(`📦 Sealed products imported: ${totalImported}`);
    console.log(`⏭️  Products skipped (not sealed): ${totalSkipped}`);
    console.log(`❌ Errors: ${totalErrors}`);
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`📈 Rate: ${(groupsToSync.length / parseFloat(duration)).toFixed(2)} groups/sec`);
    console.log('='.repeat(60) + '\n');

    if (totalErrors > 0) {
      console.log('❌ Failed groups:');
      results.filter(r => r.error).forEach(r => {
        console.log(`   - [${r.groupId}] ${r.name}: ${r.error}`);
      });
      console.log('');
    }

    console.log('✨ Database is now populated with TCGCSV sealed products!');
    console.log('🔄 Run this script daily to keep data fresh (TCGCSV updates at 20:00 UTC)\n');

  } catch (error) {
    console.error('\n❌ Sync failed:', error);

    // Update sync status
    await supabase
      .from('pokemon_sealed_products_sync_status')
      .update({ 
        sync_status: 'failed',
        sync_error: error.message,
        updated_at: new Date().toISOString()
      })
      .eq('id', 1);

    process.exit(1);
  }
}

// Run the sync
main().catch(console.error);
