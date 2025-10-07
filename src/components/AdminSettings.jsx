import React, { useState, useEffect } from 'react';
import scrydexSyncService from '../services/scrydexSyncService';
import comprehensivePricingService from '../services/comprehensivePricingService';

const AdminSettings = () => {
  const [syncStatus, setSyncStatus] = useState(null);
  const [pricingStats, setPricingStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('database');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [status, dbStats, pricingStats] = await Promise.all([
        scrydexSyncService.getSyncStatus(),
        scrydexSyncService.getDatabaseStats(),
        comprehensivePricingService.getPricingStats()
      ]);
      
      // Combine sync status with database stats
      setSyncStatus({
        ...status,
        cards: dbStats.cards,
        expansions: dbStats.expansions,
        lastSync: status?.cards || status?.expansions
      });
      setPricingStats(pricingStats);
    } catch (error) {
      console.error('Failed to load admin data:', error);
      setMessage('Failed to load admin data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDatabaseSync = async () => {
    setIsSyncing(true);
    setMessage('');
    
    try {
      await scrydexSyncService.triggerSync();
      setMessage('Database sync triggered successfully!');
      setTimeout(() => loadData(), 2000);
    } catch (error) {
      setMessage(`Database sync failed: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePricingSync = async () => {
    setIsSyncing(true);
    setMessage('');
    
    try {
      const result = await comprehensivePricingService.triggerPricingSync();
      if (result.success) {
        setMessage('Pricing sync completed successfully!');
      } else {
        setMessage(`Pricing sync failed: ${result.error}`);
      }
      setTimeout(() => loadData(), 2000);
    } catch (error) {
      setMessage(`Pricing sync failed: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleComprehensiveSync = async () => {
    setIsSyncing(true);
    setMessage('Starting comprehensive sync... This may take 10-15 minutes.');
    
    try {
      const result = await scrydexSyncService.triggerComprehensiveSync();
      if (result.success) {
        setMessage('Comprehensive sync completed successfully!');
      } else {
        setMessage(`Comprehensive sync failed: ${result.error}`);
      }
      setTimeout(() => loadData(), 2000);
    } catch (error) {
      setMessage(`Comprehensive sync failed: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  // This component should only be rendered for admins, so no loading or access checks needed

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 md:p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white">System Administration</h3>
        <p className="text-sm text-gray-400 mt-1">
          Manage database sync, pricing updates, and system settings
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-800 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('database')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'database'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Database Sync
        </button>
        <button
          onClick={() => setActiveTab('pricing')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'pricing'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Pricing System
        </button>
        <button
          onClick={() => setActiveTab('system')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'system'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          System Health
        </button>
      </div>

      {/* Database Sync Tab */}
      {activeTab === 'database' && (
        <div className="space-y-6">
          {/* Sync Status */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-white font-medium mb-3">Database Status</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Total Cards</span>
                <p className="text-white font-medium">{syncStatus?.cards || 0}</p>
              </div>
              <div>
                <span className="text-gray-400">Last Sync</span>
                <p className="text-white font-medium">{formatDate(syncStatus?.lastSync)}</p>
              </div>
              <div>
                <span className="text-gray-400">Status</span>
                <p className={`font-medium ${
                  syncStatus?.lastSync ? 'text-green-400' : 'text-red-400'
                }`}>
                  {syncStatus?.lastSync ? 'Up to date' : 'Never synced'}
                </p>
              </div>
              <div>
                <span className="text-gray-400">Expansions</span>
                <p className="text-white font-medium">{syncStatus?.expansions || 0}</p>
              </div>
            </div>
          </div>

          {/* Sync Actions */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-white font-medium mb-3">Sync Actions</h4>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleDatabaseSync}
                disabled={isSyncing}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
              >
                {isSyncing ? 'Syncing...' : 'Quick Sync'}
              </button>
              <button
                onClick={handleComprehensiveSync}
                disabled={isSyncing}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
              >
                {isSyncing ? 'Syncing...' : 'Full Sync'}
              </button>
              <button
                onClick={loadData}
                disabled={isLoading}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
              >
                Refresh Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pricing System Tab */}
      {activeTab === 'pricing' && (
        <div className="space-y-6">
          {/* Pricing Status */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-white font-medium mb-3">Pricing System Status</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Total Cards</span>
                <p className="text-white font-medium">{pricingStats?.sync?.totalCards || 0}</p>
              </div>
              <div>
                <span className="text-gray-400">Cards with Pricing</span>
                <p className="text-white font-medium">{pricingStats?.sync?.cardsWithPricing || 0}</p>
              </div>
              <div>
                <span className="text-gray-400">Pricing Coverage</span>
                <p className="text-white font-medium">{pricingStats?.sync?.pricingCoverage || '0%'}</p>
              </div>
              <div>
                <span className="text-gray-400">Stale Pricing</span>
                <p className="text-white font-medium">{pricingStats?.sync?.stalePricing || 0}</p>
              </div>
            </div>
          </div>

          {/* Pricing Actions */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-white font-medium mb-3">Pricing Actions</h4>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handlePricingSync}
                disabled={isSyncing}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
              >
                {isSyncing ? 'Updating...' : 'Update Pricing'}
              </button>
              <button
                onClick={() => comprehensivePricingService.clearAllCaches()}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-lg transition-colors"
              >
                Clear Caches
              </button>
            </div>
          </div>
        </div>
      )}

      {/* System Health Tab */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          {/* System Status */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-white font-medium mb-3">System Health</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Auto Sync</span>
                <p className={`font-medium ${
                  pricingStats?.autoSync?.enabled ? 'text-green-400' : 'text-red-400'
                }`}>
                  {pricingStats?.autoSync?.enabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
              <div>
                <span className="text-gray-400">Cache Size</span>
                <p className="text-white font-medium">{pricingStats?.cache?.total || 0}</p>
              </div>
              <div>
                <span className="text-gray-400">Pending Requests</span>
                <p className="text-white font-medium">{pricingStats?.cache?.pendingRequests || 0}</p>
              </div>
              <div>
                <span className="text-gray-400">Services</span>
                <p className={`font-medium ${
                  pricingStats?.services?.initialized ? 'text-green-400' : 'text-red-400'
                }`}>
                  {pricingStats?.services?.initialized ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Messages */}
      {message && (
        <div className={`p-4 rounded-lg text-sm ${
          message.includes('success') || message.includes('completed')
            ? 'bg-green-900/20 text-green-200 border border-green-800/30'
            : 'bg-red-900/20 text-red-200 border border-red-800/30'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
};

export default AdminSettings;
