/**
 * Cache Management Panel
 * Provides UI for monitoring and managing API cache
 * Implements Scrydex caching best practices monitoring
 */

import React, { useState, useEffect } from 'react';
import apiCacheService from '../services/apiCacheService';
import imageCacheService from '../services/imageCacheService';
import imagePreloadService from '../services/imagePreloadService';

const CacheManagementPanel = () => {
  const [apiStats, setApiStats] = useState(null);
  const [imageStats, setImageStats] = useState(null);
  const [preloadStats, setPreloadStats] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    refreshStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(refreshStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const refreshStats = () => {
    setApiStats(apiCacheService.getStats());
    setImageStats(imageCacheService.getCacheStats());
    setPreloadStats(imagePreloadService.getPreloadStats());
  };

  const handleClearApiCache = async () => {
    setIsRefreshing(true);
    try {
      apiCacheService.clear();
      console.log('✅ API cache cleared');
      refreshStats();
    } catch (error) {
      console.error('❌ Failed to clear API cache:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleClearImageCache = async () => {
    setIsRefreshing(true);
    try {
      await imageCacheService.clearCache();
      console.log('✅ Image cache cleared');
      refreshStats();
    } catch (error) {
      console.error('❌ Failed to clear image cache:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleClearCacheByType = (type) => {
    setIsRefreshing(true);
    try {
      apiCacheService.clearByType(type);
      console.log(`✅ ${type} cache cleared`);
      refreshStats();
    } catch (error) {
      console.error(`❌ Failed to clear ${type} cache:`, error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getHitRateColor = (hitRate) => {
    const rate = parseFloat(hitRate);
    if (rate >= 80) return 'text-green-400';
    if (rate >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <span className="text-2xl">🗄️</span>
          Cache Management
        </h2>
        <button
          onClick={refreshStats}
          disabled={isRefreshing}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <span className={isRefreshing ? 'animate-spin' : ''}>🔄</span>
          Refresh
        </button>
      </div>

      {/* API Cache Statistics */}
      {apiStats && (
        <div className="mb-8">
          <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
            <span>📊</span>
            API Cache Statistics
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="text-2xl font-bold text-white">{apiStats.totalEntries}</div>
              <div className="text-sm text-gray-300">Total Entries</div>
            </div>
            
            <div className="bg-gray-700 rounded-lg p-4">
              <div className={`text-2xl font-bold ${getHitRateColor(apiStats.hitRate)}`}>
                {apiStats.hitRate}
              </div>
              <div className="text-sm text-gray-300">Hit Rate</div>
            </div>
            
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-400">{apiStats.hits}</div>
              <div className="text-sm text-gray-300">Cache Hits</div>
            </div>
            
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="text-2xl font-bold text-red-400">{apiStats.misses}</div>
              <div className="text-sm text-gray-300">Cache Misses</div>
            </div>
          </div>

          {/* Cache by Type */}
          <div className="mb-4">
            <h4 className="text-md font-medium text-white mb-2">Cache by Type</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(apiStats.typeCounts).map(([type, count]) => (
                <div key={type} className="bg-gray-700 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-white capitalize">{type}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-400 font-medium">{count}</span>
                    <button
                      onClick={() => handleClearCacheByType(type)}
                      className="text-red-400 hover:text-red-300 text-sm"
                      title={`Clear ${type} cache`}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleClearApiCache}
            disabled={isRefreshing}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear All API Cache
          </button>
        </div>
      )}

      {/* Image Cache Statistics */}
      {imageStats && (
        <div className="mb-8">
          <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
            <span>🖼️</span>
            Image Cache Statistics
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="text-2xl font-bold text-white">{imageStats.active}</div>
              <div className="text-sm text-gray-300">Active Images</div>
            </div>
            
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="text-2xl font-bold text-yellow-400">{imageStats.expired}</div>
              <div className="text-sm text-gray-300">Expired</div>
            </div>
            
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-400">{imageStats.pendingDownloads}</div>
              <div className="text-sm text-gray-300">Pending Downloads</div>
            </div>
            
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-400">{imageStats.maxCacheSize}</div>
              <div className="text-sm text-gray-300">Max Cache Size</div>
            </div>
          </div>

          <button
            onClick={handleClearImageCache}
            disabled={isRefreshing}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear All Image Cache
          </button>
        </div>
      )}

      {/* Preload Statistics */}
      {preloadStats && (
        <div className="mb-8">
          <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
            <span>🚀</span>
            Preload Statistics
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-700 rounded-lg p-4">
              <div className={`text-2xl font-bold ${preloadStats.isPreloading ? 'text-green-400' : 'text-gray-400'}`}>
                {preloadStats.isPreloading ? '🔄' : '⏸️'}
              </div>
              <div className="text-sm text-gray-300">Preloading</div>
            </div>
            
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-400">{preloadStats.queueSize}</div>
              <div className="text-sm text-gray-300">Queue Size</div>
            </div>
            
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-400">{preloadStats.batchSize}</div>
              <div className="text-sm text-gray-300">Batch Size</div>
            </div>
            
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="text-2xl font-bold text-yellow-400">{preloadStats.batchDelay}ms</div>
              <div className="text-sm text-gray-300">Batch Delay</div>
            </div>
          </div>
        </div>
      )}

      {/* Cache Policies */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          <span>📋</span>
          Cache Policies (Scrydex Best Practices)
        </h3>
        
        <div className="space-y-3">
          {Object.entries(apiCacheService.getCachePolicies()).map(([type, policy]) => (
            <div key={type} className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-medium capitalize">{type}</span>
                <span className="text-sm text-gray-300">
                  TTL: {Math.round(policy.ttl / 1000 / 60)}min
                </span>
              </div>
              <div className="text-sm text-gray-400">{policy.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Cache Recommendations */}
      <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
        <h3 className="text-lg font-medium text-blue-300 mb-2 flex items-center gap-2">
          <span>💡</span>
          Cache Optimization Tips
        </h3>
        <ul className="text-sm text-blue-200 space-y-1">
          <li>• Card metadata cached for 6 hours (rarely changes)</li>
          <li>• Expansion data cached for 24 hours (rarely changes)</li>
          <li>• Price data cached for 24 hours (updates daily)</li>
          <li>• Search results cached for 30 minutes (frequent changes)</li>
          <li>• API usage cached for 15 minutes (monitoring data)</li>
        </ul>
      </div>
    </div>
  );
};

export default CacheManagementPanel;

