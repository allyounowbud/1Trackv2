// Scrydex Sync Service
// Handles triggering and monitoring the Scrydex database sync

import { supabase } from '../lib/supabaseClient';

class ScrydexSyncService {
  constructor() {
    this.syncInProgress = false;
  }

  // Trigger a full sync of the Scrydex database
  async triggerSync() {
    if (this.syncInProgress) {
      throw new Error('Sync already in progress');
    }

    try {
      this.syncInProgress = true;

      // Call the Supabase Edge Function to trigger sync
      const { data, error } = await supabase.functions.invoke('scrydex-sync?action=full-sync', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (error) {
        throw error;
      }

      return data;

    } catch (error) {
      console.error('❌ Failed to trigger sync:', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  // Trigger comprehensive database sync
  async triggerComprehensiveSync() {
    if (this.syncInProgress) {
      throw new Error('Sync already in progress');
    }

    try {
      this.syncInProgress = true;

      // Call the Supabase Edge Function to trigger comprehensive sync
      const { data, error } = await supabase.functions.invoke('scrydex-sync?action=comprehensive-sync', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (error) {
        throw error;
      }

      return data;

    } catch (error) {
      console.error('❌ Failed to trigger comprehensive sync:', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  // Trigger test sync (10 cards only)
  async triggerTestSync() {
    if (this.syncInProgress) {
      throw new Error('Sync already in progress');
    }

    try {
      this.syncInProgress = true;

      // Call the Supabase Edge Function to trigger test sync
      const { data, error } = await supabase.functions.invoke('scrydex-sync?action=test-sync', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (error) {
        throw error;
      }

      return data;

    } catch (error) {
      console.error('❌ Failed to trigger test sync:', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  // Get sync status
  async getSyncStatus() {
    try {
      const { data, error } = await supabase
        .from('sync_status')
        .select('*')
        .single();

      if (error) {
        console.error('Failed to get sync status:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to get sync status:', error);
      return null;
    }
  }

  // Check if sync is needed (based on last sync time)
  async isSyncNeeded() {
    try {
      const status = await this.getSyncStatus();
      if (!status) {
        return true; // No sync status means we need to sync
      }

      const lastSync = new Date(status.cards || status.expansions || 0);
      const now = new Date();
      const hoursSinceSync = (now - lastSync) / (1000 * 60 * 60);

      // Sync if it's been more than 24 hours
      return hoursSinceSync > 24;
    } catch (error) {
      console.error('Failed to check sync status:', error);
      return true; // Default to needing sync if we can't check
    }
  }

  // Get database statistics
  async getDatabaseStats() {
    try {
      const [cardsResult, expansionsResult] = await Promise.all([
        supabase
          .from('pokemon_cards')
          .select('*', { count: 'exact', head: true }),
        supabase
          .from('pokemon_expansions')
          .select('*', { count: 'exact', head: true })
      ]);

      return {
        cards: cardsResult.count || 0,
        expansions: expansionsResult.count || 0,
        lastSync: await this.getSyncStatus()
      };
    } catch (error) {
      console.error('Failed to get database stats:', error);
      return {
        cards: 0,
        expansions: 0,
        lastSync: null
      };
    }
  }

  // Monitor sync progress (polling)
  async monitorSync(intervalMs = 5000) {
    return new Promise((resolve, reject) => {
      const interval = setInterval(async () => {
        try {
          const status = await this.getSyncStatus();
          if (status && status.cards && status.expansions) {
            clearInterval(interval);
            resolve(status);
          }
        } catch (error) {
          clearInterval(interval);
          reject(error);
        }
      }, intervalMs);

      // Timeout after 10 minutes
      setTimeout(() => {
        clearInterval(interval);
        reject(new Error('Sync monitoring timeout'));
      }, 10 * 60 * 1000);
    });
  }

  // Auto-sync if needed
  async autoSyncIfNeeded() {
    try {
      const needsSync = await this.isSyncNeeded();
      if (needsSync) {
        await this.triggerSync();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Auto-sync failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export default new ScrydexSyncService();
