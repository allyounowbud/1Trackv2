import { useState, useEffect } from 'react';
import apiUsageMonitor from '../services/apiUsageMonitor.js';

const ApiUsageDisplay = () => {
  const [usageStats, setUsageStats] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Update usage stats every minute
    const updateStats = () => {
      const stats = apiUsageMonitor.getUsageStats();
      setUsageStats(stats);
    };

    updateStats();
    const interval = setInterval(updateStats, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  if (!usageStats) return null;

  const getUsageColor = (percentage) => {
    if (percentage >= 90) return 'text-red-400';
    if (percentage >= 70) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getUsageBgColor = (percentage) => {
    if (percentage >= 90) return 'bg-red-500/20';
    if (percentage >= 70) return 'bg-yellow-500/20';
    return 'bg-green-500/20';
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
          usageStats.daily.percentage >= 70 
            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' 
            : 'bg-gray-800/50 text-gray-400 border border-gray-700/50'
        }`}
      >
        API: {usageStats.daily.used}/{usageStats.daily.limit}
      </button>

      {isVisible && (
        <div className="absolute top-12 right-0 bg-gray-900 border border-gray-700 rounded-lg p-4 min-w-64 shadow-xl">
          <h3 className="text-sm font-semibold text-white mb-3">API Usage</h3>
          
          {/* Daily Usage */}
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-400">Daily</span>
              <span className={`text-xs font-medium ${getUsageColor(usageStats.daily.percentage)}`}>
                {usageStats.daily.used}/{usageStats.daily.limit}
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all ${getUsageBgColor(usageStats.daily.percentage)}`}
                style={{ width: `${Math.min(usageStats.daily.percentage, 100)}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {usageStats.daily.remaining} remaining
            </div>
          </div>

          {/* Hourly Usage */}
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-400">Hourly</span>
              <span className={`text-xs font-medium ${getUsageColor(usageStats.hourly.percentage)}`}>
                {usageStats.hourly.used}/{usageStats.hourly.limit}
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all ${getUsageBgColor(usageStats.hourly.percentage)}`}
                style={{ width: `${Math.min(usageStats.hourly.percentage, 100)}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {usageStats.hourly.remaining} remaining
            </div>
          </div>

          {/* Warning Message */}
          {apiUsageMonitor.getUsageWarning() && (
            <div className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded p-2">
              ⚠️ {apiUsageMonitor.getUsageWarning()}
            </div>
          )}

          {/* Last Reset */}
          <div className="text-xs text-gray-500 mt-2">
            Last reset: {new Date(usageStats.lastReset).toLocaleDateString()}
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiUsageDisplay;
