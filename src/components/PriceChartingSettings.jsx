import React, { useState, useEffect } from 'react';
import { TestTube, CheckCircle, XCircle } from 'lucide-react';
import priceChartingApiService from '../services/priceChartingApiService';

const PriceChartingSettings = () => {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    // Auto-test connection when component loads
    handleTestConnection();
  }, []);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      await priceChartingApiService.initialize();
      await priceChartingApiService.testConnection();
      setTestResult({ success: true, message: 'PriceCharting API connection successful!' });
    } catch (error) {
      setTestResult({ success: false, message: `Connection test failed: ${error.message}` });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">PriceCharting API</h3>
          <p className="text-sm text-gray-400">Sealed product pricing data (secure backend)</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Connection Status */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Connection Status
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              <TestTube size={16} />
              {isTesting ? 'Testing...' : 'Test Connection'}
            </button>
            
            {testResult && (
              <div className="flex items-center gap-2">
                {testResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
                <span className={`text-sm ${
                  testResult.success ? 'text-green-400' : 'text-red-400'
                }`}>
                  {testResult.success ? 'Connected' : 'Failed'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Test Result */}
        {testResult && (
          <div className={`p-3 rounded-lg ${
            testResult.success 
              ? 'bg-green-900/30 border border-green-500/30' 
              : 'bg-red-900/30 border border-red-500/30'
          }`}>
            <p className={`text-sm ${
              testResult.success ? 'text-green-400' : 'text-red-400'
            }`}>
              {testResult.message}
            </p>
          </div>
        )}

        {/* Security Information */}
        <div className="bg-gray-700/50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-white mb-2">🔒 Secure Backend Integration</h4>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>• API key is stored securely on the backend server</li>
            <li>• All PriceCharting requests go through our secure proxy</li>
            <li>• No sensitive data is exposed to the frontend</li>
            <li>• Automatic connection testing on page load</li>
          </ul>
        </div>

        {/* Information */}
        <div className="bg-gray-700/50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-white mb-2">About PriceCharting API</h4>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>• Provides pricing data for sealed products (booster boxes, packs, etc.)</li>
            <li>• Only used for sealed products - singles continue to use Scrydex</li>
            <li>• Supports Pokemon, Magic, Yu-Gi-Oh!, and other TCGs</li>
            <li>• Real-time market pricing and historical data</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PriceChartingSettings;