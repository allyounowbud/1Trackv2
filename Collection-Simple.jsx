import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';

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

const CollectionSimple = () => {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState(
    location.state?.searchQuery || ''
  );
  const [viewMode, setViewMode] = useState('summary'); // 'summary' or 'individual'
  const [showOrderMenu, setShowOrderMenu] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [showMarkAsSoldModal, setShowMarkAsSoldModal] = useState(false);

  // Fetch data
  const { data: orders = [], isLoading: ordersLoading, refetch: refetchOrders } = useQuery({
    queryKey: ['orders'],
    queryFn: getOrders,
  });

  const { data: collectionSummary = [], isLoading: summaryLoading, refetch: refetchSummary } = useQuery({
    queryKey: ['collectionSummary'],
    queryFn: getCollectionSummary,
  });

  // Delete order - SIMPLE!
  const deleteOrder = async (orderId) => {
    try {
      const { error } = await supabase.rpc('delete_order_clean', {
        p_order_id: orderId
      });

      if (error) {
        console.error('Error deleting order:', error);
        alert('Error deleting order: ' + error.message);
        return;
      }

      // Close menu and refresh data
      setShowOrderMenu(false);
      setSelectedOrderId(null);
      refetchOrders();
      refetchSummary();
      
      alert('Order deleted successfully');
      
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Error deleting order: ' + error.message);
    }
  };

  // Mark order as sold - SIMPLE!
  const markOrderAsSold = async (orderId, sellData) => {
    try {
      const { error } = await supabase.rpc('mark_order_sold', {
        p_order_id: orderId,
        p_sell_date: sellData.sellDate,
        p_sell_price_cents: Math.round(sellData.sellPrice * 100),
        p_sell_quantity: sellData.quantity,
        p_sell_location: sellData.location,
        p_sell_marketplace_id: sellData.marketplaceId,
        p_sell_retailer_id: sellData.retailerId,
        p_sell_fees_cents: Math.round(sellData.fees * 100),
        p_sell_notes: sellData.notes
      });

      if (error) {
        console.error('Error marking order as sold:', error);
        alert('Error marking order as sold: ' + error.message);
        return;
      }

      // Close modal and refresh data
      setShowMarkAsSoldModal(false);
      setSelectedOrderId(null);
      refetchOrders();
      refetchSummary();
      
      alert('Order marked as sold successfully');
      
    } catch (error) {
      console.error('Error marking order as sold:', error);
      alert('Error marking order as sold: ' + error.message);
    }
  };

  // Group orders by item for summary view
  const groupedOrders = orders.reduce((acc, order) => {
    if (!acc[order.item_id]) {
      acc[order.item_id] = {
        item: {
          id: order.item_id,
          name: order.item_name,
          set_name: order.set_name,
          item_type: order.item_type,
          market_value_cents: order.market_value_cents,
          image_url: order.image_url
        },
        orders: []
      };
    }
    acc[order.item_id].orders.push(order);
    return acc;
  }, {});

  const formatPrice = (price) => {
    return `$${(price / 100).toFixed(2)}`;
  };

  if (ordersLoading || summaryLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading collection...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold text-white">Collection</h1>
            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('summary')}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${
                    viewMode === 'summary' 
                      ? 'bg-indigo-600 text-white' 
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  Summary
                </button>
                <button
                  onClick={() => setViewMode('individual')}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${
                    viewMode === 'individual' 
                      ? 'bg-indigo-600 text-white' 
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  Individual
                </button>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search your collection..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <svg className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {viewMode === 'summary' ? (
          /* Summary View - Grouped by Item */
          <div className="space-y-4">
            {Object.values(groupedOrders).map((group) => {
              const totalQuantity = group.orders.reduce((sum, order) => sum + order.buy_quantity, 0);
              const totalInvested = group.orders.reduce((sum, order) => sum + (order.total_cost_cents || 0), 0);
              const soldOrders = group.orders.filter(order => order.is_sold);
              const totalRevenue = soldOrders.reduce((sum, order) => sum + (order.total_revenue_cents || 0), 0);
              const totalProfit = soldOrders.reduce((sum, order) => sum + (order.net_profit_cents || 0), 0);
              const availableQuantity = group.orders.filter(order => !order.is_sold).reduce((sum, order) => sum + order.buy_quantity, 0);
              
              return (
                <div key={group.item.id} className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-start gap-4">
                    {/* Item Image */}
                    <div className="w-16 h-16 bg-gray-700 rounded-lg flex-shrink-0">
                      {group.item.image_url ? (
                        <img
                          src={group.item.image_url}
                          alt={group.item.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/>
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Item Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium text-sm truncate">{group.item.name}</h3>
                      {group.item.set_name && (
                        <p className="text-gray-400 text-xs truncate">{group.item.set_name}</p>
                      )}
                      <p className="text-gray-400 text-xs">{group.item.item_type}</p>
                      
                      {/* Order Count */}
                      <div className="mt-2 flex items-center gap-4 text-xs">
                        <span className="text-gray-300">
                          {group.orders.length} order{group.orders.length !== 1 ? 's' : ''}
                        </span>
                        <span className="text-indigo-400">
                          Qty • {totalQuantity}
                        </span>
                      </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="text-right text-xs space-y-1">
                      <div className="text-white">
                        {formatPrice((group.item.market_value_cents || 0) * totalQuantity)} Value
                      </div>
                      <div className="text-gray-300">
                        {formatPrice(totalInvested)} Paid
                        {totalProfit !== 0 && (
                          <span className={`ml-1 ${totalProfit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            ({totalProfit > 0 ? '+' : ''}{formatPrice(totalProfit)})
                          </span>
                        )}
                      </div>
                      {availableQuantity > 0 && (
                        <div className="text-gray-400">
                          {availableQuantity} available
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => {
                          setViewMode('individual');
                          // Could filter to show only this item's orders
                        }}
                        className="px-3 py-1 bg-indigo-600 text-white text-xs rounded-md hover:bg-indigo-700 transition-colors"
                      >
                        Manage Orders
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Individual Orders View */
          <div className="space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-start gap-4">
                  {/* Item Image */}
                  <div className="w-12 h-12 bg-gray-700 rounded-lg flex-shrink-0">
                    {order.image_url ? (
                      <img
                        src={order.image_url}
                        alt={order.item_name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/>
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Order Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-medium text-sm truncate">{order.item_name}</h3>
                      <span className="text-gray-400 text-xs">Order #{order.order_number}</span>
                    </div>
                    {order.set_name && (
                      <p className="text-gray-400 text-xs truncate">{order.set_name}</p>
                    )}
                    
                    {/* Order Info */}
                    <div className="mt-2 space-y-1 text-xs">
                      <div className="text-gray-300">
                        Bought: {new Date(order.buy_date).toLocaleDateString()} • {formatPrice(order.buy_price_cents)} × {order.buy_quantity}
                      </div>
                      {order.buy_location && (
                        <div className="text-gray-400">From: {order.buy_location}</div>
                      )}
                      {order.is_sold && (
                        <div className="text-green-400">
                          Sold: {new Date(order.sell_date).toLocaleDateString()} • {formatPrice(order.sell_price_cents)} × {order.sell_quantity}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status and Actions */}
                  <div className="text-right text-xs space-y-2">
                    <div className={`px-2 py-1 rounded-full text-xs ${
                      order.is_sold 
                        ? 'bg-green-900/20 text-green-400' 
                        : 'bg-blue-900/20 text-blue-400'
                    }`}>
                      {order.is_sold ? 'Sold' : 'Available'}
                    </div>
                    
                    {order.is_sold && order.net_profit_cents && (
                      <div className={`${order.net_profit_cents > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {order.net_profit_cents > 0 ? '+' : ''}{formatPrice(order.net_profit_cents)}
                      </div>
                    )}

                    <button
                      onClick={() => {
                        setSelectedOrderId(order.id);
                        setShowOrderMenu(true);
                      }}
                      className="p-1 text-gray-400 hover:text-white transition-colors"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Order Menu Modal */}
      {showOrderMenu && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-80 max-w-[90vw]">
            <h3 className="text-white font-medium mb-4">Order Actions</h3>
            <div className="space-y-2">
              {!orders.find(o => o.id === selectedOrderId)?.is_sold && (
                <button
                  onClick={() => {
                    setShowOrderMenu(false);
                    setShowMarkAsSoldModal(true);
                  }}
                  className="w-full text-left px-3 py-2 text-green-400 hover:bg-gray-700 rounded-md transition-colors"
                >
                  Mark as Sold
                </button>
              )}
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete this order? This cannot be undone.')) {
                    deleteOrder(selectedOrderId);
                  }
                }}
                className="w-full text-left px-3 py-2 text-red-400 hover:bg-gray-700 rounded-md transition-colors"
              >
                Delete Order
              </button>
              <button
                onClick={() => {
                  setShowOrderMenu(false);
                  setSelectedOrderId(null);
                }}
                className="w-full text-left px-3 py-2 text-gray-400 hover:bg-gray-700 rounded-md transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark as Sold Modal */}
      {showMarkAsSoldModal && (
        <MarkAsSoldModal
          order={orders.find(o => o.id === selectedOrderId)}
          onClose={() => {
            setShowMarkAsSoldModal(false);
            setSelectedOrderId(null);
          }}
          onSubmit={(sellData) => markOrderAsSold(selectedOrderId, sellData)}
        />
      )}
    </div>
  );
};

// Mark as Sold Modal Component
const MarkAsSoldModal = ({ order, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    sellDate: new Date().toISOString().split('T')[0],
    sellPrice: '',
    quantity: order?.buy_quantity || 1,
    location: '',
    fees: 0,
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!order) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-96 max-w-[90vw] max-h-[90vh] overflow-y-auto">
        <h3 className="text-white font-medium mb-4">Mark as Sold</h3>
        
        <div className="mb-4 p-3 bg-gray-700 rounded-lg">
          <div className="text-white text-sm font-medium">{order.item_name}</div>
          <div className="text-gray-400 text-xs">Order #{order.order_number}</div>
          <div className="text-gray-400 text-xs">Bought: ${(order.buy_price_cents / 100).toFixed(2)} × {order.buy_quantity}</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Sell Date</label>
            <input
              type="date"
              value={formData.sellDate}
              onChange={(e) => setFormData(prev => ({ ...prev, sellDate: e.target.value }))}
              required
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Sell Price (per item)</label>
            <input
              type="number"
              step="0.01"
              value={formData.sellPrice}
              onChange={(e) => setFormData(prev => ({ ...prev, sellPrice: e.target.value }))}
              required
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Quantity Sold</label>
            <input
              type="number"
              min="1"
              max={order.buy_quantity}
              value={formData.quantity}
              onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) }))}
              required
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Fees</label>
            <input
              type="number"
              step="0.01"
              value={formData.fees}
              onChange={(e) => setFormData(prev => ({ ...prev, fees: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
            >
              Mark as Sold
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CollectionSimple;
