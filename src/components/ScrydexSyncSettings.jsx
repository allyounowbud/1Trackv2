import React, { useState, useEffect } from 'react';
import scrydexSyncService from '../services/scrydexSyncService';

const ScrydexSyncSettings = () => {
  const [syncStatus, setSyncStatus] = useState(null);
  const [databaseStats, setDatabaseStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

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
          <li>• Local database provides instant search results</li>
          <li>• Sync downloads all Pokemon cards and expansions from Scrydex</li>
          <li>• Recommended to sync daily for best performance</li>
          <li>• Sync may take 5-15 minutes depending on data size</li>
        </ul>
      </div>
    </div>
  );
};

export default ScrydexSyncSettings;
