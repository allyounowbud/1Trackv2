import React, { useState, useEffect } from 'react';
import { useAdmin } from '../hooks/useAdmin';
import scrydexSyncService from '../services/scrydexSyncService';

const ScrydexSyncSettings = () => {
  const { isAdmin, isLoading: adminLoading } = useAdmin();
  const [syncStatus, setSyncStatus] = useState(null);
  const [databaseStats, setDatabaseStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Only load data if user is admin
    if (isAdmin && !adminLoading) {
      loadData();
    }
  }, [isAdmin, adminLoading]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [status, stats] = await Promise.all([
        scrydexSyncService.getSyncStatus(),
        scrydexSyncService.getDatabaseStats()
      ]);
      setSyncStatus(status);
      setDatabaseStats(stats);
    } catch (error) {
      console.error('Failed to load sync data:', error);
      setMessage('Failed to load sync status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setMessage('');
    
    try {
      await scrydexSyncService.triggerSync();
      setMessage('Sync triggered successfully! This may take several minutes.');
      
      // Reload data after a short delay
      setTimeout(() => {
        loadData();
      }, 2000);
      
    } catch (error) {
      console.error('Sync failed:', error);
      setMessage(`Sync failed: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleComprehensiveSync = async () => {
    setIsSyncing(true);
    setMessage('🔄 Starting comprehensive sync... This will process 5,000 cards and may take 10-15 minutes.');
    
    try {
      const result = await scrydexSyncService.triggerComprehensiveSync();
      
      if (result.success) {
        const syncDetails = result.data.syncDetails;
        if (syncDetails) {
          setMessage(`✅ Comprehensive sync completed! 
📊 Processed: ${syncDetails.totalProcessed} cards
🆕 New cards added: ${syncDetails.newCards}
🔄 Duplicates skipped: ${syncDetails.duplicates}
❌ Errors: ${syncDetails.errors}
📄 Last page processed: ${syncDetails.lastPage}
💾 Total cards in database: ${result.data.cards}`);
        } else {
          setMessage(`✅ Comprehensive sync completed! Synced ${result.data.cards} cards.`);
        }
      } else {
        setMessage(`⚠️ Comprehensive sync completed with issues: ${result.message}`);
      }
      
      // Reload data after a short delay
      setTimeout(() => {
        loadData();
      }, 2000);
      
    } catch (error) {
      console.error('Comprehensive sync failed:', error);
      setMessage(`❌ Comprehensive sync failed: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTestSync = async () => {
    setIsSyncing(true);
    setMessage('');
    
    try {
      await scrydexSyncService.triggerTestSync();
      setMessage('Test sync completed! Synced 10 cards for testing.');
      
      // Reload data after a short delay
      setTimeout(() => {
        loadData();
      }, 2000);
      
    } catch (error) {
      console.error('Test sync failed:', error);
      setMessage(`Test sync failed: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const getSyncStatusText = () => {
    if (!syncStatus) return 'Unknown';
    
    const lastSync = syncStatus.cards || syncStatus.expansions;
    if (!lastSync) return 'Never synced';
    
    const lastSyncDate = new Date(lastSync);
    const now = new Date();
    const hoursSinceSync = (now - lastSyncDate) / (1000 * 60 * 60);
    
    if (hoursSinceSync < 1) return 'Just synced';
    if (hoursSinceSync < 24) return `${Math.round(hoursSinceSync)} hours ago`;
    return `${Math.round(hoursSinceSync / 24)} days ago`;
  };

  const getSyncStatusColor = () => {
    if (!syncStatus) return 'text-gray-400';
    
    const lastSync = syncStatus.cards || syncStatus.expansions;
    if (!lastSync) return 'text-red-400';
    
    const lastSyncDate = new Date(lastSync);
    const now = new Date();
    const hoursSinceSync = (now - lastSyncDate) / (1000 * 60 * 60);
    
    if (hoursSinceSync < 24) return 'text-green-400';
    if (hoursSinceSync < 72) return 'text-yellow-400';
    return 'text-red-400';
  };

  // Show loading while checking admin status
  if (adminLoading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-gray-400">Checking permissions...</span>
        </div>
      </div>
    );
  }

  // Show access denied if not admin
  if (!isAdmin) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="p-4 bg-red-900/20 border border-red-800/30 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h5 className="text-red-200 font-medium">Access Restricted</h5>
              <p className="text-red-300 text-sm mt-1">
                Database sync settings are only available to administrators.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Scrydex Database Sync</h3>
          <p className="text-sm text-gray-400 mt-1">
            Manage your local Scrydex database for instant search results
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={isLoading}
          className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Database Statistics */}
      {databaseStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">
              {databaseStats.cards.toLocaleString()}
            </div>
            <div className="text-sm text-gray-400">Pokemon Cards</div>
          </div>
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">
              {databaseStats.expansions.toLocaleString()}
            </div>
            <div className="text-sm text-gray-400">Expansions</div>
          </div>
          <div className="bg-gray-700 rounded-lg p-4">
            <div className={`text-sm font-medium ${getSyncStatusColor()}`}>
              {getSyncStatusText()}
            </div>
            <div className="text-sm text-gray-400">Last Sync</div>
          </div>
        </div>
      )}

      {/* Sync Status Details */}
      {syncStatus && (
        <div className="bg-gray-700 rounded-lg p-4 mb-6">
          <h4 className="text-white font-medium mb-3">Sync Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Cards Last Synced:</span>
              <div className="text-white">{formatDate(syncStatus.cards)}</div>
            </div>
            <div>
              <span className="text-gray-400">Expansions Last Synced:</span>
              <div className="text-white">{formatDate(syncStatus.expansions)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Sync Actions */}
      <div className="space-y-4">
        <button
          onClick={handleSync}
          disabled={isSyncing || isLoading}
          className="w-full md:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSyncing ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Syncing...
            </div>
          ) : (
            'Trigger Full Sync'
          )}
        </button>

        <button
          onClick={handleComprehensiveSync}
          disabled={isSyncing || isLoading}
          className="w-full md:w-auto px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSyncing ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Syncing 5,000 cards...
            </div>
          ) : (
            'Comprehensive Sync (5,000 Cards)'
          )}
        </button>

        <button
          onClick={handleTestSync}
          disabled={isSyncing || isLoading}
          className="w-full md:w-auto px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSyncing ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Testing...
            </div>
          ) : (
            'Test Sync (10 Cards)'
          )}
        </button>

        {message && (
          <div className={`p-3 rounded-lg text-sm ${
            message.includes('success') 
              ? 'bg-green-900 text-green-200' 
              : 'bg-red-900 text-red-200'
          }`}>
            {message}
          </div>
        )}
      </div>

      {/* Information */}
        <div className="mt-6 p-4 bg-blue-900/20 border border-blue-800/30 rounded-lg">
          <h4 className="text-blue-200 font-medium mb-2">About Scrydex Sync</h4>
          <ul className="text-sm text-blue-200 space-y-1">
            <li>• <strong>Test Sync:</strong> 10 cards for testing (1-2 minutes)</li>
            <li>• <strong>Full Sync:</strong> 200 popular cards (5-10 minutes)</li>
            <li>• <strong>Comprehensive Sync:</strong> 5,000 cards per run (10-15 minutes)</li>
            <li>• Local database provides instant search results</li>
            <li>• All syncs include pricing data (raw & graded)</li>
            <li>• Run comprehensive sync multiple times to get entire database</li>
            <li>• Current database: <strong>{syncStatus?.total_cards || 0} cards</strong></li>
          </ul>
        </div>
    </div>
  );
};

export default ScrydexSyncSettings;
