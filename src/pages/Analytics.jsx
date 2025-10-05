import React, { useState } from 'react';

const Analytics = () => {
  const [timeRange, setTimeRange] = useState('30d');

  const stats = {
    totalInvested: 125000, // $1,250.00 in cents
    totalValue: 150000,    // $1,500.00 in cents
    totalProfit: 25000,    // $250.00 in cents
    roi: 20,               // 20%
    itemsSold: 15,
    avgHoldTime: 45,       // days
    bestPerformer: 'Charizard Base Set',
    worstPerformer: 'Pikachu Base Set'
  };

  const formatPrice = (cents) => `$${(cents / 100).toFixed(2)}`;

  return (
    <div>
      {/* Header */}
      <div className="px-4 md:px-6 lg:px-8 py-3">
        <div className="p-4 md:p-10 lg:p-12">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Analytics</h1>
              <p className="text-gray-400">Track your portfolio performance</p>
            </div>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 text-white text-sm"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
              <option value="all">All time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="px-4 md:px-6 lg:px-8 pb-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 md:p-6">
            <div className="text-sm text-gray-400">Total Invested</div>
            <div className="text-2xl font-bold text-white">
              {formatPrice(stats.totalInvested)}
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 md:p-6">
            <div className="text-sm text-gray-400">Current Value</div>
            <div className="text-2xl font-bold text-blue-400">
              {formatPrice(stats.totalValue)}
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 md:p-6">
            <div className="text-sm text-gray-400">Total Profit</div>
            <div className="text-2xl font-bold text-green-400">
              {formatPrice(stats.totalProfit)}
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 md:p-6">
            <div className="text-sm text-gray-400">ROI</div>
            <div className="text-2xl font-bold text-green-400">
              {stats.roi}%
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="px-4 md:px-6 lg:px-8 pb-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Trading Activity
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Items Sold</span>
                <span className="font-semibold text-white">
                  {stats.itemsSold}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Avg Hold Time</span>
                <span className="font-semibold text-white">
                  {stats.avgHoldTime} days
                </span>
              </div>
          </div>
        </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Top Performers
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-400">Best Performer</span>
                  <span className="text-sm text-green-400">+45%</span>
                </div>
                <div className="text-sm font-medium text-white">
                  {stats.bestPerformer}
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-400">Worst Performer</span>
                  <span className="text-sm text-red-400">-12%</span>
                </div>
                <div className="text-sm font-medium text-white">
                  {stats.worstPerformer}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Placeholder */}
      <div className="px-4 md:px-6 lg:px-8 pb-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Portfolio Value Over Time
          </h3>
          <div className="h-64 bg-gray-800 rounded-lg flex items-center justify-center">
            <div className="text-center text-gray-400">
            <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
              <p>Chart will be implemented with real data</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
