import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useModal } from '../contexts/ModalContext';

const Orders = () => {
  const { openModal, closeModal } = useModal();
  const queryClient = useQueryClient();
  const [editingOrder, setEditingOrder] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch orders with item details
  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          items (
            id,
            name,
            set_name,
            item_type,
            rarity,
            market_value_cents,
            image_url
          ),
          buy_marketplace:marketplaces!orders_buy_marketplace_id_fkey (
            id,
            name,
            display_name
          ),
          sell_marketplace:marketplaces!orders_sell_marketplace_id_fkey (
            id,
            name,
            display_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });

  // Update order mutation
  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      const { data, error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['orders']);
      setEditingOrder(null);
      setEditFormData({});
    }
  });

  // Delete order mutation
  const deleteOrderMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['orders']);
      setShowDeleteConfirm(null);
    }
  });

  const formatPrice = (cents) => `$${(cents / 100).toFixed(2)}`;
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  // Determine order status based on whether it's sold or in collection
  const getOrderStatus = (order) => {
    if (order.is_sold || order.status === 'sold') {
      return 'sold';
    }
    return 'on_hand';
  };

  // Filter orders based on status and search
  const filteredOrders = orders.filter(order => {
    const status = getOrderStatus(order);
    const matchesStatus = filterStatus === 'all' || status === filterStatus;
    const matchesSearch = !searchQuery || 
      order.items?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.buy_location?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  // Calculate stats
  const stats = {
    total: orders.length,
    onHand: orders.filter(order => getOrderStatus(order) === 'on_hand').length,
    sold: orders.filter(order => getOrderStatus(order) === 'sold').length,
    totalValue: orders
      .filter(order => getOrderStatus(order) === 'on_hand')
      .reduce((sum, order) => sum + (order.buy_price_cents * order.buy_quantity), 0),
    totalProfit: orders
      .filter(order => getOrderStatus(order) === 'sold')
      .reduce((sum, order) => sum + (order.net_profit_cents || 0), 0)
  };

  const handleEdit = (order) => {
    setEditingOrder(order.id);
    setEditFormData({
      buy_date: order.buy_date,
      buy_price_cents: order.buy_price_cents,
      buy_quantity: order.buy_quantity,
      buy_location: order.buy_location,
      buy_notes: order.buy_notes,
      sell_date: order.sell_date,
      sell_price_cents: order.sell_price_cents,
      sell_quantity: order.sell_quantity,
      sell_fees_cents: order.sell_fees_cents,
      status: order.status
    });
  };

  const handleSave = () => {
    updateOrderMutation.mutate({
      id: editingOrder,
      updates: editFormData
    });
  };

  const handleCancel = () => {
    setEditingOrder(null);
    setEditFormData({});
  };

  const handleDelete = (id) => {
    setShowDeleteConfirm(id);
    openModal();
  };

  const confirmDelete = () => {
    deleteOrderMutation.mutate(showDeleteConfirm);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(null);
    closeModal();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-400 mb-4">Error loading orders</div>
          <p className="text-gray-400">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="px-4 md:px-6 lg:px-8 py-3">
        <div className="p-4 md:p-10 lg:p-12">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Order Book</h1>
              <p className="text-gray-400">Manage your trading history</p>
            </div>
            <button className="bg-blue-400 hover:bg-blue-300 text-white px-4 py-2 rounded-lg transition-colors">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              New Order
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 md:px-6 lg:px-8 pb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 md:p-6 text-center">
            <div className="text-2xl font-bold text-blue-400">
              {stats.total}
            </div>
            <div className="text-sm text-gray-400">Total Orders</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 md:p-6 text-center">
            <div className="text-2xl font-bold text-green-400">
              {stats.onHand}
            </div>
            <div className="text-sm text-gray-400">On Hand</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 md:p-6 text-center">
            <div className="text-2xl font-bold text-yellow-400">
              {stats.sold}
            </div>
            <div className="text-sm text-gray-400">Sold</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 md:p-6 text-center">
            <div className="text-2xl font-bold text-emerald-400">
              {formatPrice(stats.totalValue)}
            </div>
            <div className="text-sm text-gray-400">Total Value</div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="px-4 md:px-6 lg:px-8 pb-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 pl-10 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          
          {/* Status Filter */}
          <div className="md:w-48">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="all">All Orders</option>
              <option value="on_hand">On Hand</option>
              <option value="sold">Sold</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="px-4 md:px-6 lg:px-8 pb-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {/* Desktop Table Header */}
          <div className="hidden md:grid md:grid-cols-12 gap-4 p-4 border-b border-gray-800 text-sm font-medium text-gray-400">
            <div className="col-span-3">Item</div>
            <div className="col-span-2">Buy Date</div>
            <div className="col-span-2">Price</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Location</div>
            <div className="col-span-1">Actions</div>
          </div>

          {/* Orders List */}
          <div className="divide-y divide-gray-800">
            {filteredOrders.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>No orders found</p>
                {searchQuery && (
                  <p className="text-sm mt-2">Try adjusting your search or filters</p>
                )}
              </div>
            ) : (
              filteredOrders.map((order) => {
                const status = getOrderStatus(order);
                const isEditing = editingOrder === order.id;
                
                return (
                  <div key={order.id} className="p-4 hover:bg-gray-800/50 transition-colors">
                    {isEditing ? (
                      // Edit Mode
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                          {/* Item Info */}
                          <div className="md:col-span-3">
                            <div className="flex items-center space-x-3">
                              {order.items?.image_url && (
                                <img
                                  src={order.items.image_url}
                                  alt={order.items.name}
                                  className="w-10 h-10 object-cover rounded"
                                />
                              )}
                              <div>
                                <div className="text-white font-medium text-sm">
                                  {order.items?.name || 'Unknown Item'}
                                </div>
                                <div className="text-gray-400 text-xs">
                                  {order.items?.set_name || 'Unknown Set'}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Buy Date */}
                          <div className="md:col-span-2">
                            <input
                              type="date"
                              value={editFormData.buy_date || ''}
                              onChange={(e) => setEditFormData({...editFormData, buy_date: e.target.value})}
                              className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                            />
                          </div>

                          {/* Price */}
                          <div className="md:col-span-2">
                            <div className="flex space-x-1">
                              <input
                                type="number"
                                value={editFormData.buy_price_cents ? (editFormData.buy_price_cents / 100).toFixed(2) : ''}
                                onChange={(e) => setEditFormData({...editFormData, buy_price_cents: Math.round(parseFloat(e.target.value || 0) * 100)})}
                                className="flex-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                                placeholder="0.00"
                              />
                              <input
                                type="number"
                                value={editFormData.buy_quantity || ''}
                                onChange={(e) => setEditFormData({...editFormData, buy_quantity: parseInt(e.target.value) || 1})}
                                className="w-16 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                                placeholder="Qty"
                              />
                            </div>
                          </div>

                          {/* Status */}
                          <div className="md:col-span-2">
                            <select
                              value={editFormData.status || ''}
                              onChange={(e) => setEditFormData({...editFormData, status: e.target.value})}
                              className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                            >
                              <option value="ordered">Ordered</option>
                              <option value="shipped">Shipped</option>
                              <option value="delivered">Delivered</option>
                              <option value="sold">Sold</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </div>

                          {/* Location */}
                          <div className="md:col-span-2">
                            <input
                              type="text"
                              value={editFormData.buy_location || ''}
                              onChange={(e) => setEditFormData({...editFormData, buy_location: e.target.value})}
                              className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                              placeholder="Location"
                            />
                          </div>

                          {/* Actions */}
                          <div className="md:col-span-1">
                            <div className="flex space-x-1">
                              <button
                                onClick={handleSave}
                                disabled={updateOrderMutation.isPending}
                                className="p-1 text-green-400 hover:text-green-300 disabled:opacity-50"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <button
                                onClick={handleCancel}
                                className="p-1 text-gray-400 hover:text-white"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Notes */}
                        <div>
                          <textarea
                            value={editFormData.buy_notes || ''}
                            onChange={(e) => setEditFormData({...editFormData, buy_notes: e.target.value})}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                            placeholder="Notes..."
                            rows={2}
                          />
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                        {/* Item Info */}
                        <div className="md:col-span-3">
                          <div className="flex items-center space-x-3">
                            {order.items?.image_url && (
                              <img
                                src={order.items.image_url}
                                alt={order.items.name}
                                className="w-10 h-10 object-cover rounded"
                              />
                            )}
                            <div>
                              <div className="text-white font-medium text-sm">
                                {order.items?.name || 'Unknown Item'}
                              </div>
                              <div className="text-gray-400 text-xs">
                                {order.items?.set_name || 'Unknown Set'}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Buy Date */}
                        <div className="md:col-span-2">
                          <div className="text-sm text-gray-300">
                            {formatDate(order.buy_date)}
                          </div>
                        </div>

                        {/* Price */}
                        <div className="md:col-span-2">
                          <div className="text-sm text-white">
                            {formatPrice(order.buy_price_cents * order.buy_quantity)}
                          </div>
                          <div className="text-xs text-gray-400">
                            {formatPrice(order.buy_price_cents)} × {order.buy_quantity}
                          </div>
                        </div>

                        {/* Status */}
                        <div className="md:col-span-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            status === 'sold' 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-blue-500/20 text-blue-400'
                          }`}>
                            {status === 'sold' ? 'Sold' : 'On Hand'}
                          </span>
                        </div>

                        {/* Location */}
                        <div className="md:col-span-2">
                          <div className="text-sm text-gray-300">
                            {order.buy_location || 'N/A'}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="md:col-span-1">
                          <div className="flex space-x-1">
                            <button
                              onClick={() => handleEdit(order)}
                              className="p-1 text-gray-400 hover:text-blue-400"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(order.id)}
                              className="p-1 text-gray-400 hover:text-red-400"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 modal-overlay z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-white font-medium mb-2">Delete Order</h3>
            <p className="text-gray-400 text-sm mb-6">
              Are you sure you want to delete this order? This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={cancelDelete}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteOrderMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 text-white py-2 rounded-lg font-medium transition-colors"
              >
                {deleteOrderMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
