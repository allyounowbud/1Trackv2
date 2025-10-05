import React from 'react';

const PriceChartingSettings = () => {

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">PriceCharting</h3>
          <p className="text-sm text-gray-400">Sealed product pricing data with accurate US prices (secure backend)</p>
        </div>
      </div>

      <div className="space-y-4">

        {/* Security Information */}
        <div className="bg-gray-700/50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-white mb-2">🔒 Secure Backend Integration</h4>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>• API key is stored securely on the backend server</li>
            <li>• All PriceCharting requests go through our secure proxy</li>
            <li>• No sensitive data is exposed to the frontend</li>
          </ul>
        </div>

        {/* Information */}
        <div className="bg-gray-700/50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-white mb-2">About PriceCharting</h4>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>• Provides accurate US pricing data for sealed products</li>
            <li>• Only used for sealed products - singles continue to use Scrydex</li>
            <li>• Supports Pokemon, Magic, Yu-Gi-Oh!, and other TCGs</li>
            <li>• Real-time market pricing with multiple price points (low, mid, high, market)</li>
            <li>• Products are automatically sorted by expansion using Scrydex data</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PriceChartingSettings;
