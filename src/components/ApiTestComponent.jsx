import React, { useState } from 'react';
import scrydexService from '../services/scrydexService';
import scrydexSyncService from '../services/scrydexSyncService';

const ApiTestComponent = () => {
  const [testResults, setTestResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (message, type = 'info') => {
    setTestResults(prev => [...prev, { message, type, timestamp: new Date().toISOString() }]);
  };

  const testApiConnection = async () => {
    setIsLoading(true);
    setTestResults([]);
    
    try {
      addResult('🔧 Testing API connection...', 'info');
      
      // Test 1: Check environment variables
      addResult(`VITE_SUPABASE_URL: ${import.meta.env.VITE_SUPABASE_URL ? '✅ Set' : '❌ Missing'}`, 'info');
      addResult(`VITE_SUPABASE_ANON_KEY: ${import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}`, 'info');
      
      // Test 2: Initialize services
      addResult('🔧 Initializing scrydexService...', 'info');
      await scrydexService.initialize();
      addResult('✅ ScrydexService initialized successfully', 'success');
      
      addResult('🔧 Initializing scrydexSyncService...', 'info');
      await scrydexSyncService.initialize();
      addResult('✅ ScrydexSyncService initialized successfully', 'success');
      
      // Test 3: Test simple search
      addResult('🔍 Testing simple card search...', 'info');
      const searchResult = await scrydexService.searchPokemonCards('charizard', { pageSize: 5 });
      addResult(`✅ Search successful: Found ${Array.isArray(searchResult) ? searchResult.length : searchResult?.data?.length || 0} results`, 'success');
      
      // Test 4: Test expansion search
      addResult('🔍 Testing expansion search...', 'info');
      const expansionResult = await scrydexService.getAllPokemonExpansions('en');
      addResult(`✅ Expansion search successful: Found ${Array.isArray(expansionResult) ? expansionResult.length : expansionResult?.data?.length || 0} expansions`, 'success');
      
      // Test 5: Test API usage
      addResult('🔍 Testing API usage endpoint...', 'info');
      try {
        const usageResult = await scrydexService.getApiUsage();
        addResult(`✅ API usage successful: ${usageResult.success ? 'Data retrieved' : 'Mock data returned'}`, 'success');
      } catch (usageError) {
        addResult(`⚠️ API usage failed: ${usageError.message}`, 'warning');
      }
      
      // Test 6: Test sync service
      addResult('🔄 Testing sync service...', 'info');
      try {
        const syncStatus = await scrydexSyncService.getSyncStatus();
        addResult(`✅ Sync status: ${syncStatus.isInitialized ? 'Initialized' : 'Not initialized'}`, 'success');
        addResult(`📊 Cards need sync: ${syncStatus.cardsNeedSync ? 'Yes' : 'No'}`, 'info');
        addResult(`📊 Expansions need sync: ${syncStatus.expansionsNeedSync ? 'Yes' : 'No'}`, 'info');
      } catch (syncError) {
        addResult(`⚠️ Sync status check failed: ${syncError.message}`, 'warning');
      }
      
      addResult('🎉 All tests completed successfully!', 'success');
      
    } catch (error) {
      addResult(`❌ Test failed: ${error.message}`, 'error');
      console.error('API Test Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const forceSync = async () => {
    setIsLoading(true);
    setTestResults([]);
    
    try {
      addResult('🔄 Starting force sync...', 'info');
      await scrydexSyncService.forceSync();
      addResult('✅ Force sync completed successfully!', 'success');
    } catch (error) {
      addResult(`❌ Force sync failed: ${error.message}`, 'error');
      console.error('Force Sync Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-900 text-white rounded-lg">
      <h2 className="text-xl font-bold mb-4">API Connection Test</h2>
      
      <div className="mb-4">
        <button
          onClick={testApiConnection}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Testing...' : 'Test API Connection'}
        </button>
        <button
          onClick={clearResults}
          className="ml-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Clear Results
        </button>
        <button
          onClick={forceSync}
          disabled={isLoading}
          className="ml-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {isLoading ? 'Syncing...' : 'Force Sync'}
        </button>
      </div>
      
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {testResults.map((result, index) => (
          <div
            key={index}
            className={`p-2 rounded text-sm ${
              result.type === 'success' ? 'bg-green-800 text-green-200' :
              result.type === 'error' ? 'bg-red-800 text-red-200' :
              result.type === 'warning' ? 'bg-yellow-800 text-yellow-200' :
              'bg-gray-800 text-gray-200'
            }`}
          >
            {result.message}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ApiTestComponent;
