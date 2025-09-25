import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { getItemDisplayName, getItemSetName } from '../../utils/nameUtils';
import { queryKeys } from '../../lib/queryClient';

// Simple data fetching - just one table!
async function getOrders() {
  const { data, error } = await supabase
    .from("individual_orders_clean")
    .select("*")
    .order("item_id, order_number", { ascending: true });
  if (error) throw error;
  return data || [];
}

async function getCollectionSummary() {
  const { data, error } = await supabase
    .from("collection_summary_clean")
    .select("*")
    .order("item_name", { ascending: true });
  if (error) throw error;
  return data || [];
}

const DesktopCollection = () => {
  const [viewMode, setViewMode] = useState('summary');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [timeRange, setTimeRange] = useState('7D');

  // Fetch data
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: queryKeys.orders,
    queryFn: getOrders,
  });

  const { data: summary = [], isLoading: summaryLoading } = useQuery({
    queryKey: queryKeys.collectionSummary,
    queryFn: getCollectionSummary,
  });

  // Filter data based on search and filter
  const filteredData = (viewMode === 'summary' ? summary : orders).filter(item => {
    const matchesSearch = !searchQuery || 
      getItemDisplayName(item).toLowerCase().includes(searchQuery.toLowerCase()) ||
      getItemSetName(item).toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = selectedFilter === 'All' || 
      (selectedFilter === 'Graded' && item.graded) ||
      (selectedFilter === 'Ungraded' && !item.graded) ||
      (selectedFilter === 'Sealed' && item.sealed);
    
    return matchesSearch && matchesFilter;
  });

  // Calculate stats
  const totalItems = summary.length;
  const totalValue = summary.reduce((sum, item) => sum + (item.total_value || 0), 0);
  const gradedCount = summary.filter(item => item.graded).length;
  const ungradedCount = summary.filter(item => !item.graded && !item.sealed).length;
  const sealedCount = summary.filter(item => item.sealed).length;

  if (ordersLoading || summaryLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-100 text-sm font-medium">Total Items</p>
              <p className="text-3xl font-bold">{totalItems.toLocaleString()}</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-3">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Total Value</p>
              <p className="text-3xl font-bold">${totalValue.toLocaleString()}</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-3">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-500 to-cyan-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Graded</p>
              <p className="text-3xl font-bold">{gradedCount.toLocaleString()}</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-3">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Ungraded</p>
              <p className="text-3xl font-bold">{ungradedCount.toLocaleString()}</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-3">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search collection..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-64"
            />
            <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          <select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="All">All Items</option>
            <option value="Graded">Graded</option>
            <option value="Ungraded">Ungraded</option>
            <option value="Sealed">Sealed</option>
          </select>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('summary')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'summary'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Summary
            </button>
            <button
              onClick={() => setViewMode('individual')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'individual'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Individual
            </button>
          </div>
        </div>
      </div>

      {/* Collection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredData.map((item, index) => (
          <div key={item.id || index} className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 line-clamp-2">
                    {getItemDisplayName(item)}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {getItemSetName(item)}
                  </p>
                </div>
                <div className="flex items-center space-x-2 ml-2">
                  {item.graded && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Graded
                    </span>
                  )}
                  {item.sealed && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Sealed
                    </span>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Quantity:</span>
                  <span className="font-medium">{item.quantity || 1}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Value:</span>
                  <span className="font-medium text-green-600">
                    ${(item.total_value || item.price || 0).toLocaleString()}
                  </span>
                </div>
                {item.grade && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Grade:</span>
                    <span className="font-medium">{item.grade}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredData.length === 0 && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No items found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchQuery ? 'Try adjusting your search terms.' : 'Start by adding some items to your collection.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default DesktopCollection;
