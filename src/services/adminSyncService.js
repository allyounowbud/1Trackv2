/**
 * Admin Sync Service
 * Manages all sync operations with real-time progress tracking
 * Provides unified interface for monitoring all API syncs
 */

import { supabase } from '../lib/supabaseClient';

class AdminSyncService {
  constructor() {
    this.activeSyncs = new Map();
    this.syncListeners = new Map();
  }

  /**
   * Register a progress listener for a sync operation
   * @param {string} syncId - Unique sync identifier
   * @param {Function} callback - Progress callback function
   */
  addProgressListener(syncId, callback) {
    if (!this.syncListeners.has(syncId)) {
      this.syncListeners.set(syncId, []);
    }
    this.syncListeners.get(syncId).push(callback);
  }

  /**
   * Remove a progress listener
   * @param {string} syncId - Sync identifier
   * @param {Function} callback - Callback to remove
   */
  removeProgressListener(syncId, callback) {
    const listeners = this.syncListeners.get(syncId);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit progress update to all listeners
   * @param {string} syncId - Sync identifier
   * @param {Object} progress - Progress data
   */
  emitProgress(syncId, progress) {
    const listeners = this.syncListeners.get(syncId) || [];
    listeners.forEach(callback => {
      try {
        callback(progress);
      } catch (error) {
        console.error('Error in progress callback:', error);
      }
    });
  }

  /**
   * Get active sync status
   * @param {string} syncId - Sync identifier
   * @returns {Object|null} Sync status or null if not active
   */
  getActiveSyncStatus(syncId) {
    return this.activeSyncs.get(syncId) || null;
  }

  /**
   * Check if a sync is currently running
   * @param {string} syncId - Sync identifier
   * @returns {boolean} True if sync is active
   */
  isSyncActive(syncId) {
    return this.activeSyncs.has(syncId);
  }

  /**
   * Start TCGCSV sealed products sync
   * @param {string} mode - 'test', 'recent', or 'full'
   * @returns {Promise<Object>} Sync result
   */
  async startTcgcsvSync(mode = 'recent') {
    const syncId = 'tcgcsv-sealed';
    
    if (this.isSyncActive(syncId)) {
      return { error: 'Sync already in progress' };
    }

    // Mark sync as active
    this.activeSyncs.set(syncId, {
      startedAt: new Date(),
      mode,
      status: 'initializing',
      progress: 0
    });

    // Emit initial progress
    this.emitProgress(syncId, {
      status: 'initializing',
      progress: 0,
      message: 'Initializing TCGCSV sync...'
    });

    try {
      // This will be called via terminal command
      // For now, simulate the sync initiation
      return {
        success: true,
        message: `TCGCSV ${mode} sync initiated. Run: node sync-tcgcsv-sealed-products.js --${mode}`,
        mode,
        syncId
      };
    } finally {
      // Sync will be marked as complete by the actual sync script
      // For now, mark as pending external execution
      this.activeSyncs.set(syncId, {
        startedAt: new Date(),
        mode,
        status: 'pending_external',
        progress: 0,
        message: 'Waiting for terminal command execution'
      });
    }
  }

  /**
   * Start Scrydex cards sync
   * @returns {Promise<Object>} Sync result
   */
  async startScrydexCardsSync() {
    const syncId = 'scrydex-cards';
    
    if (this.isSyncActive(syncId)) {
      return { error: 'Sync already in progress' };
    }

    this.activeSyncs.set(syncId, {
      startedAt: new Date(),
      status: 'running',
      progress: 0
    });

    this.emitProgress(syncId, {
      status: 'running',
      progress: 0,
      message: 'Syncing Scrydex cards...'
    });

    // Scrydex sync would be triggered here
    // For now, return a message
    return {
      success: true,
      message: 'Scrydex cards sync functionality will be integrated here',
      syncId
    };
  }

  /**
   * Start Scrydex expansions sync
   * @returns {Promise<Object>} Sync result
   */
  async startScrydexExpansionsSync() {
    const syncId = 'scrydex-expansions';
    
    if (this.isSyncActive(syncId)) {
      return { error: 'Sync already in progress' };
    }

    this.activeSyncs.set(syncId, {
      startedAt: new Date(),
      status: 'running',
      progress: 0
    });

    this.emitProgress(syncId, {
      status: 'running',
      progress: 0,
      message: 'Syncing Scrydex expansions...'
    });

    return {
      success: true,
      message: 'Scrydex expansions sync functionality will be integrated here',
      syncId
    };
  }

  /**
   * Stop a running sync
   * @param {string} syncId - Sync identifier
   * @returns {boolean} True if stopped successfully
   */
  stopSync(syncId) {
    if (this.activeSyncs.has(syncId)) {
      this.activeSyncs.delete(syncId);
      this.emitProgress(syncId, {
        status: 'stopped',
        progress: 0,
        message: 'Sync stopped by user'
      });
      return true;
    }
    return false;
  }

  /**
   * Get all API data mappings
   * Returns which database tables are linked to which APIs
   * @returns {Object} API data mappings
   */
  getApiDataMappings() {
    return {
      scrydex: {
        name: 'Scrydex API',
        description: 'Pokemon TCG card data and expansions',
        tables: [
          {
            name: 'pokemon_cards',
            description: 'Individual Pokemon cards',
            fields: ['id', 'name', 'supertype', 'types', 'hp', 'rarity', 'expansion_id', 'image_url', 'abilities', 'attacks'],
            syncType: 'incremental',
            lastSyncField: 'updated_at'
          },
          {
            name: 'pokemon_expansions',
            description: 'Pokemon expansion sets',
            fields: ['id', 'name', 'series', 'code', 'total', 'release_date', 'logo', 'language_code'],
            syncType: 'full',
            lastSyncField: 'updated_at'
          }
        ],
        endpoints: [
          { path: '/cards', purpose: 'Card data' },
          { path: '/expansions', purpose: 'Expansion sets' }
        ]
      },
      tcgcsv: {
        name: 'TCGCSV API',
        description: 'Sealed products and pricing from TCGplayer',
        tables: [
          {
            name: 'pokemon_sealed_products',
            description: 'Sealed products (booster boxes, ETBs, tins)',
            fields: ['product_id', 'name', 'tcgcsv_group_id', 'market_price', 'low_price', 'high_price', 'image_url', 'expansion_id'],
            syncType: 'full',
            lastSyncField: 'last_synced_at'
          },
          {
            name: 'pokemon_expansions.tcgcsv_group_id',
            description: 'TCGCSV group ID mapping',
            fields: ['tcgcsv_group_id'],
            syncType: 'manual',
            lastSyncField: null
          }
        ],
        endpoints: [
          { path: '/tcgplayer/3/groups', purpose: 'Expansion groups' },
          { path: '/tcgplayer/3/{groupId}/products', purpose: 'Product data' },
          { path: '/tcgplayer/3/{groupId}/prices', purpose: 'Pricing data' }
        ]
      },
      supabase: {
        name: 'Supabase',
        description: 'Database and authentication platform',
        tables: [
          {
            name: 'All Tables',
            description: 'Database hosting and real-time subscriptions',
            fields: [],
            syncType: 'real-time',
            lastSyncField: null
          }
        ],
        endpoints: [
          { path: '/rest/v1/*', purpose: 'REST API' },
          { path: '/auth/v1/*', purpose: 'Authentication' },
          { path: '/realtime/v1/*', purpose: 'Real-time subscriptions' }
        ]
      }
    };
  }

  /**
   * Get sync statistics
   * @returns {Promise<Object>} Statistics for all syncs
   */
  async getSyncStatistics() {
    try {
      const stats = {
        tcgcsv: { status: 'unknown', lastSync: null, totalRecords: 0 },
        scrydex: { status: 'unknown', lastSync: null, totalRecords: 0 },
        database: { totalTables: 0, totalRecords: 0 }
      };

      // Get TCGCSV stats
      const { data: tcgcsvSync } = await supabase
        .from('pokemon_sealed_products_sync_status')
        .select('*')
        .eq('id', 1)
        .single();

      if (tcgcsvSync) {
        stats.tcgcsv = {
          status: tcgcsvSync.sync_status,
          lastSync: tcgcsvSync.last_full_sync || tcgcsvSync.last_incremental_sync,
          totalRecords: tcgcsvSync.total_products
        };
      }

      // Get Scrydex stats
      const { data: scrydexSync } = await supabase
        .from('sync_status')
        .select('*')
        .single();

      if (scrydexSync) {
        stats.scrydex = {
          status: 'completed',
          lastSync: scrydexSync.cards || scrydexSync.expansions,
          totalRecords: 0 // Would need to count
        };
      }

      return stats;
    } catch (error) {
      console.error('Error fetching sync statistics:', error);
      return null;
    }
  }
}

// Create and export singleton instance
const adminSyncService = new AdminSyncService();
export default adminSyncService;
