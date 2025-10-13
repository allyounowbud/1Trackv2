/**
 * TCGCSV Sync Service
 * Imports and syncs sealed Pokemon products from TCGCSV into local database
 * This eliminates the need for runtime API calls
 */

import { supabase } from '../lib/supabaseClient';

class TcgcsvSyncService {
  constructor() {
    this.baseUrl = 'https://tcgcsv.com';
    this.categoryId = 3; // Pokemon category ID
    this.isSyncing = false;
  }

  /**
   * Determine if a product is a sealed product based on its properties
   * Primary method: Sealed products do NOT have an extNumber field
   * Singles/individual cards ALWAYS have an extNumber (e.g., "001/162")
   * @param {Object} product - TCGCSV product object
   * @returns {boolean} True if product is sealed
   */
  isSealedProduct(product) {
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
   * Extract extended data fields from product
   * @param {Array} extendedData - Extended data array from TCGCSV
   * @returns {Object} Extracted fields
   */
  extractExtendedData(extendedData) {
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
   * Fetch all groups (expansions) from TCGCSV
   * @returns {Promise<Array>} Array of groups
   */
  async fetchGroups() {
    try {
      const url = `${this.baseUrl}/tcgplayer/${this.categoryId}/groups`;
      console.log(`📋 Fetching Pokemon groups from TCGCSV...`);
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': '1Track-Pokemon-Tracker'
        }
      });

      if (!response.ok) {
        throw new Error(`TCGCSV API error: ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ Found ${data.totalItems} Pokemon groups`);
      
      return data.results || [];
    } catch (error) {
      console.error('❌ Error fetching TCGCSV groups:', error);
      throw error;
    }
  }

  /**
   * Fetch products for a specific group
   * @param {number} groupId - TCGCSV group ID
   * @returns {Promise<Array>} Array of products
   */
  async fetchProducts(groupId) {
    try {
      const url = `${this.baseUrl}/tcgplayer/${this.categoryId}/${groupId}/products`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': '1Track-Pokemon-Tracker'
        }
      });

      if (!response.ok) {
        throw new Error(`TCGCSV API error: ${response.status}`);
      }

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error(`❌ Error fetching products for group ${groupId}:`, error);
      return [];
    }
  }

  /**
   * Fetch prices for a specific group
   * @param {number} groupId - TCGCSV group ID
   * @returns {Promise<Array>} Array of prices
   */
  async fetchPrices(groupId) {
    try {
      const url = `${this.baseUrl}/tcgplayer/${this.categoryId}/${groupId}/prices`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': '1Track-Pokemon-Tracker'
        }
      });

      if (!response.ok) {
        throw new Error(`TCGCSV API error: ${response.status}`);
      }

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error(`❌ Error fetching prices for group ${groupId}:`, error);
      return [];
    }
  }

  /**
   * Get expansion ID from database by TCGCSV group ID
   * @param {number} groupId - TCGCSV group ID
   * @returns {Promise<string|null>} Our expansion ID
   */
  async getExpansionIdByGroupId(groupId) {
    try {
      const { data, error } = await supabase
        .from('pokemon_expansions')
        .select('id, name')
        .eq('tcgcsv_group_id', groupId)
        .single();

      if (error || !data) return null;
      return data.id;
    } catch (error) {
      return null;
    }
  }

  /**
   * Sync products for a single group
   * @param {Object} group - TCGCSV group object
   * @returns {Promise<Object>} Sync results
   */
  async syncGroup(group) {
    const { groupId, name } = group;
    console.log(`\n📦 Syncing group ${groupId}: ${name}`);

    try {
      // Fetch products and prices
      const [products, prices] = await Promise.all([
        this.fetchProducts(groupId),
        this.fetchPrices(groupId)
      ]);

      console.log(`   Found ${products.length} total products`);

      // Filter for sealed products only
      const sealedProducts = products.filter(p => this.isSealedProduct(p));
      console.log(`   Filtered to ${sealedProducts.length} sealed products`);

      if (sealedProducts.length === 0) {
        return { groupId, name, imported: 0, skipped: products.length };
      }

      // Create a price lookup map
      const priceMap = new Map();
      prices.forEach(price => {
        priceMap.set(price.productId, price);
      });

      // Get our expansion ID
      const expansionId = await this.getExpansionIdByGroupId(groupId);

      // Prepare products for database insertion
      const productsToInsert = sealedProducts.map(product => {
        const pricing = priceMap.get(product.productId) || {};
        const extendedData = this.extractExtendedData(product.extendedData);

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
          extended_data: product.extendedData ? JSON.stringify(product.extendedData) : null,
          card_text: extendedData.cardText || null,
          upc: extendedData.upc || null,
          expansion_id: expansionId,
          expansion_name: name,
          last_synced_at: new Date().toISOString()
        };
      });

      // Insert into database (upsert to handle updates)
      const { data, error } = await supabase
        .from('pokemon_sealed_products')
        .upsert(productsToInsert, { 
          onConflict: 'product_id',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error(`   ❌ Error inserting products:`, error);
        return { groupId, name, imported: 0, error: error.message };
      }

      console.log(`   ✅ Imported ${productsToInsert.length} sealed products`);
      
      return {
        groupId,
        name,
        imported: productsToInsert.length,
        skipped: products.length - sealedProducts.length
      };

    } catch (error) {
      console.error(`   ❌ Error syncing group ${groupId}:`, error);
      return { groupId, name, imported: 0, error: error.message };
    }
  }

  /**
   * Sync all sealed products from TCGCSV
   * @param {Object} options - Sync options
   * @returns {Promise<Object>} Sync summary
   */
  async syncAllSealedProducts(options = {}) {
    if (this.isSyncing) {
      console.log('⚠️ Sync already in progress');
      return { error: 'Sync already in progress' };
    }

    this.isSyncing = true;
    const startTime = Date.now();

    const {
      groupLimit = null, // Limit number of groups to sync (for testing)
      onProgress = null  // Callback for progress updates
    } = options;

    console.log('\n🚀 Starting TCGCSV sealed products sync...\n');

    try {
      // Update sync status to in_progress
      await supabase
        .from('pokemon_sealed_products_sync_status')
        .update({ 
          sync_status: 'in_progress',
          sync_error: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', 1);

      // Fetch all groups
      const groups = await this.fetchGroups();
      const groupsToSync = groupLimit ? groups.slice(0, groupLimit) : groups;

      console.log(`📊 Syncing ${groupsToSync.length} groups...\n`);

      const results = [];
      let totalImported = 0;
      let totalSkipped = 0;
      let totalErrors = 0;

      // Sync each group
      for (let i = 0; i < groupsToSync.length; i++) {
        const group = groupsToSync[i];
        const result = await this.syncGroup(group);
        
        results.push(result);
        totalImported += result.imported || 0;
        totalSkipped += result.skipped || 0;
        if (result.error) totalErrors++;

        // Progress callback
        if (onProgress) {
          onProgress({
            current: i + 1,
            total: groupsToSync.length,
            currentGroup: group.name,
            totalImported,
            totalSkipped,
            totalErrors
          });
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      // Update sync status to completed
      await supabase
        .from('pokemon_sealed_products_sync_status')
        .update({ 
          sync_status: 'completed',
          last_full_sync: new Date().toISOString(),
          total_products: totalImported,
          total_groups_synced: groupsToSync.length,
          sync_error: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', 1);

      const summary = {
        success: true,
        duration: `${duration}s`,
        groupsSynced: groupsToSync.length,
        productsImported: totalImported,
        productsSkipped: totalSkipped,
        errors: totalErrors,
        results
      };

      console.log('\n' + '='.repeat(60));
      console.log('✅ SYNC COMPLETE!');
      console.log('='.repeat(60));
      console.log(`📊 Groups synced: ${summary.groupsSynced}`);
      console.log(`📦 Sealed products imported: ${summary.productsImported}`);
      console.log(`⏭️  Products skipped: ${summary.productsSkipped}`);
      console.log(`❌ Errors: ${summary.errors}`);
      console.log(`⏱️  Duration: ${summary.duration}`);
      console.log('='.repeat(60) + '\n');

      return summary;

    } catch (error) {
      console.error('\n❌ Sync failed:', error);

      // Update sync status to failed
      await supabase
        .from('pokemon_sealed_products_sync_status')
        .update({ 
          sync_status: 'failed',
          sync_error: error.message,
          updated_at: new Date().toISOString()
        })
        .eq('id', 1);

      return {
        success: false,
        error: error.message
      };

    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Get sync status
   * @returns {Promise<Object>} Sync status
   */
  async getSyncStatus() {
    const { data, error } = await supabase
      .from('pokemon_sealed_products_sync_status')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) {
      console.error('Error fetching sync status:', error);
      return null;
    }

    return data;
  }
}

// Create and export singleton instance
const tcgcsvSyncService = new TcgcsvSyncService();
export default tcgcsvSyncService;
