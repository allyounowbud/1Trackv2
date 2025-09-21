import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import v2DataService from '../services/v2DataService.js';

const V2ConnectionTest = () => {
  const [testResults, setTestResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);

  const runConnectionTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    const results = [];

    // Test 1: Basic Supabase Connection
    try {
      const { data, error } = await supabase.from('marketplaces').select('count').limit(1);
      if (error) throw error;
      results.push({
        test: 'Supabase Connection',
        status: 'success',
        message: 'Successfully connected to v2 Supabase'
      });
    } catch (error) {
      results.push({
        test: 'Supabase Connection',
        status: 'error',
        message: `Connection failed: ${error.message}`
      });
    }

    // Test 2: Check Tables Exist
    try {
      const tables = ['marketplaces', 'items', 'orders', 'user_preferences'];
      for (const table of tables) {
        const { data, error } = await supabase.from(table).select('count').limit(1);
        if (error) throw error;
      }
      results.push({
        test: 'Database Tables',
        status: 'success',
        message: 'All v2 tables exist and are accessible'
      });
    } catch (error) {
      results.push({
        test: 'Database Tables',
        status: 'error',
        message: `Table check failed: ${error.message}`
      });
    }

    // Test 3: Test Marketplaces Data
    try {
      const marketplaces = await v2DataService.getMarketplaces();
      results.push({
        test: 'Marketplaces Data',
        status: 'success',
        message: `Found ${marketplaces.length} marketplaces`
      });
    } catch (error) {
      results.push({
        test: 'Marketplaces Data',
        status: 'error',
        message: `Marketplaces test failed: ${error.message}`
      });
    }

    // Test 4: Test Items Table
    try {
      const items = await v2DataService.getItems();
      results.push({
        test: 'Items Table',
        status: 'success',
        message: `Items table accessible (${items.length} items)`
      });
    } catch (error) {
      results.push({
        test: 'Items Table',
        status: 'error',
        message: `Items test failed: ${error.message}`
      });
    }

    // Test 5: Test Orders Table
    try {
      const orders = await v2DataService.getOrders();
      results.push({
        test: 'Orders Table',
        status: 'success',
        message: `Orders table accessible (${orders.length} orders)`
      });
    } catch (error) {
      results.push({
        test: 'Orders Table',
        status: 'error',
        message: `Orders test failed: ${error.message}`
      });
    }

    // Test 6: Test Collection Summary View
    try {
      const summary = await v2DataService.getCollectionSummary();
      results.push({
        test: 'Collection Summary View',
        status: 'success',
        message: 'Collection summary view working'
      });
    } catch (error) {
      results.push({
        test: 'Collection Summary View',
        status: 'error',
        message: `Collection summary failed: ${error.message}`
      });
    }

    setTestResults(results);
    setIsRunning(false);
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">v2 Database Connection Test</h3>
          <p className="text-sm text-gray-400">Test connection to your new v2 Supabase project</p>
        </div>
        <button
          onClick={runConnectionTests}
          disabled={isRunning}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            isRunning
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
        >
          {isRunning ? 'Testing...' : 'Run Tests'}
        </button>
      </div>

      {testResults.length > 0 && (
        <div className="space-y-2">
          {testResults.map((result, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg text-sm ${
                result.status === 'success'
                  ? 'bg-green-900/30 border border-green-700/50'
                  : 'bg-red-900/30 border border-red-700/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-white font-medium">{result.test}</span>
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    result.status === 'success'
                      ? 'bg-green-700 text-green-100'
                      : 'bg-red-700 text-red-100'
                  }`}
                >
                  {result.status === 'success' ? 'PASSED' : 'FAILED'}
                </span>
              </div>
              <div className={`mt-1 text-xs ${
                result.status === 'success' ? 'text-green-400' : 'text-red-400'
              }`}>
                {result.message}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 p-3 bg-blue-900/30 border border-blue-700/50 rounded-lg">
        <h4 className="text-sm font-medium text-blue-300 mb-2">Environment Check:</h4>
        <div className="text-xs text-blue-200 space-y-1">
          <div>Supabase URL: {import.meta.env.VITE_SUPABASE_URL ? '✅ Set' : '❌ Missing'}</div>
          <div>Supabase Key: {import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}</div>
          <div>RapidAPI Key: {import.meta.env.VITE_RAPIDAPI_KEY ? '✅ Set' : '❌ Missing'}</div>
          <div>PriceCharting Key: {import.meta.env.VITE_PRICECHARTING_API_KEY ? '✅ Set' : '❌ Missing'}</div>
        </div>
      </div>
    </div>
  );
};

export default V2ConnectionTest;
